'use client'
import LogoutButton from "@/components/auth/LogoutButton"
import BrandLogo from "@/components/BrandLogo"

const AdminNavbar = () => {


    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <BrandLogo badgeText="Admin" compact />
            <div className="flex items-center gap-3">
                <p>Hi, Admin</p>
                <LogoutButton />
            </div>
        </div>
    )
}

export default AdminNavbar