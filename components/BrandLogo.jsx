import Image from 'next/image'
import Link from 'next/link'

const BrandLogo = ({ href = '/', badgeText = '', compact = false }) => {
    return (
        <Link href={href} className="relative inline-flex items-center">
            <Image
                src="/glonni-logo.png"
                alt="Glonni"
                width={compact ? 160 : 220}
                height={compact ? 44 : 62}
                priority
                className={compact ? 'h-9 w-auto' : 'h-12 w-auto'}
            />
            {badgeText ? (
                <p className="absolute -top-2 -right-10 rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white">
                    {badgeText}
                </p>
            ) : null}
        </Link>
    )
}

export default BrandLogo
