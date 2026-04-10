import { requireRole } from "@/lib/supabase/auth";
import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Glonni - Vendor Dashboard",
    description: "Glonni vendor dashboard",
};

export default async function RootAdminLayout({ children }) {
    await requireRole('vendor', { returnBackUrl: '/store' });

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
