'use client'
import { createBrowserClient } from '@supabase/ssr'

let supabase = null

export function getSupabaseClient() {
    if (supabase) return supabase

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error('Missing Supabase ENV')
        throw new Error('Supabase ENV not found')
    }

    supabase = createBrowserClient(url, key)
    return supabase
}
