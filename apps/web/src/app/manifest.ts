import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Vardiya v2 - Çalışan Portalı',
        short_name: 'Vardiya v2',
        description: 'Kurumsal Personel, İzin ve Vardiya Yönetim Sistemi',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0B12',
        theme_color: '#4338ca',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            }
        ],
    };
}
