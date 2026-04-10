import { requireAuth } from '@/lib/supabase/auth'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(value || 0))
}

export default async function WalletPage() {
    const { supabase, userId } = await requireAuth({ returnBackUrl: '/wallet' })

    let pendingBalance = 0
    let availableBalance = 0
    let transactions = []

    try {
        if (userId) {
            const [{ data: wallet }, { data: rows }] = await Promise.all([
                supabase.from('wallets').select('pending_balance, available_balance').eq('user_id', userId).maybeSingle(),
                supabase.from('transactions').select('id, amount, status, txn_type, created_at, description').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
            ])

            pendingBalance = Number(wallet?.pending_balance || 0)
            availableBalance = Number(wallet?.available_balance || 0)
            transactions = rows || []
        }
    } catch (err) {
        console.error('Wallet page error:', err)
    }

    return (
        <div className="mx-6 my-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <h1 className="text-3xl font-semibold text-slate-800">Wallet</h1>
                <p className="text-sm text-slate-500">Withdrawals are allowed only from Available Balance. Pending cashback/settlements move to Available after delivery/no-return conditions.</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <p className="text-xs text-amber-700">Pending Balance</p>
                        <p className="mt-2 text-3xl font-semibold text-amber-800">{formatCurrency(pendingBalance)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-xs text-emerald-700">Available Balance</p>
                        <p className="mt-2 text-3xl font-semibold text-emerald-800">{formatCurrency(availableBalance)}</p>
                    </div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium text-slate-800">Transactions</h2>
                    <div className="mt-4 space-y-3">
                        {transactions.length === 0 && <p className="text-sm text-slate-500">No transactions yet.</p>}
                        {transactions.map((row) => (
                            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm">
                                <div>
                                    <p className="font-medium text-slate-700">{row.txn_type?.replaceAll('_', ' ') || 'transaction'}</p>
                                    <p className="text-xs text-slate-500">{row.description || 'Wallet activity'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-800">{formatCurrency(row.amount)}</p>
                                    <p className={`text-xs ${row.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>{row.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
