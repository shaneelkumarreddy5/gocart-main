import { requireRole } from '@/lib/supabase/auth'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = {
    title: 'GoCart. - Admin Dashboard',
    description: 'GoCart platform control panel',
}

export default async function AdminDashboardLayout({ children }) {
    await requireRole('admin', { returnBackUrl: '/admin-dashboard' })

    return <AdminLayout>{children}</AdminLayout>
}
