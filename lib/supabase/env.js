const getRequiredEnv = (name) => {
    const value = process.env[name]

    if (!value) {
        throw new Error(`${name} is required for Supabase integration.`)
    }

    return value
}

export const getSupabaseEnv = () => {
    return {
        url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    }
}

export const getSiteUrl = () => {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export const getAuthorizedOrigins = () => {
    return (process.env.SUPABASE_AUTHORIZED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
}