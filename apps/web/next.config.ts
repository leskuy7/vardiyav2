import type { NextConfig } from 'next';

const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ??
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:4000');

if (process.env.NODE_ENV === 'production' && !apiBase) {
    throw new Error('NEXT_PUBLIC_API_BASE is required in production');
}

const cspReportOnly = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    `connect-src 'self' ${apiBase}`,
    "report-uri /csp-report"
].join('; ');

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly }
                ]
            }
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${apiBase}/api/:path*`
            }
        ];
    }
};

export default nextConfig;
