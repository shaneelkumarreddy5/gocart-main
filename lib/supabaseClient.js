'use client'

/**
 * Safe Supabase browser client singleton.
 *
 * Use this in client components when you need direct Supabase access.
 * For server components / server actions, use lib/supabase/server.js instead.
 */

import { createBrowserClient } from '@supabase/ssr'

let _instance = null

const getClient = () => {
    if (_instance) return _instance

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
        if (typeof window !== 'undefined') {
            console.error(
                '[supabaseClient] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
                'Add them to your .env.local file and to your Vercel project settings.'
            )
        }
        return null
    }

    _instance = createBrowserClient(url, anonKey)
    return _instance
}

export default getClient
