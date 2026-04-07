'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

let _client = null

export const createClient = () => {
    if (!_client) {
        const { url, anonKey } = getSupabaseEnv()
        _client = createBrowserClient(url, anonKey)
    }

    return _client
}