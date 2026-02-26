"use client";

import { AppShell, Avatar, Badge, Box, Burger, Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarWeek,
  IconChartBar,
  IconClockHour4,
  IconLayoutDashboard,
  IconUsers
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { ThemeToggle } from '../../components/theme-toggle';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api';
import { setAccessToken } from '../../lib/token-store';

export default function ProtectedLayout({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure(false);

  const { data, isLoading, isError } = useAuth();

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  useEffect(() => {
    const employeeAllowed = ['/my-shifts', '/availability'];
    if (!isLoading && data?.role === 'EMPLOYEE' && !employeeAllowed.includes(pathname)) {
      router.replace('/my-shifts');
    }
  }, [data?.role, isLoading, pathname, router]);

  if (isLoading) {
    return <p>Oturum doğrulanıyor...</p>;
  }

  if (isError) {
    return null;
  }

  const links: Array<{ href: string; label: string; icon: React.ReactNode }> =
    data?.role === 'EMPLOYEE'
      ? [
          { href: '/my-shifts', label: 'Vardiyalarım', icon: <IconCalendarWeek size={16} /> },
          { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={16} /> }
        ]
      : [
          { href: '/schedule', label: 'Haftalık Program', icon: <IconCalendarWeek size={16} /> },
          { href: '/employees', label: 'Çalışanlar', icon: <IconUsers size={16} /> },
          { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={16} /> },
          { href: '/reports', label: 'Raporlar', icon: <IconChartBar size={16} /> }
        ];

  const currentPageLabel = links.find((link) => link.href === pathname)?.label ?? 'Panel';

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      router.replace('/login');
    }
  }

  return (
    <AppShell
      padding="lg"
      header={{ height: 68 }}
      navbar={{ width: 280, breakpoint: 'md', collapsed: { mobile: !opened } }}
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Badge variant="light">VARDİYA YÖNETİMİ</Badge>
            <Text fw={700}>{currentPageLabel}</Text>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <ThemeToggle />
            <Button variant="light" color="red" onClick={logout} data-testid="logout-action" size="sm" radius="xl">
              Çıkış Yap
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack gap="sm">
            <Group gap="sm" align="center" mb="xs">
              <ThemeIcon radius="md" variant="light">
                <IconLayoutDashboard size={16} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={700}>Vardiya Planlayıcı</Text>
                <Text c="dimmed" size="sm">Ekip Yönetimi</Text>
              </Stack>
            </Group>

            {links.map((link) => (
              <Button
                key={link.href}
                variant={pathname === link.href ? 'filled' : 'subtle'}
                justify="flex-start"
                leftSection={link.icon}
                onClick={() => {
                  router.push(link.href);
                  close();
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>

          <Paper withBorder radius="md" p="sm">
            <Group align="center" wrap="nowrap">
              <Avatar color="blue" radius="xl" size="md">
                {(data?.name ?? data?.email ?? 'U').slice(0, 1).toUpperCase()}
              </Avatar>
              <Stack gap={2}>
                <Text size="sm" fw={600}>{data?.name ?? data?.email}</Text>
                <Text size="xs" c="dimmed">{data?.email}</Text>
              </Stack>
            </Group>
            <Box mt="sm">
              <Badge variant="light" w="fit-content">{data?.role}</Badge>
            </Box>
          </Paper>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Paper withBorder radius="lg" p="lg" maw={1400} mx="auto">
          {children}
        </Paper>
      </AppShell.Main>
    </AppShell>
  );
}
