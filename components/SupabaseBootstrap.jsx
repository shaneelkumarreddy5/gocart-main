'use client'

import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { setProduct } from '@/lib/features/product/productSlice'

const SupabaseBootstrap = () => {
    const dispatch = useDispatch()
    const didLoadRef = useRef(false)

    useEffect(() => {
        if (didLoadRef.current) return
        didLoadRef.current = true

        const loadProducts = async () => {
            try {
                const supabase = getSupabaseClient()
                const { data, error } = await supabase
                    .from('products')
                    .select(`
                        id,
                        vendor_id,
                        name,
                        description,
                        mrp,
                        price,
                        category,
                        images,
                        in_stock,
                        cashback_rate,
                        coupon_enabled,
                        coupon_code,
                        sponsored,
                        created_at,
                        updated_at,
                        vendors (id, name, username, logo_url)
                    `)
                    .order('created_at', { ascending: false })

                if (error) throw error

                const mappedProducts = (data || []).map((row) => {
                    const images = Array.isArray(row.images)
                        ? row.images.map((img) => (typeof img === 'string' ? img : img?.url || '')).filter(Boolean)
                        : []

                    return {
                        id: row.id,
                        storeId: row.vendor_id,
                        name: row.name,
                        description: row.description,
                        mrp: Number(row.mrp || 0),
                        price: Number(row.price || 0),
                        images: images.length ? images : ['/favicon.ico'],
                        category: row.category,
                        inStock: Boolean(row.in_stock),
                        cashbackAmount: Number(((Number(row.price || 0) * Number(row.cashback_rate || 0)) / 100).toFixed(0)),
                        hasCoupon: Boolean(row.coupon_enabled),
                        couponCode: row.coupon_code,
                        sponsored: Boolean(row.sponsored),
                        rating: [],
                        store: {
                            id: row.vendors?.id,
                            name: row.vendors?.name || 'Vendor',
                            username: row.vendors?.username || 'vendor',
                            logo: row.vendors?.logo_url || '/favicon.ico',
                        },
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    }
                })

                dispatch(setProduct(mappedProducts))
            } catch (err) {
                console.error('Product bootstrap error:', err)
            }
        }

        loadProducts()
    }, [dispatch])

    return null
}

export default SupabaseBootstrap
