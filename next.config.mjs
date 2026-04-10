import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV !== 'production'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseWs = supabaseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')
const connectSrc = ['\'self\'', supabaseUrl, supabaseWs].filter(Boolean).join(' ')
const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : null]
    .filter(Boolean)
    .join(' ')

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "base-uri 'self'",
            `connect-src ${connectSrc}`,
            "font-src 'self' data:",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "img-src 'self' data: blob:",
            "object-src 'none'",
            `script-src ${scriptSrc}`,
            "style-src 'self' 'unsafe-inline'",
            'upgrade-insecure-requests',
        ].join('; '),
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY'
    },
    {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin'
    },
    {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin'
    }
]

const nextConfig = {
    poweredByHeader: false,
    turbopack: {
        root: projectRoot,
    },
    images:{
        unoptimized: true
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ]
    },
};

export default nextConfig;
