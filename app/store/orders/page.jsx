'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { getSupabaseClient } from "@/lib/supabaseClient"

export default function StoreOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)


    const fetchOrders = async () => {
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user?.id) {
                setOrders([])
                setLoading(false)
                return
            }

            const { data: vendor } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!vendor?.id) {
                setOrders([])
                setLoading(false)
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
                    created_at,
                    shipping_address,
                    users!orders_user_id_fkey (id, email),
                    order_items (
                        id,
                        quantity,
                        price,
                        products (id, name, images)
                    )
                `)
                .eq('vendor_id', vendor.id)
                .order('created_at', { ascending: false })

            if (error) {
                throw error
            }

            const mappedOrders = (data || []).map((order, index) => ({
                id: order.id,
                total: order.total,
                status: order.status,
                user: {
                    name: order.users?.email ? order.users.email.split('@')[0] : `user-${index + 1}`,
                    email: order.users?.email || 'N/A',
                },
                paymentMethod: order.payment_method,
                isPaid: order.is_paid,
                createdAt: order.created_at,
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
                        images: Array.isArray(item.products?.images) ? item.products.images : [],
                    },
                })),
                isCouponUsed: false,
                coupon: null,
            }))

            setOrders(mappedOrders)
        } catch (err) {
            console.error('Store orders fetch error:', err)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }

    const updateOrderStatus = async (orderId, status) => {
        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', orderId)

            if (error) {
                throw error
            }

            setOrders((prev) => prev.map((order) => (
                order.id === orderId ? { ...order, status } : order
            )))
        } catch (err) {
            console.error('Store order update error:', err)
        }


    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Store <span className="text-slate-800 font-medium">Orders</span></h1>
            {orders.length === 0 ? (
                <p>No orders found</p>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 text-green-600" >
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3">{order.user?.name}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">₹{Number(order.total || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3">{order.paymentMethod}</td>
                                    <td className="px-4 py-3">
                                        {order.isCouponUsed ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                {order.coupon?.code}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
                                        <select
                                            value={order.status}
                                            onChange={e => updateOrderStatus(order.id, e.target.value)}
                                            className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200"
                                        >
                                            <option value="ORDER_PLACED">ORDER_PLACED</option>
                                            <option value="PROCESSING">PROCESSING</option>
                                            <option value="SHIPPED">SHIPPED</option>
                                            <option value="DELIVERED">DELIVERED</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                            Order Details
                        </h2>

                        {/* Customer Details */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Customer Details</h3>
                            <p><span className="text-green-700">Name:</span> {selectedOrder.user?.name}</p>
                            <p><span className="text-green-700">Email:</span> {selectedOrder.user?.email}</p>
                            <p><span className="text-green-700">Phone:</span> {selectedOrder.address?.phone}</p>
                            <p><span className="text-green-700">Address:</span> {`${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`}</p>
                        </div>

                        {/* Products */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Products</h3>
                            <div className="space-y-2">
                                {selectedOrder.orderItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 border border-slate-100 shadow rounded p-2">
                                        <img
                                            src={item.product.images?.[0] || '/favicon.ico'}
                                            alt={item.product?.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-slate-800">{item.product?.name}</p>
                                            <p>Qty: {item.quantity}</p>
                                            <p>Price: ₹{Number(item.price || 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Status */}
                        <div className="mb-4">
                            <p><span className="text-green-700">Payment Method:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className="text-green-700">Paid:</span> {selectedOrder.isPaid ? "Yes" : "No"}</p>
                            {selectedOrder.isCouponUsed && (
                                <p><span className="text-green-700">Coupon:</span> {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                            )}
                            <p><span className="text-green-700">Status:</span> {selectedOrder.status}</p>
                            <p><span className="text-green-700">Order Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300" >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
