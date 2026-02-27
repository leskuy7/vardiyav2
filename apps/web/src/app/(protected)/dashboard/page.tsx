"use client";

import { ActionIcon, Badge, Card, Grid, Group, List, Paper, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconChevronRight, IconClockHour4, IconUsers } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useEmployees } from '../../../hooks/use-employees';
import { useWeeklyReport } from '../../../hooks/use-reports';
import { useWeeklySchedule } from '../../../hooks/use-shifts';
import { getShiftStatusLabel } from '../../../lib/shift-status';
import { currentWeekStartIsoDate, formatDateShort, formatTimeOnly } from '../../../lib/time';

export default function DashboardPage() {
  const router = useRouter();
  const weekStart = currentWeekStartIsoDate();
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('tr-TR'));
  }, []);

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useEmployees(true);
  const { data: schedule, isLoading: scheduleLoading, isError: scheduleError } = useWeeklySchedule(weekStart);
  const { data: report, isLoading: reportLoading, isError: reportError } = useWeeklyReport(weekStart);

  const isLoading = employeesLoading || scheduleLoading || reportLoading;
  const isError = employeesError || scheduleError || reportError;

  const shifts = useMemo(() => (schedule?.days ?? []).flatMap((day) => day.shifts), [schedule]);

  // PUBLISHED = çalışan henüz onaylamamış
  const publishedShifts = useMemo(() => shifts.filter((shift) => shift.status === 'PUBLISHED'), [shifts]);
  const publishedCount = publishedShifts.length;
  const unassignedDays = useMemo(
    () => (schedule?.days ?? []).filter((day) => day.shifts.length === 0).length,
    [schedule]
  );

  const upcoming = useMemo(() => {
    return shifts
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [shifts]);

  const notifications = useMemo(() => {
    const items: Array<{ id: string; text: string; severity: 'warning' | 'info'; action?: () => void }> = [];

    if (publishedCount > 0) {
      items.push({
        id: 'pending-acks',
        text: `${publishedCount} vardiya çalışan onayı bekliyor — aşağıda detayları görebilirsiniz.`,
        severity: 'info',
        action: () => router.push('/schedule'),
      });
    }
    if (unassignedDays > 0) {
      items.push({
        id: 'empty-days',
        text: `${unassignedDays} gün için henüz vardiya planı bulunmuyor.`,
        severity: 'warning',
        action: () => router.push('/schedule'),
      });
    }
    if ((report?.totals.overtimeHours ?? 0) > 0) {
      items.push({
        id: 'overtime',
        text: `Bu hafta ${report?.totals.overtimeHours.toFixed(1)} saat fazla mesai görünüyor.`,
        severity: 'warning',
        action: () => router.push('/reports'),
      });
    }
    if (items.length === 0) {
      items.push({ id: 'none', text: 'Yeni bildirim yok, planlama dengeli görünüyor.', severity: 'info' });
    }

    return items;
  }, [publishedCount, report?.totals.overtimeHours, unassignedDays, router]);

  if (isLoading) return <PageLoading />;
  if (isError || !employees || !schedule || !report) {
    return <PageError message="Dashboard verileri yüklenemedi." />;
  }

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">DASHBOARD</Badge>
            <Text c="dimmed" size="sm">{todayStr}</Text>
          </Group>
          <Title order={2}>Operasyon Özeti</Title>
          <Text c="dimmed" size="sm">Ekip, vardiya ve bildirim görünümünü tek ekrandan takip et.</Text>
        </Stack>
      </Group>

      {/* ─── Stat Kartları ─── */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-1">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Aktif Çalışan</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl">
                <IconUsers size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>{employees.length}</Title>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-2">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Toplam Vardiya</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl">
                <IconClockHour4 size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>{shifts.length}</Title>
          </Card>
        </Grid.Col>

        {/* Onay Bekleyen — tıklanabilir */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card
            withBorder
            p="md"
            className="stat-card gradient-card stagger-3 interactive-card"
            style={{ cursor: publishedCount > 0 ? 'pointer' : 'default' }}
            onClick={() => publishedCount > 0 && router.push('/schedule')}
          >
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Onay Bekleyen</Text>
              <Group gap={4}>
                {publishedCount > 0 && (
                  <Tooltip label="Haftalık programa git" withArrow>
                    <ActionIcon variant="subtle" size="sm" color="indigo" component="span">
                      <IconChevronRight size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <ThemeIcon
                  variant="gradient"
                  gradient={publishedCount > 0 ? { from: 'orange', to: 'red' } : { from: 'indigo', to: 'violet' }}
                  radius="xl"
                >
                  <IconBell size={14} />
                </ThemeIcon>
              </Group>
            </Group>
            <Title order={3} c={publishedCount > 0 ? 'orange' : undefined}>{publishedCount}</Title>
            {publishedCount > 0 && (
              <Text size="xs" c="dimmed" mt={4}>Tıkla → Haftalık Program</Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-4">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Fazla Mesai</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>{report.totals.overtimeHours.toFixed(1)} saat</Title>
          </Card>
        </Grid.Col>
      </Grid>

      {/* ─── Onay Kuyruğu: kimin onayı beklediğini listeler ─── */}
      {publishedCount > 0 && (
        <Paper
          withBorder
          radius="md"
          p="md"
          className="surface-card"
          style={{ borderLeft: '3px solid var(--mantine-color-orange-filled)' }}
        >
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon variant="light" color="orange" radius="xl" size="sm">
                <IconBell size={12} />
              </ThemeIcon>
              <Title order={4}>Onay Kuyruğu</Title>
            </Group>
            <Badge color="orange" variant="light">{publishedCount} bekliyor</Badge>
          </Group>

          <Stack gap="xs">
            {publishedShifts.map((shift) => (
              <Card
                key={shift.id}
                withBorder
                radius="md"
                p="sm"
                className="interactive-card"
                onClick={() => router.push('/schedule')}
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between" align="center">
                  <Stack gap={0}>
                    <Text fw={700} size="sm">{shift.employeeName ?? 'Çalışan'}</Text>
                    <Text c="dimmed" size="xs">
                      {formatDateShort(shift.start)} — {formatTimeOnly(shift.start)} - {formatTimeOnly(shift.end)}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <Badge color="orange" variant="light" size="sm">Onay Bekliyor</Badge>
                    <ActionIcon variant="subtle" size="sm" color="indigo">
                      <IconChevronRight size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>

          <Text size="xs" c="dimmed" mt="sm">
            💡 Çalışanlar kendi panellerinden (<em>Vardiyalarım</em>) &quot;Onayla&quot; butonuna basarak onay verebilir.
          </Text>
        </Paper>
      )}

      {/* ─── Bildirimler + Yaklaşan Vardiyalar ─── */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" className="surface-card">
            <Group justify="space-between" mb="xs">
              <Title order={4}>Bildirimler</Title>
              <Badge variant="light">{notifications.length}</Badge>
            </Group>
            <List spacing="xs" size="sm">
              {notifications.map((item) => (
                <List.Item
                  key={item.id}
                  c={item.severity === 'warning' ? 'orange' : undefined}
                  style={{ cursor: item.action ? 'pointer' : 'default' }}
                  onClick={item.action}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" style={{ flex: 1 }}>{item.text}</Text>
                    {item.action && <IconChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />}
                  </Group>
                </List.Item>
              ))}
            </List>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" className="surface-card">
            <Group justify="space-between" mb="xs">
              <Title order={4}>Yaklaşan Vardiyalar</Title>
              <Badge variant="light">{upcoming.length}</Badge>
            </Group>
            <Stack gap="xs">
              {upcoming.map((shift) => (
                <Card key={shift.id} withBorder radius="md" p="sm" className="interactive-card">
                  <Group justify="space-between" align="center">
                    <Stack gap={0}>
                      <Text fw={600}>{shift.employeeName ?? 'Çalışan'}</Text>
                      <Text c="dimmed" size="xs">
                        {formatTimeOnly(shift.start)} - {formatTimeOnly(shift.end)}
                      </Text>
                    </Stack>
                    <Badge variant="light">{getShiftStatusLabel(shift.status)}</Badge>
                  </Group>
                </Card>
              ))}
              {upcoming.length === 0 && (
                <Text c="dimmed" size="sm">Bu hafta için yaklaşan vardiya yok.</Text>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
