"use client";

import { ActionIcon, Badge, Card, Grid, Group, List, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconCalendarEvent, IconChevronRight, IconClockHour4, IconHistory, IconPercentage, IconUsers } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useEmployees } from '../../../hooks/use-employees';
import { useWeeklyReport } from '../../../hooks/use-reports';
import { useWeeklySchedule } from '../../../hooks/use-shifts';
import { getShiftStatusLabel } from '../../../lib/shift-status';
import { currentWeekStartIsoDate, formatDateShort, formatTimeOnly } from '../../../lib/time';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';

export default function DashboardPage() {
  const router = useRouter();
  const weekStart = currentWeekStartIsoDate();
  const [todayStr] = useState(() => new Date().toLocaleDateString('tr-TR'));
  const todayIso = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }), []);
  const { data: me } = useAuth();

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useEmployees(true);
  const { data: schedule, isLoading: scheduleLoading, isError: scheduleError } = useWeeklySchedule(weekStart);
  const { data: report, isLoading: reportLoading, isError: reportError } = useWeeklyReport(weekStart);

  const isLoading = employeesLoading || scheduleLoading || reportLoading;
  const isError = employeesError || scheduleError || reportError;

  // Bekleyen izin talepleri
  const { data: pendingLeaves } = useQuery<{ id: string }[]>({
    queryKey: ['leaves', 'pending-count'],
    queryFn: async () => {
      const { data } = await api.get('/leave-requests?status=PENDING');
      return Array.isArray(data) ? data : [];
    },
  });
  const pendingLeaveCount = pendingLeaves?.length ?? 0;

  // Son aktiviteler (audit trail)
  const isAdmin = me?.role === 'ADMIN';
  const isManager = me?.role === 'MANAGER';
  const { data: recentActivities } = useQuery<Array<{ id: string; action: string; entityType: string; createdAt: string; user?: { name?: string; email?: string } }>>({
    queryKey: ['dashboard', 'recent-activities'],
    queryFn: async () => {
      const { data } = await api.get('/reports/audit-trail?limit=8');
      return Array.isArray(data) ? data : [];
    },
    enabled: isAdmin || isManager,
  });

  const shifts = useMemo(() => (schedule?.days ?? []).flatMap((day) => day.shifts), [schedule]);

  // Bugünün vardiyaları
  const todayShifts = useMemo(() => {
    const todayDay = schedule?.days?.find((d: any) => d.date === todayIso);
    return todayDay?.shifts ?? [];
  }, [schedule, todayIso]);

  // PUBLISHED = çalışan henüz onaylamamış
  const publishedShifts = useMemo(() => shifts.filter((shift) => shift.status === 'PUBLISHED'), [shifts]);
  const publishedCount = publishedShifts.length;
  const unassignedDays = useMemo(
    () => (schedule?.days ?? []).filter((day) => day.shifts.length === 0).length,
    [schedule]
  );

  // Haftalık doluluk oranı
  const weeklyOccupancy = useMemo(() => {
    const totalDays = schedule?.days?.length ?? 7;
    const filledDays = totalDays - unassignedDays;
    return totalDays > 0 ? Math.round((filledDays / totalDays) * 100) : 0;
  }, [schedule, unassignedDays]);

  // Departman dağılımı
  const departmentDistribution = useMemo(() => {
    if (!employees) return [];
    const map = new Map<string, number>();
    for (const emp of employees) {
      const dept = (emp as any).department || 'Belirtilmemiş';
      map.set(dept, (map.get(dept) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return shifts
      .filter((s) => new Date(s.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [shifts]);

  const notifications = useMemo(() => {
    const items: Array<{ id: string; text: string; severity: 'warning' | 'info'; action?: () => void }> = [];

    if (publishedCount > 0) {
      items.push({
        id: 'pending-acks',
        text: `${publishedCount} vardiya barista veya servis ekibi onayı bekliyor.`,
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
      items.push({ id: 'none', text: 'Yeni kritik uyarı yok, kafe planı dengeli görünüyor.', severity: 'info' });
    }

    return items;
  }, [publishedCount, report?.totals.overtimeHours, unassignedDays, router]);

  if (isLoading) return <PageLoading />;
  if (isError || !employees || !schedule || !report) {
    return <PageError message="Dashboard verileri yüklenemedi." />;
  }

  const deptColors = ['indigo', 'violet', 'teal', 'orange', 'pink', 'cyan', 'grape', 'lime'];
  const totalEmps = employees.length || 1;

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">DASHBOARD</Badge>
            <Text c="dimmed" size="sm">{todayStr}</Text>
          </Group>
          <Title order={2}>Kafe Operasyon Özeti</Title>
          <Text c="dimmed" size="sm">Personel planını, izin akışını ve puantaj sinyallerini tek ekrandan izle.</Text>
        </Stack>
      </Group>

      {/* ─── Stat Kartları ─── */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-1">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Aktif Personel</Text>
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
              <Text c="dimmed" size="sm">Bugünün Ekibi</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'teal', to: 'cyan' }} radius="xl">
                <IconClockHour4 size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>{todayShifts.length}</Title>
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
              <Text c="dimmed" size="sm">Onay Bekleyen Vardiya</Text>
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
              <Text c="dimmed" size="sm">Haftalık Fazla Mesai</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'violet' }} radius="xl">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>{report.totals.overtimeHours.toFixed(1)} saat</Title>
          </Card>
        </Grid.Col>

        {/* Bekleyen İzin Talepleri */}
        {pendingLeaveCount > 0 && (
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card
              withBorder
              p="md"
              className="stat-card gradient-card stagger-5 interactive-card"
              style={{ cursor: 'pointer' }}
              onClick={() => router.push('/leaves')}
            >
              <Group justify="space-between">
                <Text c="dimmed" size="sm">Bekleyen İzin</Text>
                <ThemeIcon variant="gradient" gradient={{ from: 'orange', to: 'pink' }} radius="xl">
                  <IconCalendarEvent size={14} />
                </ThemeIcon>
              </Group>
              <Title order={3} c="orange">{pendingLeaveCount}</Title>
              <Text size="xs" c="dimmed" mt={4}>Tıkla → İzin Onayları</Text>
            </Card>
          </Grid.Col>
        )}

        {/* Haftalık Doluluk Oranı */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md" className="stat-card gradient-card stagger-5">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Haftalık Kapsama</Text>
              <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'pink' }} radius="xl">
                <IconPercentage size={14} />
              </ThemeIcon>
            </Group>
            <Title order={3}>%{weeklyOccupancy}</Title>
            <Progress value={weeklyOccupancy} size="sm" mt={8} radius="xl" color={weeklyOccupancy >= 80 ? 'teal' : weeklyOccupancy >= 50 ? 'yellow' : 'red'} />
          </Card>
        </Grid.Col>
      </Grid>

      {/* ─── Bugünün Vardiyaları ─── */}
      {todayShifts.length > 0 && (
        <Paper
          withBorder
          radius="md"
          p="md"
          className="surface-card"
          style={{ borderLeft: '3px solid var(--mantine-color-teal-filled)' }}
        >
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon variant="light" color="teal" radius="xl" size="sm">
                <IconClockHour4 size={12} />
              </ThemeIcon>
              <Title order={4}>Bugünün Kafe Ekibi</Title>
            </Group>
            <Badge color="teal" variant="light">{todayShifts.length} vardiya</Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
            {todayShifts.map((shift: any) => (
              <Card key={shift.id} withBorder radius="md" p="sm" className="interactive-card">
                <Group justify="space-between" align="center">
                  <Stack gap={0}>
                    <Text fw={600} size="sm">{shift.employeeName ?? 'Çalışan'}</Text>
                    <Text c="dimmed" size="xs">
                      {formatTimeOnly(shift.start)} - {formatTimeOnly(shift.end)}
                    </Text>
                  </Stack>
                  <Badge variant="light" size="sm">{getShiftStatusLabel(shift.status)}</Badge>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Paper>
      )}

      {/* ─── Onay Kuyruğu ─── */}
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
              <Title order={4}>Yayın Bekleyen Onaylar</Title>
            </Group>
            <Badge color="orange" variant="light">{publishedCount} bekliyor</Badge>
          </Group>

          <Stack gap="xs">
            {publishedShifts.slice(0, 5).map((shift) => (
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
                  <Badge color="orange" variant="light" size="sm">Onay Bekliyor</Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ─── Alt Panel: Bildirimler + Departman + Yaklaşan + Aktiviteler ─── */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="md" p="md" className="surface-card">
            <Group justify="space-between" mb="xs">
              <Title order={4}>Operasyon Uyarıları</Title>
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
              <Title order={4}>Ekip Dağılımı</Title>
              <Badge variant="light">{departmentDistribution.length} departman</Badge>
            </Group>
            <Stack gap="xs">
              {departmentDistribution.map((dept, i) => (
                <div key={dept.name}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>{dept.name}</Text>
                    <Text size="xs" c="dimmed">{dept.count} kişi</Text>
                  </Group>
                  <Progress
                    value={Math.round((dept.count / totalEmps) * 100)}
                    size="sm"
                    radius="xl"
                    color={deptColors[i % deptColors.length]}
                  />
                </div>
              ))}
              {departmentDistribution.length === 0 && (
                <Text c="dimmed" size="sm">Departman bilgisi bulunamadı.</Text>
              )}
            </Stack>
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
                        {formatDateShort(shift.start)} — {formatTimeOnly(shift.start)} - {formatTimeOnly(shift.end)}
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

        {/* Son Aktiviteler — sadece Admin/Manager */}
        {(isAdmin || isManager) && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder radius="md" p="md" className="surface-card">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="grape" radius="xl" size="sm">
                    <IconHistory size={12} />
                  </ThemeIcon>
                  <Title order={4}>Son Aktiviteler</Title>
                </Group>
                <Badge variant="light" color="grape"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/reports')}
                >Tümü →</Badge>
              </Group>
              <Stack gap="xs">
                {(recentActivities ?? []).slice(0, 6).map((a) => (
                  <Group key={a.id} gap="xs" wrap="nowrap">
                    <Badge variant="light" size="xs" style={{ flexShrink: 0 }}>{a.action}</Badge>
                    <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                      {a.user?.name ?? a.user?.email ?? '—'} → {a.entityType}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {new Date(a.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Group>
                ))}
                {(recentActivities ?? []).length === 0 && (
                  <Text c="dimmed" size="sm">Henüz aktivite kaydı yok.</Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </Stack>
  );
}
