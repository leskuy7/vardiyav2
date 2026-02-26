"use client";

import { Badge, Card, Grid, Group, List, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconClockHour4, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useEmployees } from '../../../hooks/use-employees';
import { useWeeklyReport } from '../../../hooks/use-reports';
import { useWeeklySchedule } from '../../../hooks/use-shifts';
import { getShiftStatusLabel } from '../../../lib/shift-status';
import { currentWeekStartIsoDate, formatTimeOnly } from '../../../lib/time';

export default function DashboardPage() {
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

  const publishedCount = useMemo(() => shifts.filter((shift) => shift.status === 'PUBLISHED').length, [shifts]);
  const unassignedDays = useMemo(() => (schedule?.days ?? []).filter((day) => day.shifts.length === 0).length, [schedule]);

  const upcoming = useMemo(() => {
    return shifts
      .slice()
      .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
      .slice(0, 5);
  }, [shifts]);

  const notifications = useMemo(() => {
    const items: Array<{ id: string; text: string; severity: 'warning' | 'info' }> = [];

    if (publishedCount > 0) {
      items.push({
        id: 'pending-acks',
        text: `${publishedCount} vardiya çalışan onayı bekliyor.`,
        severity: 'info'
      });
    }

    if (unassignedDays > 0) {
      items.push({
        id: 'empty-days',
        text: `${unassignedDays} gün için henüz vardiya planı bulunmuyor.`,
        severity: 'warning'
      });
    }

    if ((report?.totals.overtimeHours ?? 0) > 0) {
      items.push({
        id: 'overtime',
        text: `Bu hafta ${report?.totals.overtimeHours.toFixed(1)} saat fazla mesai görünüyor.`,
        severity: 'warning'
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'none',
        text: 'Yeni bildirim yok, planlama dengeli görünüyor.',
        severity: 'info'
      });
    }

    return items;
  }, [publishedCount, report?.totals.overtimeHours, unassignedDays]);

  if (isLoading) {
    return <PageLoading />;
  }

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

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-1">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Aktif Çalışan</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl"><IconUsers size={14} /></ThemeIcon>
            </Group>
            <Title order={3}>{employees.length}</Title>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-2">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Toplam Vardiya</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl"><IconClockHour4 size={14} /></ThemeIcon>
            </Group>
            <Title order={3}>{shifts.length}</Title>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-3">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Onay Bekleyen</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl"><IconBell size={14} /></ThemeIcon>
            </Group>
            <Title order={3}>{publishedCount}</Title>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-4">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Fazla Mesai</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl"><IconAlertTriangle size={14} /></ThemeIcon>
            </Group>
            <Title order={3}>{report.totals.overtimeHours.toFixed(1)} saat</Title>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" className="surface-card">
            <Group justify="space-between" mb="xs">
              <Title order={4}>Bildirimler</Title>
              <Badge variant="light">{notifications.length}</Badge>
            </Group>
            <List spacing="xs" size="sm">
              {notifications.map((item) => (
                <List.Item key={item.id} c={item.severity === 'warning' ? 'orange' : undefined}>
                  {item.text}
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
                      <Text c="dimmed" size="xs">{formatTimeOnly(shift.start)} - {formatTimeOnly(shift.end)}</Text>
                    </Stack>
                    <Badge variant="light">{getShiftStatusLabel(shift.status)}</Badge>
                  </Group>
                </Card>
              ))}
              {upcoming.length === 0 ? <Text c="dimmed" size="sm">Bu hafta için yaklaşan vardiya yok.</Text> : null}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
