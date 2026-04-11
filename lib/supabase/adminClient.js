import 'server-only'

import { createClient } from '@supabase/supabase-js'

const getServiceRoleKey = () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations.')
    return key
}

export const createAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
    return createClient(url, getServiceRoleKey(), {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}
