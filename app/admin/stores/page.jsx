'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { getSupabaseClient } from "@/lib/supabaseClient"

export default function AdminStores() {

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchStores = async () => {
        try {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, username, description, address, contact, email, status, is_active, logo_url, created_at, users!vendors_user_id_fkey(email)')
                .order('created_at', { ascending: false })

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
            console.error('Admin stores fetch error:', err)
            setStores([])
        } finally {
            setLoading(false)
        }
    }

    const toggleIsActive = async (storeId) => {
        try {
            const target = stores.find((store) => store.id === storeId)
            if (!target) return

            const supabase = getSupabaseClient()
            const { error } = await supabase
                .from('vendors')
                .update({ is_active: !target.isActive })
                .eq('id', storeId)

            if (error) {
                throw error
            }

            setStores((prev) => prev.map((store) => (
                store.id === storeId ? { ...store, isActive: !store.isActive } : store
            )))
        } catch (err) {
            console.error('Admin store activation error:', err)
            throw err
        }

    }

    useEffect(() => {
        fetchStores()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Live <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl" >
                            {/* Store Info */}
                            <StoreInfo store={store} />

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2 flex-wrap">
                                <p>Active</p>
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                    <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleIsActive(store.id), { loading: "Updating data..." })} checked={store.isActive} />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                            </div>
                        </div>
                    ))}

                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No stores Available</h1>
                </div>
            )
            }
        </div>
    ) : <Loading />
}