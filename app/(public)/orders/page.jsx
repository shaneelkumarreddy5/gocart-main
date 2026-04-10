'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function Orders() {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const supabase = getSupabaseClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (!user?.id) {
                    setOrders([])
                    return
                }

                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        total,
                        status,
                        payment_method,
                        is_paid,
                        no_return_confirmed,
                        created_at,
                        shipping_address,
                        order_items (
                            id,
                            quantity,
                            price,
                            products (id, name, images, category)
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    throw error
                }

                const mappedOrders = (data || []).map((order) => ({
                    id: order.id,
                    total: order.total,
                    status: order.status,
                    paymentMethod: order.payment_method,
                    isPaid: order.is_paid,
                    createdAt: order.created_at,
                    noReturnConfirmed: order.no_return_confirmed,
                    address: {
                        name: order.shipping_address?.name || 'Customer',
                        street: order.shipping_address?.street || '',
                        city: order.shipping_address?.city || '',
                        state: order.shipping_address?.state || '',
                        zip: order.shipping_address?.zip || '',
                        country: order.shipping_address?.country || '',
                        phone: order.shipping_address?.phone || '',
                    },
                    orderItems: (order.order_items || []).map((item) => ({
                        quantity: item.quantity,
                        price: item.price,
                        product: {
                            id: item.products?.id,
                            name: item.products?.name,
                            category: item.products?.category,
                            images: Array.isArray(item.products?.images) ? item.products.images : [],
                        },
                    })),
                }))

                setOrders(mappedOrders)
            } catch (err) {
                console.error('Orders fetch error:', err)
                setOrders([])
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, []);

    if (loading) {
        return <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-400">Loading your orders...</div>
    }

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                (
                    <div className="my-20 max-w-7xl mx-auto">
                        <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                        <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                            <thead>
                                <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                    <th className="text-left">Product</th>
                                    <th className="text-center">Total Price</th>
                                    <th className="text-left">Address</th>
                                    <th className="text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <OrderItem order={order} key={order.id} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no orders</h1>
                </div>
            )}
        </div>
    )
}