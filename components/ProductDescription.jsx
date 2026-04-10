'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const ProductDescription = ({ product }) => {

    const [selectedTab, setSelectedTab] = useState('Description')

    const tabContent = {
        Description: product.description,
        Specifications: product.specifications || 'Technical details and specifications are provided by the vendor and updated as per catalog revisions.',
        'Seller Terms': product.sellerTerms || 'This listing is fulfilled by an independent vendor. Platform acts only as a marketplace facilitator and does not own inventory or logistics.',
        'Return & Warranty': product.returnPolicy || 'Eligible return windows and warranty terms are vendor-specific. Cashback remains pending until delivery/no-return conditions are satisfied.',
    }

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Specifications', 'Seller Terms', 'Return & Warranty'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-3 py-2 font-medium`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>

            <p className="max-w-3xl leading-6">{tabContent[selectedTab]}</p>

            <div className="mt-10">
                <h3 className="font-medium text-slate-700">Verified Reviews</h3>
                <div className="mt-4 flex flex-col gap-3">
                    {product.rating.map((item,index) => (
                        <div key={index} className="flex gap-5 mb-6">
                            <Image src={item.user.image} alt="" className="size-10 rounded-full" width={100} height={100} />
                            <div>
                                <div className="flex items-center" >
                                    {Array(5).fill('').map((_, index) => (
                                        <StarIcon key={index} size={18} className='text-transparent mt-0.5' fill={item.rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                    ))}
                                </div>
                                <p className="text-sm max-w-lg my-2">{item.review}</p>
                                <p className="font-medium text-slate-800">{item.user.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Store Page */}
            <div className="flex gap-3 mt-14">
                <Image src={product.store.logo} alt="" className="size-11 rounded-full ring ring-slate-400" width={100} height={100} />
                <div>
                    <p className="font-medium text-slate-600">Product by {product.store.name}</p>
                    <Link href={`/shop/${product.store.username}`} className="flex items-center gap-1.5 text-green-500"> view store <ArrowRight size={14} /></Link>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription