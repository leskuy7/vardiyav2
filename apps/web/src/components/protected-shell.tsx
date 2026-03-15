"use client";

import { ActionIcon, AppShell, Avatar, Badge, Box, Burger, Button, Group, Indicator, Paper, Popover, ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBell,
  IconCalendarEvent,
  IconCalendarWeek,
  IconChartBar,
  IconClockHour4,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';
import { SessionLoadingScreen } from './page-states';
import { useAuth, type AuthUser } from '../hooks/use-auth';
import { useNotifications } from '../hooks/use-notifications';
import { api } from '../lib/api';
import { setAccessToken } from '../lib/token-store';

type ProtectedShellProps = PropsWithChildren<{
  initialUser: AuthUser | null;
}>;

export function ProtectedShell({ children, initialUser }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { data, isLoading, isError } = useAuth({ initialData: initialUser });
  const matchesPath = (basePath: string) => pathname === basePath || pathname.startsWith(`${basePath}/`);

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      router.replace('/login');
    }
  }, [data, isError, isLoading, router]);

  if (isLoading && !data) {
    return <SessionLoadingScreen />;
  }

  if (isError || !data) {
    return null;
  }

  const adminManagerLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={18} /> },
    { href: '/schedule', label: 'Haftalık Program', icon: <IconCalendarWeek size={18} /> },
    { href: '/employees', label: 'Çalışanlar', icon: <IconUsers size={18} /> },
    { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={18} /> },
    { href: '/leaves', label: 'İzin Onayları', icon: <IconCalendarEvent size={18} /> },
    ...(data.role === 'ADMIN' || data.role === 'MANAGER'
      ? [{ href: '/reports', label: 'Raporlar', icon: <IconChartBar size={18} /> }]
      : []),
    ...(data.role === 'ADMIN'
      ? [{ href: '/settings', label: 'Ayarlar', icon: <IconSettings size={18} /> }]
      : []),
    { href: '/profile', label: 'Profil', icon: <IconUser size={18} /> },
  ];

  const links: Array<{ href: string; label: string; icon: ReactNode }> =
    data.role === 'EMPLOYEE'
      ? [
          { href: '/my-shifts', label: 'Vardiyalarım', icon: <IconCalendarWeek size={18} /> },
          { href: '/availability', label: 'Müsaitlik', icon: <IconClockHour4 size={18} /> },
          { href: '/leaves', label: 'İzinlerim', icon: <IconCalendarEvent size={18} /> },
          { href: '/profile', label: 'Profil', icon: <IconUser size={18} /> },
        ]
      : adminManagerLinks;

  const currentPageLabel = links.find((link) => matchesPath(link.href))?.label ?? 'Panel';

  function openLogoutConfirm() {
    modals.openConfirmModal({
      title: 'Çıkış yap',
      centered: true,
      children: (
        <Text size="sm" c="dimmed">
          Oturumunuzu kapatmak istediğinize emin misiniz?
        </Text>
      ),
      labels: { confirm: 'Çıkış yap', cancel: 'İptal' },
      confirmProps: { color: 'red', leftSection: <IconLogout size={16} /> },
      onConfirm: performLogout,
    });
  }

  async function performLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      queryClient.clear();
      setAccessToken(null);
      router.replace('/login');
    }
  }

  return (
    <>
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
            paddingTop: 'env(safe-area-inset-top, 0px)',
          },
          navbar: {
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid var(--glass-border)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
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
              <NotificationBell userId={data.id} />
              <Button
                variant="light"
                color="red"
                onClick={openLogoutConfirm}
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

        <AppShell.Navbar p="md" style={{ height: '100%', minHeight: 0 }}>
          <Stack gap={0} style={{ height: '100%', minHeight: 0 }} justify="space-between">
            <Stack gap="xs" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Group gap="sm" align="center" mb="md" px="xs" style={{ flexShrink: 0 }}>
                <ThemeIcon radius="xl" size="lg" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                  <IconLayoutDashboard size={18} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text fw={700} size="sm">Vardiya Planlayıcı</Text>
                  <Text c="dimmed" size="xs">Ekip Yönetimi</Text>
                </Stack>
              </Group>

              <ScrollArea style={{ flex: 1 }} type="auto" scrollbarSize={6}>
                <Stack gap="xs" pb="xs">
                  {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <UnstyledButton
                        key={link.href}
                        className="premium-nav-link"
                        data-active={isActive}
                        px="md"
                        py="sm"
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={`${link.label}${isActive ? ', mevcut sayfa' : ''}`}
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
                          <Text fw={isActive ? 700 : 500} size="sm" style={isActive ? { color: '#fff' } : undefined}>
                            {link.label}
                          </Text>
                        </Group>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              </ScrollArea>
            </Stack>

            <Paper withBorder radius="lg" p="sm" className="user-card" style={{ flexShrink: 0 }}>
              <Group align="center" wrap="nowrap">
                <Avatar radius="xl" size="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                  {(data.name ?? data.email ?? 'U').slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack gap={2} style={{ overflow: 'hidden' }}>
                  <Text size="sm" fw={600} truncate>{data.name ?? data.email}</Text>
                  <Text size="xs" c="dimmed" truncate>{data.email}</Text>
                </Stack>
              </Group>
              <Box mt="sm">
                <Badge variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} w="fit-content">
                  {data.role}
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

function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <Popover opened={opened} onChange={toggle} position="bottom-end" width={360} shadow="lg" radius="md">
      <Popover.Target>
        <Indicator color="red" size={16} label={unreadCount > 0 ? String(unreadCount) : undefined} disabled={unreadCount === 0} offset={4}>
          <ActionIcon variant="subtle" size="lg" radius="xl" onClick={toggle} aria-label="Bildirimler">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <Text fw={600} size="sm">Bildirimler</Text>
          {unreadCount > 0 && (
            <UnstyledButton onClick={() => markAllAsRead.mutate()}>
              <Text size="xs" c="indigo">Tümünü Okundu İşaretle</Text>
            </UnstyledButton>
          )}
        </Group>
        <ScrollArea.Autosize mah={320}>
          {notifications.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="lg">Bildirim yok</Text>
          ) : (
            <Stack gap={0}>
              {notifications.slice(0, 20).map((n) => (
                <UnstyledButton
                  key={n.id}
                  p="sm"
                  style={{
                    borderBottom: '1px solid var(--glass-border)',
                    background: n.isRead ? 'transparent' : 'var(--mantine-color-indigo-light)',
                  }}
                  onClick={() => {
                    if (!n.isRead) markAsRead.mutate(n.id);
                    if (n.actionUrl) {
                      close();
                      router.push(n.actionUrl);
                    }
                  }}
                >
                  <Text size="sm" fw={n.isRead ? 400 : 600}>{n.title}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>{n.message}</Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {new Date(n.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </Text>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}