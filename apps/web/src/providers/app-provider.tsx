"use client";

import { createTheme, MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME } from '../lib/color-scheme';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, Segoe UI, Roboto, sans-serif'
  }
});

export function AppProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false
          },
          mutations: {
            retry: 0
          }
        }
      })
  );
  const colorSchemeManager = localStorageColorSchemeManager({ key: COLOR_SCHEME_STORAGE_KEY });

  return (
    <MantineProvider theme={theme} defaultColorScheme={DEFAULT_COLOR_SCHEME} colorSchemeManager={colorSchemeManager}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}
