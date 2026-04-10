import Link from 'next/link'
import { ArrowRightIcon, ShieldAlertIcon } from 'lucide-react'

export const metadata = {
    title: 'Unauthorized | Glonni',
    description: 'Access denied',
}

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
            <div className="max-w-xl text-center text-slate-600">
                <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <ShieldAlertIcon size={28} />
                </div>
                <h1 className="text-3xl font-semibold text-slate-800">You are not authorized to access this page</h1>
                <p className="mt-3 text-sm sm:text-base text-slate-500">Your account is signed in, but it does not have the required role for this area.</p>
                <div className="mt-8 flex items-center justify-center gap-3">
                    <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-6 py-2.5 text-white transition hover:bg-slate-900">
                        Go to home <ArrowRightIcon size={18} />
                    </Link>
                    <Link href="/pricing" className="rounded-full border border-slate-300 px-6 py-2.5 text-slate-700 transition hover:bg-white">
                        View plans
                    </Link>
                </div>
            </div>
        </div>
    )
}