"use client";

import { Box, Button, Center, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { IconAlertCircle } from '@tabler/icons-react';

export default function NotFound() {
    return (
        <Center style={{ minHeight: '100vh', padding: '2rem' }}>
            <Stack align="center" gap="md">
                <IconAlertCircle size={64} style={{ color: 'var(--mantine-color-red-6)' }} />
                <Title order={1}>Sayfa Bulunamadı</Title>
                <Text size="lg" c="dimmed" ta="center" maw={400}>
                    Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                </Text>
                <Button component={Link} href="/" size="md" mt="xl">
                    Ana Sayfaya Dön
                </Button>
            </Stack>
        </Center>
    );
}
