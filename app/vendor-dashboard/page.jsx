import { createClient } from '@/lib/supabase/server'

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

export default async function VendorDashboardPage() {
    const supabase = await createClient()

    let metrics = {
        products: 0,
        pendingSettlements: 0,
        availableSettlements: 0,
        returnAndRtoCount: 0,
    }

    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.id) {
            const { data: vendor } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (vendor?.id) {
                const [{ count: productsCount }, { data: txns }, { count: returnCount }] = await Promise.all([
                    supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', vendor.id),
                    supabase.from('transactions').select('status, amount').eq('vendor_id', vendor.id),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendor_id', vendor.id).in('status', ['CANCELLED']),
                ])

                const pendingSettlements = (txns || [])
                    .filter((row) => row.status === 'pending')
                    .reduce((sum, row) => sum + Number(row.amount || 0), 0)
                const availableSettlements = (txns || [])
                    .filter((row) => row.status === 'available')
                    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

                metrics = {
                    products: productsCount || 0,
                    pendingSettlements,
                    availableSettlements,
                    returnAndRtoCount: returnCount || 0,
                }
            }
        }
    } catch (err) {
        console.error('Vendor dashboard error:', err)
    }

    return (
        <div className="space-y-6 text-slate-700">
            <h1 className="text-2xl font-semibold">Vendor Dashboard</h1>
            <p className="text-sm text-slate-500">
                Facilitator model enabled: you manage catalog, orders, coupons and ads. Settlements move from Pending to Available after delivery/no-return conditions.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs text-slate-500">Products</p>
                    <p className="mt-2 text-2xl font-semibold">{metrics.products}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs text-amber-700">Pending Settlements</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-800">{formatCurrency(metrics.pendingSettlements)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs text-emerald-700">Available Settlements</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-800">{formatCurrency(metrics.availableSettlements)}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-xs text-rose-700">Returns + RTO</p>
                    <p className="mt-2 text-2xl font-semibold text-rose-800">{metrics.returnAndRtoCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium">Onboarding Checklist</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>Business details, GST and bank account</li>
                        <li>Category selection and restricted category authorization</li>
                        <li>Coupon and sponsored listing setup</li>
                    </ul>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="font-medium">Settlement Logic</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>New commission/settlement entries start in Pending</li>
                        <li>Move to Available only after delivery/no-return confirmation</li>
                        <li>No inventory ownership or logistics ownership by platform</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}
