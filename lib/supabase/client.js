'use client'

import { getSupabaseClient } from '@/lib/supabaseClient'

export const createClient = () => {
    return getSupabaseClient()
}