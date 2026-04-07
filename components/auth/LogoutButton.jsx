'use client'

import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LogoutButton = ({ mobile = false }) => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleLogout = async () => {
        setIsLoading(true)

        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/sign-in')
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className={mobile
                ? 'px-7 py-1.5 bg-slate-800 hover:bg-slate-900 text-sm transition text-white rounded-full disabled:opacity-70'
                : 'inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-white transition hover:bg-slate-900 disabled:opacity-70'}
        >
            {!mobile && <LogOutIcon size={16} />}
            {isLoading ? 'Signing out...' : 'Logout'}
        </button>
    )
}

export default LogoutButton