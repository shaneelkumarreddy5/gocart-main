'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { signInAction, signUpAction } from '@/app/auth/actions'
import SubmitButton from './SubmitButton'

const initialState = { status: 'idle', message: '' }

const ROLES = [
    {
        key: 'user',
        label: 'Customer',
        icon: '🛍️',
        signInRole: 'user',
        signUpRole: 'user',
        description: 'Shop products and track your orders.',
        allowSignUp: true,
    },
    {
        key: 'vendor',
        label: 'Vendor',
        icon: '🏪',
        signInRole: 'seller',
        signUpRole: 'seller',
        description: 'Sell products and manage your store.',
        allowSignUp: true,
    },
    {
        key: 'admin',
        label: 'Admin',
        icon: '🛡️',
        signInRole: 'admin',
        signUpRole: null,
        description: 'Manage the platform and approve vendors.',
        allowSignUp: false,
    },
]

const RoleTab = ({ role, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(role.key)}
        className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${
            active
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
    >
        <span className="text-xl">{role.icon}</span>
        <span>{role.label}</span>
    </button>
)

const AuthForm = ({ nextPath }) => {
    const [activeRole, setActiveRole] = useState('user')
    const [authMode, setAuthMode] = useState('sign-in')

    const roleConfig = ROLES.find((r) => r.key === activeRole)
    const isSignUp = authMode === 'sign-up'
    const authAction = isSignUp ? signUpAction : signInAction

    const [state, formAction] = useActionState(authAction, initialState)

    const handleRoleChange = (key) => {
        setActiveRole(key)
        const config = ROLES.find((r) => r.key === key)
        if (!config?.allowSignUp) {
            setAuthMode('sign-in')
        }
    }

    return (
        <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-800">Welcome to Glonni</h1>
                <p className="mt-2 text-sm text-slate-500">Choose how you want to continue</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                {/* Role tabs */}
                <div className="flex gap-2">
                    {ROLES.map((role) => (
                        <RoleTab
                            key={role.key}
                            role={role}
                            active={activeRole === role.key}
                            onClick={handleRoleChange}
                        />
                    ))}
                </div>

                {/* Role description */}
                <p className="mt-4 text-center text-xs text-slate-400">{roleConfig?.description}</p>

                {/* Sign In / Sign Up toggle (hidden for admin) */}
                {roleConfig?.allowSignUp && (
                    <div className="mt-6 flex rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setAuthMode('sign-in')}
                            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
                                !isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode('sign-up')}
                            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
                                isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                {!roleConfig?.allowSignUp && (
                    <div className="mt-6 rounded-2xl bg-slate-100 py-2 text-center text-sm font-medium text-slate-800">
                        Sign In
                    </div>
                )}

                {/* Form */}
                <form action={formAction} className="mt-6 space-y-4">
                    <input type="hidden" name="next" value={typeof nextPath === 'string' ? nextPath : '/'} />
                    {isSignUp && (
                        <input type="hidden" name="role" value={roleConfig?.signUpRole ?? 'user'} />
                    )}

                    <label className="block text-sm text-slate-600">
                        Email
                        <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
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
                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
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
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                                placeholder="Confirm your password"
                                required
                                minLength={8}
                            />
                        </label>
                    )}

                    {state.message && (
                        <p
                            className={`rounded-2xl px-4 py-3 text-sm ${
                                state.status === 'error'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-green-50 text-green-700'
                            }`}
                        >
                            {state.message}
                        </p>
                    )}

                    <SubmitButton>
                        {isSignUp ? `Create ${roleConfig?.label} Account` : `Sign In as ${roleConfig?.label}`}
                    </SubmitButton>
                </form>
            </div>
        </div>
    )
}

export default AuthForm