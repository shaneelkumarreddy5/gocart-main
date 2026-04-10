'use client'
import { HeartIcon, StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const ratingList = Array.isArray(product.rating) ? product.rating : []
    const rating = ratingList.length > 0
        ? Math.round(ratingList.reduce((acc, curr) => acc + curr.rating, 0) / ratingList.length)
        : 0
    const cashbackAmount = Number(product.cashbackAmount || Math.max(1, (Number(product.price || 0) * 0.08).toFixed(0)))
    const hasCoupon = Boolean(product.couponCode || product.hasCoupon)

    return (
        <Link href={`/product/${product.id}`} className='group max-xl:mx-auto'>
            <div className='relative bg-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                <button type='button' aria-label='Add to wishlist' className='absolute right-2 top-2 rounded-full bg-white/90 p-2 text-slate-600 transition hover:bg-white'>
                    <HeartIcon size={16} />
                </button>
                <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={product.images[0]} alt="" />
            </div>
            <div className='text-sm text-slate-800 pt-2 max-w-60'>
                <div>
                    <p>{product.name}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                </div>
                <div className='mt-2 flex items-center gap-2'>
                    <p className='font-semibold'>{currency}{product.price}</p>
                    <p className='text-slate-400 line-through'>{currency}{product.mrp}</p>
                </div>
                <p className='mt-1 text-xs text-emerald-600'>₹{cashbackAmount} Cashback</p>
                {hasCoupon && <span className='mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[11px] text-amber-700'>Coupon Available</span>}
            </div>
        </Link>
    )
}

export default ProductCard