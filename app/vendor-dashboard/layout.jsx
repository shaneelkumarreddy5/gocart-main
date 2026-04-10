import { requireRole } from '@/lib/supabase/auth'
import StoreLayout from '@/components/store/StoreLayout'

export const metadata = {
    title: 'GoCart. - Vendor Dashboard',
    description: 'GoCart vendor control center',
}

export default async function VendorDashboardLayout({ children }) {
    await requireRole('vendor', { returnBackUrl: '/vendor-dashboard' })

    return <StoreLayout>{children}</StoreLayout>
}
