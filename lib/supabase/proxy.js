import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { getAuthorizedOrigins, getSupabaseEnv } from './env'

const normalizeOrigin = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        return null
    }

    const raw = value.trim()

    try {
        return new URL(raw).origin
    } catch {
        try {
            return new URL(`https://${raw}`).origin
        } catch {
            return null
        }
    }
}

const getUserRole = async (supabase, userId) => {
    if (!userId) {
        return null
    }

    try {
        const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .maybeSingle()

        return data?.role || 'user'
    } catch (err) {
        console.error('Supabase error:', err)
        return 'user'
    }
}

export const updateSession = async (request) => {
    let response = NextResponse.next({ request })

    try {
        const { url, anonKey } = getSupabaseEnv()
        const supabase = createServerClient(url, anonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })

                    response = NextResponse.next({ request })

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        })

        const { data: { user }, error } = await supabase.auth.getUser()
        const userId = !error && user ? user.id : null

        return {
            response,
            userId,
            role: await getUserRole(supabase, userId),
        }
    } catch (err) {
        console.error('Supabase error:', err)
        return {
            response,
            userId: null,
            role: null,
        }
    }
}

export const isAllowedOrigin = (request) => {
    const allowedOrigins = getAuthorizedOrigins()

    if (allowedOrigins.length === 0) {
        return true
    }

    const normalizedRequestOrigin = normalizeOrigin(request.nextUrl.origin)

    if (!normalizedRequestOrigin) {
        return true
    }

    const normalizedAllowedOrigins = new Set(
        allowedOrigins
            .map(normalizeOrigin)
            .filter(Boolean)
    )

    return normalizedAllowedOrigins.has(normalizedRequestOrigin)
}