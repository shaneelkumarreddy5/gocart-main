'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getPostLoginRouteByRole } from '@/lib/supabase/auth'
import { getSiteUrl } from '@/lib/supabase/env'
import { getSafeRedirectPath } from '@/lib/supabase/paths'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/adminClient'

const authFormSchema = z.object({
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    next: z.string().optional(),
})

const signInSchema = authFormSchema.extend({
    expectedRole: z.string().optional(),
})

// Only 'user' and 'seller' are allowed via public signup — 'admin' is never accepted.
const ALLOWED_SIGNUP_ROLES = new Set(['user', 'seller'])

// Maps the form tab key to the normalised DB role for sign-in validation.
const TAB_TO_ROLE = { user: 'user', vendor: 'vendor', admin: 'admin' }

const ROLE_LABELS = { user: 'Customer', vendor: 'Vendor', admin: 'Admin' }

const sanitizeSignupRole = (value) => {
    const role = typeof value === 'string' ? value.trim().toLowerCase() : 'user'
    return ALLOWED_SIGNUP_ROLES.has(role) ? role : 'user'
}

const signUpSchema = authFormSchema.extend({
    confirmPassword: z.string().min(8, 'Confirm your password.'),
    role: z.string().optional(),
}).superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
        context.addIssue({
            code: 'custom',
            message: 'Passwords do not match.',
            path: ['confirmPassword'],
        })
    }
})

const getOrigin = async () => {
    const headerStore = await headers()
    const forwardedHost = headerStore.get('x-forwarded-host')
    const host = forwardedHost || headerStore.get('host')
    const inferredProtocol = host && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? 'http' : 'https'
    const protocol = headerStore.get('x-forwarded-proto') || inferredProtocol

    if (!host) {
        return getSiteUrl()
    }

    return `${protocol}://${host}`
}

const getFieldValue = (formData, fieldName) => {
    const value = formData.get(fieldName)

    return typeof value === 'string' ? value : ''
}

const getMessageFromIssue = (issues) => {
    return issues[0]?.message || 'Something went wrong. Please try again.'
}

const getRedirectAfterAuth = async (supabase, requestedPath) => {
    const safePath = getSafeRedirectPath(requestedPath)

    if (safePath && safePath !== '/') {
        return safePath
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) {
        return '/'
    }

    const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    return getPostLoginRouteByRole(userRow?.role)
}

export async function signInAction(_previousState, formData) {
    const parsedInput = signInSchema.safeParse({
        email: getFieldValue(formData, 'email'),
        password: getFieldValue(formData, 'password'),
        next: getFieldValue(formData, 'next'),
        expectedRole: getFieldValue(formData, 'expectedRole'),
    })

    if (!parsedInput.success) {
        return {
            status: 'error',
            message: getMessageFromIssue(parsedInput.error.issues),
        }
    }

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email: parsedInput.data.email,
            password: parsedInput.data.password,
        })

        if (error) {
            return {
                status: 'error',
                message: error.message,
            }
        }

        // Validate that the signed-in user's DB role matches the selected tab.
        const expectedTabRole = parsedInput.data.expectedRole
        const targetRole = TAB_TO_ROLE[expectedTabRole]

        if (targetRole && targetRole !== 'user') {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.id) {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()

                const actualRole = getPostLoginRouteByRole(userRow?.role) === '/vendor-dashboard'
                    ? 'vendor'
                    : getPostLoginRouteByRole(userRow?.role) === '/admin-dashboard'
                        ? 'admin'
                        : 'user'

                if (actualRole !== targetRole) {
                    await supabase.auth.signOut()
                    const label = ROLE_LABELS[expectedTabRole] || expectedTabRole
                    return {
                        status: 'error',
                        message: `No ${label} account found for this email. Please sign up as a ${label} first, or select the correct account type.`,
                    }
                }
            }
        }

        redirect(await getRedirectAfterAuth(supabase, parsedInput.data.next))
    } catch (err) {
        if (err instanceof Error && (err.digest === 'NEXT_REDIRECT' || err.message === 'NEXT_REDIRECT')) {
            throw err
        }
        console.error('Supabase error:', err)
        return {
            status: 'error',
            message: 'Could not sign in right now. Please try again.',
        }
    }
}

export async function signUpAction(_previousState, formData) {
    const parsedInput = signUpSchema.safeParse({
        email: getFieldValue(formData, 'email'),
        password: getFieldValue(formData, 'password'),
        confirmPassword: getFieldValue(formData, 'confirmPassword'),
        next: getFieldValue(formData, 'next'),
        role: getFieldValue(formData, 'role'),
    })

    if (!parsedInput.success) {
        return {
            status: 'error',
            message: getMessageFromIssue(parsedInput.error.issues),
        }
    }

    const desiredRole = sanitizeSignupRole(parsedInput.data.role)

    try {
        const supabase = await createClient()
        const origin = await getOrigin()
        const { data, error } = await supabase.auth.signUp({
            email: parsedInput.data.email,
            password: parsedInput.data.password,
            options: {
                emailRedirectTo: `${origin}/sign-in`,
            },
        })

        if (error) {
            return {
                status: 'error',
                message: error.message,
            }
        }

        // Assign vendor (seller) role via admin client — never allows admin self-assignment.
        if (desiredRole === 'seller' && data.user?.id) {
            const adminClient = createAdminClient()
            const { error: roleError } = await adminClient
                .from('users')
                .update({ role: 'seller' })
                .eq('id', data.user.id)

            if (roleError) {
                console.error('Failed to assign vendor role:', roleError)
                // Clean up the orphaned auth user so they can try again.
                await adminClient.auth.admin.deleteUser(data.user.id)
                return {
                    status: 'error',
                    message: 'Could not create your vendor account. Please try again.',
                }
            }
        }

        if (data.session) {
            redirect(await getRedirectAfterAuth(supabase, parsedInput.data.next))
        }

        return {
            status: 'success',
            message: 'Check your email to confirm your account before signing in.',
        }
    } catch (err) {
        if (err instanceof Error && (err.digest === 'NEXT_REDIRECT' || err.message === 'NEXT_REDIRECT')) {
            throw err
        }
        console.error('Supabase error:', err)
        return {
            status: 'error',
            message: 'Could not create your account right now. Please try again.',
        }
    }
}