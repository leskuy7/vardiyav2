import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_BASE ?? 'https://vardiyav2-api-production.up.railway.app'}/api/:path*`
            }
        ];
    }
};

export default nextConfig;
