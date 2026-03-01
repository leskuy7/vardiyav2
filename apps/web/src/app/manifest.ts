import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Vardiya v2 - Çalışan Portalı',
        short_name: 'Vardiya v2',
        description: 'Kurumsal Personel, İzin ve Vardiya Yönetim Sistemi',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0B12',
        theme_color: '#11121d',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/icons/icon-maskable.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            }
        ],
    };
}
