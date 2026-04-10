import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { createClient } from "@/lib/supabase/server"

const StoreLayout = async ({ children }) => {
    let storeInfo = null

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.id) {
            const { data } = await supabase
                .from('vendors')
                .select('name, logo_url')
                .eq('user_id', user.id)
                .maybeSingle()

            storeInfo = {
                name: data?.name || 'Vendor',
                logo: data?.logo_url || null,
            }
        }
    } catch (err) {
        console.error('Store layout error:', err)
    }

    return (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default StoreLayout