"use client";

import { createTheme, MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'dayjs/locale/tr';
import { PropsWithChildren, useState } from 'react';
import { COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME } from '../lib/color-scheme';

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, Segoe UI, Roboto, sans-serif',
    fontWeight: '700'
  },
  colors: {
    indigo: [
      '#eef2ff',
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#667eea',
      '#5a67d8',
      '#4f46e5',
      '#4338ca',
      '#3730a3'
    ]
  },
  components: {
    Card: {
      defaultProps: {
        radius: 'lg'
      }
    },
    Paper: {
      defaultProps: {
        radius: 'lg'
      }
    },
    Button: {
      defaultProps: {
        radius: 'lg'
      }
    },
    Badge: {
      defaultProps: {
        radius: 'md'
      }
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: { backgroundOpacity: 0.4, blur: 8 }
      }
    },
    TextInput: {
      defaultProps: {
        radius: 'md'
      }
    },
    Select: {
      defaultProps: {
        radius: 'md'
      }
    },
    NumberInput: {
      defaultProps: {
        radius: 'md'
      }
    }
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
      <DatesProvider settings={{ locale: 'tr' }}>
        <Notifications position="top-right" autoClose={3000} />
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            {children}
          </ModalsProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
