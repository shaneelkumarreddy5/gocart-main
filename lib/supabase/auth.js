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
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()

    if (error || !data?.claims?.sub) {
        return {
            supabase,
            claims: null,
            userId: null,
            user: null,
            role: null,
        }
    }

    const userId = data.claims.sub
    const { data: userRow } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .maybeSingle()

    return {
        supabase,
        claims: data.claims,
        userId,
        user: userRow,
        role: normalizeRole(userRow?.role),
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