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
        // İkonlar public/icons/ içine icon-192.png (192×192) ve icon-512.png (512×512) eklenince açılmalı.
        // Eksik/yanlış boyutlu ikon konsol uyarısı verir; eklenene kadar boş bırakıyoruz.
        icons: [],
    };
}
