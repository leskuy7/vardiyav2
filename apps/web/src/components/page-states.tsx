"use client";

import { Alert, Box, Card, Center, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

type PageErrorProps = {
  message: string;
};

type PageEmptyProps = {
  title: string;
  description?: string;
};

/** Tam ekran oturum doğrulama ekranı (layout ilk yüklenirken). */
export function SessionLoadingScreen() {
  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mantine-color-body)',
        zIndex: 9999,
      }}
    >
      <Stack align="center" gap="md">
        <Loader size="lg" type="dots" />
        <Text c="dimmed" size="sm">Oturum doğrulanıyor</Text>
      </Stack>
    </Box>
  );
}

export function PageLoading() {
  return (
    <Center py="xl">
      <Stack align="center" gap="md">
        <Loader size="lg" type="dots" />
        <Text c="dimmed" size="sm">Yükleniyor</Text>
      </Stack>
    </Center>
  );
}

export function PageError({ message }: PageErrorProps) {
  return <Alert color="red">{message}</Alert>;
}

export function PageEmpty({ title, description }: PageEmptyProps) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack align="center" gap="xs">
        <ThemeIcon variant="light" size="lg" radius="xl">
          <IconInbox size={16} />
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        {description ? <Text c="dimmed" size="sm" ta="center">{description}</Text> : null}
      </Stack>
    </Card>
  );
}
