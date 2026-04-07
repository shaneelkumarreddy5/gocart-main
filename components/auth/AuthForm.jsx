'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signInAction, signUpAction } from '@/app/auth/actions'
import SubmitButton from './SubmitButton'

const initialState = {
    status: 'idle',
    message: '',
}

const contentByMode = {
    'sign-in': {
        title: 'Sign in to your account',
        description: 'Use your email and password to access your orders, vendor tools, and admin dashboard.',
        submitText: 'Sign In',
        switchHref: '/sign-up',
        switchText: 'Need an account?',
        switchActionText: 'Create one',
    },
    'sign-up': {
        title: 'Create your account',
        description: 'Register with email and password. Your application data stays protected by Supabase Auth and Row Level Security.',
        submitText: 'Create Account',
        switchHref: '/sign-in',
        switchText: 'Already have an account?',
        switchActionText: 'Sign in',
    },
}

const AuthForm = ({ mode, nextPath }) => {
    const isSignUp = mode === 'sign-up'
    const authAction = isSignUp ? signUpAction : signInAction
    const [state, formAction] = useActionState(authAction, initialState)
    const content = contentByMode[mode]

    return (
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
                <h1 className="text-3xl font-semibold text-slate-800">{content.title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">{content.description}</p>
            </div>

            <form action={formAction} className="mt-8 space-y-4">
                <input type="hidden" name="next" value={typeof nextPath === 'string' ? nextPath : '/'} />

                <label className="block text-sm text-slate-600">
                    Email
                    <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                        placeholder="you@example.com"
                        required
                    />
                </label>

                <label className="block text-sm text-slate-600">
                    Password
                    <input
                        name="password"
                        type="password"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                        placeholder="Enter your password"
                        required
                        minLength={8}
                    />
                </label>

                {isSignUp && (
                    <label className="block text-sm text-slate-600">
                        Confirm Password
                        <input
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                            placeholder="Confirm your password"
                            required
                            minLength={8}
                        />
                    </label>
                )}

                {state.message && (
                    <p className={`rounded-2xl px-4 py-3 text-sm ${state.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {state.message}
                    </p>
                )}

                <SubmitButton>{content.submitText}</SubmitButton>
            </form>

            <p className="mt-6 text-sm text-slate-500">
                {content.switchText}{' '}
                <Link href={content.switchHref} className="font-medium text-slate-800 underline-offset-4 hover:underline">
                    {content.switchActionText}
                </Link>
            </p>
        </div>
    )
}

export default AuthForm