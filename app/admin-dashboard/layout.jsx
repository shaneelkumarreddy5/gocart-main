import { requireRole } from '@/lib/supabase/auth'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = {
    title: 'Glonni - Admin Dashboard',
    description: 'Glonni platform control panel',
}

export default async function AdminDashboardLayout({ children }) {
    await requireRole('admin', { returnBackUrl: '/admin-dashboard' })

    return <AdminLayout>{children}</AdminLayout>
}
