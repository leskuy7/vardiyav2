"use client";

import { AppShell, Avatar, Badge, Box, Burger, Button, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarEvent,
  IconCalendarWeek,
  IconChartBar,
  IconClockHour4,
  IconLayoutDashboard,
  IconLogout,
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
    const employeeAllowed = ['/my-shifts', '/availability', '/leaves'];
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
        { href: '/my-shifts', label: 'Vardiyalarım', icon: <IconCalendarWeek size={18} /> },
        { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={18} /> },
        { href: '/leaves', label: 'İzinlerim', icon: <IconCalendarEvent size={18} /> }
      ]
      : [
        { href: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={18} /> },
        { href: '/schedule', label: 'Haftalık Program', icon: <IconCalendarWeek size={18} /> },
        { href: '/employees', label: 'Çalışanlar', icon: <IconUsers size={18} /> },
        { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={18} /> },
        { href: '/leaves', label: 'İzin Onayları', icon: <IconCalendarEvent size={18} /> },
        { href: '/reports', label: 'Raporlar', icon: <IconChartBar size={18} /> }
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
    <>
      {/* Background */}
      <div className="app-shell-bg" />

      <AppShell
        padding={{ base: 'sm', sm: 'md', lg: 'lg' }}
        header={{ height: { base: 56, xs: 64 } }}
        navbar={{ width: 280, breakpoint: 'md', collapsed: { mobile: !opened } }}
        styles={{
          root: { background: 'transparent' },
          main: { background: 'transparent' },
          header: {
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'var(--glass-bg)',
            borderBottom: '1px solid var(--glass-border)',
            paddingTop: 'env(safe-area-inset-top, 0px)'
          },
          navbar: {
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid var(--glass-border)',
            paddingTop: 'env(safe-area-inset-top, 0px)'
          }
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
              <Badge variant="light" className="badge-glow" size="lg" radius="lg">VARDİYA</Badge>
              <Text fw={700} size="lg" visibleFrom="sm">{currentPageLabel}</Text>
            </Group>
            <Group gap="sm" wrap="nowrap">
              <ThemeToggle />
              <Button
                variant="light"
                color="red"
                onClick={logout}
                data-testid="logout-action"
                size="sm"
                radius="xl"
                leftSection={<IconLogout size={16} />}
              >
                Çıkış
              </Button>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack justify="space-between" h="100%">
            <Stack gap="xs">
              <Group gap="sm" align="center" mb="md" px="xs">
                <ThemeIcon
                  radius="xl"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: 'indigo', to: 'violet' }}
                >
                  <IconLayoutDashboard size={18} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text fw={700} size="sm">Vardiya Planlayıcı</Text>
                  <Text c="dimmed" size="xs">Ekip Yönetimi</Text>
                </Stack>
              </Group>

              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <UnstyledButton
                    key={link.href}
                    className="premium-nav-link"
                    data-active={isActive}
                    px="md"
                    py="sm"
                    onClick={() => {
                      router.push(link.href);
                      close();
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon
                        variant={isActive ? 'white' : 'light'}
                        radius="xl"
                        size="md"
                        color={isActive ? 'white' : 'indigo'}
                        style={isActive ? { background: 'rgba(255,255,255,0.15)' } : undefined}
                      >
                        {link.icon}
                      </ThemeIcon>
                      <Text
                        fw={isActive ? 700 : 500}
                        size="sm"
                        style={isActive ? { color: '#fff' } : undefined}
                      >
                        {link.label}
                      </Text>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>

            <Paper withBorder radius="lg" p="sm" className="user-card">
              <Group align="center" wrap="nowrap">
                <Avatar
                  radius="xl"
                  size="md"
                  variant="gradient"
                  gradient={{ from: 'indigo', to: 'violet' }}
                >
                  {(data?.name ?? data?.email ?? 'U').slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack gap={2} style={{ overflow: 'hidden' }}>
                  <Text size="sm" fw={600} truncate>{data?.name ?? data?.email}</Text>
                  <Text size="xs" c="dimmed" truncate>{data?.email}</Text>
                </Stack>
              </Group>
              <Box mt="sm">
                <Badge
                  variant="gradient"
                  gradient={{ from: 'indigo', to: 'violet' }}
                  w="fit-content"
                >
                  {data?.role}
                </Badge>
              </Box>
            </Paper>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          <div className="page-enter">{children}</div>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
