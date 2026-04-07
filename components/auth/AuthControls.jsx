'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import LogoutButton from './LogoutButton'

const AuthControls = ({ mobile = false }) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        let supabase
        let isActive = true

        try {
            supabase = getSupabaseClient()
        } catch (err) {
            console.error('Supabase init error:', err)
            setIsAuthenticated(false)
            setIsLoaded(true)
            return () => {
                isActive = false
            }
        }

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
            try {
                if (!isActive) {
                    return
                }

                setIsAuthenticated(Boolean(session?.user))
                setIsLoaded(true)
            } catch (err) {
                console.error('Supabase auth change error:', err)
                if (isActive) {
                    setIsAuthenticated(false)
                    setIsLoaded(true)
                }
            }
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