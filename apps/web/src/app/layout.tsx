import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppProvider } from '../providers/app-provider';
import { COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME } from '../lib/color-scheme';

export const metadata: Metadata = {
  title: { default: 'Vardiya', template: '%s | Vardiya' },
  description: 'Vardiya ve ekip planlama sistemi. Çalışan vardiyaları, izinler, mesai ve raporları tek panelden yönetin.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Vardiya' },
  openGraph: {
    title: 'Vardiya — Ekip ve Vardiya Planlama',
    description: 'Vardiya ve ekip planlama sistemi. Çalışan vardiyaları, izinler, mesai ve raporları tek panelden yönetin.',
    locale: 'tr_TR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4338ca',
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript
          defaultColorScheme={DEFAULT_COLOR_SCHEME}
          localStorageKey={COLOR_SCHEME_STORAGE_KEY}
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body suppressHydrationWarning style={{ background: 'var(--mantine-color-body)', minHeight: '100vh' }}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
