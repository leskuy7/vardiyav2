import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './globals.css';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProvider } from '../providers/app-provider';
import { COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME } from '../lib/color-scheme';

export const metadata: Metadata = {
  title: 'Vardiya',
  description: 'Vardiya planlama sistemi'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript
          defaultColorScheme={DEFAULT_COLOR_SCHEME}
          localStorageKey={COLOR_SCHEME_STORAGE_KEY}
        />
      </head>
      <body style={{ background: 'var(--mantine-color-body)', minHeight: '100vh' }}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
