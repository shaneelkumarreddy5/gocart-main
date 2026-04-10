import { createClient } from '@/lib/supabase/server'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    let stats = {
        pendingCashback: 0,
        availableCashback: 0,
        pendingVendorSettlements: 0,
        availableVendorSettlements: 0,
        disputes: 0,
        flaggedFraud: 0,
    }

    try {
        const [{ data: cashbackRows }, { data: settlementRows }, { count: disputeCount }, { count: fraudCount }] = await Promise.all([
            supabase.from('cashback').select('status, amount'),
            supabase.from('transactions').select('status, amount'),
            supabase.from('dispute_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
            supabase.from('fraud_flags').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
        ])

        stats = {
            pendingCashback: (cashbackRows || []).filter((row) => row.status === 'pending').reduce((sum, row) => sum + Number(row.amount || 0), 0),
            availableCashback: (cashbackRows || []).filter((row) => row.status === 'available').reduce((sum, row) => sum + Number(row.amount || 0), 0),
            pendingVendorSettlements: (settlementRows || []).filter((row) => row.status === 'pending').reduce((sum, row) => sum + Number(row.amount || 0), 0),
            availableVendorSettlements: (settlementRows || []).filter((row) => row.status === 'available').reduce((sum, row) => sum + Number(row.amount || 0), 0),
            disputes: disputeCount || 0,
            flaggedFraud: fraudCount || 0,
        }
    } catch (err) {
        console.error('Admin dashboard error:', err)
    }

    return (
        <div className="space-y-6 text-slate-700">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">
                Platform facilitator controls for vendors, campaigns, disputes, review moderation and the Pending to Available financial lifecycle.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs text-amber-700">Pending Cashback</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-800">{formatCurrency(stats.pendingCashback)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs text-emerald-700">Available Cashback</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-800">{formatCurrency(stats.availableCashback)}</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
                    <p className="text-xs text-sky-700">Pending Vendor Settlements</p>
                    <p className="mt-2 text-2xl font-semibold text-sky-800">{formatCurrency(stats.pendingVendorSettlements)}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
                    <p className="text-xs text-teal-700">Available Vendor Settlements</p>
                    <p className="mt-2 text-2xl font-semibold text-teal-800">{formatCurrency(stats.availableVendorSettlements)}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-xs text-rose-700">Open Disputes</p>
                    <p className="mt-2 text-2xl font-semibold text-rose-800">{stats.disputes}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                    <p className="text-xs text-purple-700">Fraud Flags</p>
                    <p className="mt-2 text-2xl font-semibold text-purple-800">{stats.flaggedFraud}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium">System Controls</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Approve/reject vendors</li>
                        <li>Manage categories, banners, campaigns</li>
                        <li>Global product moderation and price checks</li>
                    </ul>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium">Orders and Disputes</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Track all orders and lifecycle transitions</li>
                        <li>Handle disputes, returns and RTO events</li>
                        <li>Maintain audit logs for each admin action</li>
                    </ul>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium">Review Moderation</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Verified buyer reviews only</li>
                        <li>Transparent moderation logs</li>
                        <li>Aggregator-based digital products support</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}
