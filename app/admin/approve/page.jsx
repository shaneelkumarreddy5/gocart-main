'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { getSupabaseClient } from "@/lib/supabaseClient"

export default function AdminApprove() {

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)


    const fetchStores = async () => {
        try {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, username, description, address, contact, email, status, is_active, logo_url, created_at, users!vendors_user_id_fkey(email)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            if (error) {
                throw error
            }

            const mappedStores = (data || []).map((store) => ({
                id: store.id,
                name: store.name,
                username: store.username,
                description: store.description,
                address: store.address,
                contact: store.contact,
                email: store.email,
                status: store.status,
                isActive: store.is_active,
                logo: store.logo_url,
                createdAt: store.created_at,
                user: {
                    name: store.users?.email ? store.users.email.split('@')[0] : 'vendor-user',
                    email: store.users?.email || 'N/A',
                    image: null,
                },
            }))

            setStores(mappedStores)
        } catch (err) {
            console.error('Admin approval fetch error:', err)
            setStores([])
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async ({ storeId, status }) => {
        try {
            const supabase = getSupabaseClient()
            const payload = {
                status,
                is_active: status === 'approved',
            }

            const { error } = await supabase
                .from('vendors')
                .update(payload)
                .eq('id', storeId)

            if (error) {
                throw error
            }

            setStores((prev) => prev.filter((store) => store.id !== storeId))
        } catch (err) {
            console.error('Admin approval action error:', err)
            throw err
        }


    }

    useEffect(() => {
            fetchStores()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Approve <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl" >
                            {/* Store Info */}
                            <StoreInfo store={store} />

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 flex-wrap">
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'approved' }), { loading: "approving" })} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm" >
                                    Approve
                                </button>
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'rejected' }), { loading: 'rejecting' })} className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm" >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}

                </div>) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No Application Pending</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}