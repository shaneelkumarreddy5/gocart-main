import { NextResponse } from 'next/server'
import { getSafeRedirectPath } from './lib/supabase/paths'
import { isAllowedOrigin, updateSession } from './lib/supabase/proxy'

const AUTHENTICATED_ROUTES = ['/cart', '/orders', '/create-store']
const ADMIN_ROUTE_PREFIX = '/admin'
const SELLER_ROUTE_PREFIX = '/store'
const AUTH_PAGES = ['/sign-in', '/sign-up']

const isExactOrNestedRoute = (pathname, route) => {
    return pathname === route || pathname.startsWith(`${route}/`)
}

const isAuthenticatedRoute = (pathname) => {
    return AUTHENTICATED_ROUTES.some((route) => isExactOrNestedRoute(pathname, route))
}

const getLoginRedirect = (request) => {
    const loginUrl = new URL('/sign-in', request.url)
    const nextPath = getSafeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`)

    loginUrl.searchParams.set('next', nextPath)

    return NextResponse.redirect(loginUrl)
}

export async function proxy(request) {
    if (!isAllowedOrigin(request)) {
        return NextResponse.json({ message: 'Origin not allowed.' }, { status: 403 })
    }

    const pathname = request.nextUrl.pathname
    const { response, userId, role } = await updateSession(request)

    if (AUTH_PAGES.some((route) => isExactOrNestedRoute(pathname, route)) && userId) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (
        (pathname.startsWith(ADMIN_ROUTE_PREFIX) ||
            pathname.startsWith(SELLER_ROUTE_PREFIX) ||
            isAuthenticatedRoute(pathname)) &&
        !userId
    ) {
        return getLoginRedirect(request)
    }

    if (pathname.startsWith(ADMIN_ROUTE_PREFIX) && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (pathname.startsWith(SELLER_ROUTE_PREFIX) && role !== 'seller') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
