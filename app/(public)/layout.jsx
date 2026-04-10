'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupabaseBootstrap from "@/components/SupabaseBootstrap";

export default function PublicLayout({ children }) {

    return (
        <>
            <SupabaseBootstrap />
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
