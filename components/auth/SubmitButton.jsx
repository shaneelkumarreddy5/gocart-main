'use client'

import { useFormStatus } from 'react-dom'

const SubmitButton = ({ children }) => {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-slate-800 px-6 py-3 text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
            {pending ? 'Please wait...' : children}
        </button>
    )
}

export default SubmitButton