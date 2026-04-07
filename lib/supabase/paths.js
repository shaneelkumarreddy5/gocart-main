export const getSafeRedirectPath = (value, fallbackPath = '/') => {
    if (typeof value !== 'string') {
        return fallbackPath
    }

    const trimmedValue = value.trim()

    if (!trimmedValue.startsWith('/') || trimmedValue.startsWith('//')) {
        return fallbackPath
    }

    return trimmedValue
}