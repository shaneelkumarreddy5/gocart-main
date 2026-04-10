import { requireRole } from "@/lib/supabase/auth";
import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "Glonni - Admin",
    description: "Glonni platform admin",
};

export default async function RootAdminLayout({ children }) {
    await requireRole('admin', { returnBackUrl: '/admin' });

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
