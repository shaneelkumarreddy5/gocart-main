import AuthForm from '@/components/auth/AuthForm'

export const metadata = {
    title: 'Sign Up | GoCart.',
    description: 'Create your GoCart account',
}

export default async function SignUpPage({ searchParams }) {
    const params = await searchParams

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
            <AuthForm mode="sign-up" nextPath={params?.next} />
        </div>
    )
}