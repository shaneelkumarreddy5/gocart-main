import AuthForm from '@/components/auth/AuthForm'

export const metadata = {
    title: 'Sign In | Glonni',
    description: 'Sign in to your Glonni account',
}

export default async function SignInPage({ searchParams }) {
    const params = await searchParams

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
            <AuthForm mode="sign-in" nextPath={params?.next} />
        </div>
    )
}