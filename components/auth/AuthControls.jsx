'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from './LogoutButton'

const AuthControls = ({ mobile = false }) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        let isActive = true

        const loadUser = async () => {
            try {
                const { data } = await supabase.auth.getUser()

                if (!isActive) return

                setIsAuthenticated(Boolean(data?.user))
            } catch {
                if (!isActive) return
                setIsAuthenticated(false)
            } finally {
                if (isActive) setIsLoaded(true)
            }
        }

        loadUser()

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isActive) {
                return
            }

            setIsAuthenticated(Boolean(session?.user))
            setIsLoaded(true)
        })

        return () => {
            isActive = false
            listener.subscription.unsubscribe()
        }
    }, [])

    if (!isLoaded) {
        return null
    }

    if (!isAuthenticated) {
        return (
            <Link
                href="/sign-in"
                className={mobile
                    ? 'px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full'
                    : 'px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full'}
            >
                Login
            </Link>
        )
    }

    return <LogoutButton mobile={mobile} />
}

export default AuthControls