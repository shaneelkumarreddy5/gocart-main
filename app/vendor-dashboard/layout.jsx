import { requireRole } from '@/lib/supabase/auth'
import StoreLayout from '@/components/store/StoreLayout'

export const metadata = {
    title: 'Glonni - Vendor Dashboard',
    description: 'Glonni vendor control center',
}

export default async function VendorDashboardLayout({ children }) {
    await requireRole('vendor', { returnBackUrl: '/vendor-dashboard' })

    return <StoreLayout>{children}</StoreLayout>
}
