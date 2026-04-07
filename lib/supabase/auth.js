import 'server-only'

import { redirect } from 'next/navigation'
import { getSafeRedirectPath } from './paths'
import { createClient } from './server'

export const USER_ROLES = {
    ADMIN: 'admin',
    SELLER: 'seller',
    USER: 'user',
}

const validRoles = new Set(Object.values(USER_ROLES))

const normalizeRole = (value) => {
    if (typeof value !== 'string') {
        return USER_ROLES.USER
    }

    const normalizedRole = value.trim().toLowerCase()

    return validRoles.has(normalizedRole) ? normalizedRole : USER_ROLES.USER
}

export const getSessionContext = async () => {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.id) {
            return {
                supabase,
                userId: null,
                user: null,
                role: null,
            }
        }

        const userId = user.id
        const { data: userRow } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', userId)
            .maybeSingle()

        return {
            supabase,
            userId,
            user: userRow,
            role: normalizeRole(userRow?.role),
        }
    } catch (err) {
        console.error('Supabase error:', err)
        return {
            supabase: null,
            userId: null,
            user: null,
            role: null,
        }
    }
}

export const requireAuth = async ({ returnBackUrl = '/' } = {}) => {
    const sessionContext = await getSessionContext()

    if (!sessionContext.userId) {
        const redirectPath = getSafeRedirectPath(returnBackUrl)
        redirect(`/sign-in?next=${encodeURIComponent(redirectPath)}`)
    }

    return sessionContext
}

export const requireRole = async (requiredRole, options) => {
    const sessionContext = await requireAuth(options)

    if (sessionContext.role !== requiredRole) {
        redirect('/unauthorized')
    }

    return sessionContext
}