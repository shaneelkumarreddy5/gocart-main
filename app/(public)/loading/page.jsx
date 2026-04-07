'use client'

import Loading from "@/components/Loading"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const getSafeRedirectPath = (value) => {
    if (!value) {
        return null
    }

    try {
        const candidateUrl = new URL(value, window.location.origin)

        if (candidateUrl.origin !== window.location.origin) {
            return null
        }

        return `${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`
    } catch {
        return null
    }
}

export default function LoadingPage() {
    const router = useRouter()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const safeRedirectPath = getSafeRedirectPath(params.get('nextUrl'))

        if (!safeRedirectPath) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            router.replace(safeRedirectPath)
        }, 8000)

        return () => window.clearTimeout(timeoutId)
    }, [router])

    return <Loading />
}
