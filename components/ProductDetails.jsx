'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";

const ProductDetails = ({ product }) => {

    const productId = product.id;
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const [mainImage, setMainImage] = useState(product.images[0]);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const buyNowHandler = () => {
        if (!cart[productId]) {
            dispatch(addToCart({ productId }))
        }
        router.push('/cart')
    }

    const ratingList = Array.isArray(product.rating) ? product.rating : []
    const averageRating = ratingList.length ? ratingList.reduce((acc, item) => acc + item.rating, 0) / ratingList.length : 0
    const cashbackAmount = Number(product.cashbackAmount || Math.max(1, (Number(product.price || 0) * 0.08).toFixed(0)))
    const bestOffer = product.bestOffer || `Save ${((product.mrp - product.price) / product.mrp * 100).toFixed(0)}% today`
    const offers = product.offers || [
        'Bank Offer: 10% instant discount on select cards',
        'Brand Coupon: Extra 5% off for first purchase',
        'Vendor Coupon: Use SAVE5 at checkout',
    ]
    
    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(product.images[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    <Image src={mainImage} alt="" width={250} height={250} />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{ratingList.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> {currency}{product.price} </p>
                    <p className="text-xl text-slate-500 line-through">{currency}{product.mrp}</p>
                </div>
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    ₹{cashbackAmount} Cashback - Pending until delivery/conditions.
                </p>
                <div className="flex items-center gap-2 text-slate-500">
                    <TagIcon size={14} />
                    <p>{bestOffer}</p>
                </div>
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-medium text-slate-700">Offers</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {offers.map((offer) => (
                            <li key={offer}>• {offer}</li>
                        ))}
                    </ul>
                </div>
                <div className="flex items-end gap-5 mt-10">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                        {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Free shipping worldwide </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> 100% Secured Payment </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Trusted by top brands </p>
                </div>

            </div>
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
                <div className="mx-auto flex max-w-7xl gap-3">
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                        Add to Cart
                    </button>
                    <button onClick={buyNowHandler} className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails