'use client'
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import UserModeHome from "@/components/UserModeHome";

export default function Home() {
    return (
        <div>
            <Hero />
            <UserModeHome />
            <Newsletter />
        </div>
    );
}
