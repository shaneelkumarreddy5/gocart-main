import { requireRole } from "@/lib/supabase/auth";
import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "GoCart. - Store Dashboard",
    description: "GoCart. - Store Dashboard",
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
