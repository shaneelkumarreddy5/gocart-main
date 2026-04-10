'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { categories } from '@/assets/assets'
import ProductCard from '@/components/ProductCard'
import { useSelector } from 'react-redux'

const SECTION_TITLES = [
    'Sponsored',
    'For You',
    'Trending',
    'Top Deals',
    'New Arrivals',
    'Based on Search',
]

const CHUNK_SIZE = 8

const UserModeHome = () => {
    const products = useSelector((state) => state.product.list)
    const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE)
    const loadRef = useRef(null)

    useEffect(() => {
        const target = loadRef.current
        if (!target) return

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, products.length || CHUNK_SIZE))
            }
        }, { rootMargin: '220px' })

        observer.observe(target)

        return () => observer.disconnect()
    }, [products.length])

    const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount])

    return (
        <div className="mx-6 mb-16 space-y-10">
            <section className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50 p-5">
                <h2 className="text-lg font-semibold text-slate-800">Live Campaign Banners</h2>
                <p className="mt-1 text-sm text-slate-500">Admin-controlled banner carousel area for campaign creatives.</p>
            </section>

            <section className="mx-auto max-w-7xl">
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Categories</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map((category) => (
                        <span key={category} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600">
                            {category}
                        </span>
                    ))}
                </div>
            </section>

            {SECTION_TITLES.map((title, index) => (
                <section key={title} className="mx-auto max-w-7xl">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">{index + 1}. {title}</h2>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                        {visibleProducts.map((product) => (
                            <ProductCard key={`${title}-${product.id}`} product={product} />
                        ))}
                    </div>
                </section>
            ))}

            <div ref={loadRef} className="mx-auto max-w-7xl rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                Infinite scrolling active: loading more products as you scroll.
            </div>
        </div>
    )
}

export default UserModeHome
