import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { useDispatch } from 'react-redux';

const OrderSummary = ({ totalPrice, items }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const router = useRouter();
    const dispatch = useDispatch();

    const addressList = useSelector(state => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const estimatedCashback = Number((totalPrice * 0.08).toFixed(2))

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (!selectedAddress) {
            throw new Error('Please select an address first.')
        }

        if (!items.length) {
            throw new Error('Your cart is empty.')
        }

        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.id) {
            throw new Error('Please sign in to place your order.')
        }

        const groupedByVendor = items.reduce((acc, item) => {
            const vendorId = item.storeId
            if (!vendorId) return acc
            if (!acc[vendorId]) acc[vendorId] = []
            acc[vendorId].push(item)
            return acc
        }, {})

        const vendorEntries = Object.entries(groupedByVendor)
        if (!vendorEntries.length) {
            throw new Error('No valid vendor items found in cart.')
        }

        for (const [vendorId, vendorItems] of vendorEntries) {
            const vendorTotal = vendorItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    vendor_id: vendorId,
                    total: vendorTotal,
                    payment_method: paymentMethod,
                    shipping_address: selectedAddress,
                    status: 'ORDER_PLACED',
                    is_paid: paymentMethod === 'STRIPE',
                })
                .select('id')
                .single()

            if (orderError) {
                throw orderError
            }

            const orderItemsPayload = vendorItems.map((item) => ({
                order_id: order.id,
                product_id: item.id,
                quantity: Number(item.quantity || 1),
                price: Number(item.price || 0),
            }))

            const { error: itemError } = await supabase
                .from('order_items')
                .insert(orderItemsPayload)

            if (itemError) {
                throw itemError
            }

            const cashbackAmount = Number((vendorTotal * 0.08).toFixed(2))

            const { error: cashbackError } = await supabase
                .from('cashback')
                .insert({
                    user_id: user.id,
                    order_id: order.id,
                    amount: cashbackAmount,
                    status: 'pending',
                    reason: 'Order cashback pending until delivery/no-return',
                })

            if (cashbackError) {
                console.error('Cashback create warning:', cashbackError)
            }

            const { error: userTxnError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    order_id: order.id,
                    amount: cashbackAmount,
                    txn_type: 'cashback',
                    status: 'pending',
                    description: 'Pending cashback generated at checkout',
                })

            if (userTxnError) {
                console.error('User transaction create warning:', userTxnError)
            }

            try {
                const { data: wallet } = await supabase
                    .from('wallets')
                    .select('id, pending_balance, available_balance')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!wallet?.id) {
                    await supabase.from('wallets').insert({
                        user_id: user.id,
                        pending_balance: cashbackAmount,
                        available_balance: 0,
                    })
                } else {
                    await supabase
                        .from('wallets')
                        .update({
                            pending_balance: Number(wallet.pending_balance || 0) + cashbackAmount,
                        })
                        .eq('id', wallet.id)
                }
            } catch (walletErr) {
                console.error('Wallet pending balance warning:', walletErr)
            }
        }

        dispatch(clearCart())
        router.push('/orders')
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' />
                <label htmlFor="COD" className='cursor-pointer'>COD</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor="STRIPE" className='cursor-pointer'>Stripe Payment</label>
            </div>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>Free</p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 text-xs'>
                <p className='font-medium'>Cashback Summary</p>
                <p className='mt-1'>Estimated Cashback: {currency}{estimatedCashback} (Pending until delivery/no-return conditions).</p>
            </div>
            <div className='mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-700 text-xs'>
                <p className='font-medium'>Payment Offers</p>
                <ul className='mt-1 space-y-1'>
                    <li>Bank Offer: 10% instant discount on select cards</li>
                    <li>Brand Offer: Extra coupon support on selected products</li>
                    <li>Vendor Offer: Coupon availability shown at listing level</li>
                </ul>
            </div>
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{currency}{coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)).toFixed(2) : totalPrice.toLocaleString()}</p>
            </div>
            <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'placing Order...' })} className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'>Place Order</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary