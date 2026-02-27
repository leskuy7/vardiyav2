"use client";

import { Badge, Button, Card, Grid, Group, ScrollArea, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { currentWeekStartIsoDate } from '../../../lib/time';
import { PageEmpty, PageError, PageLoading } from '../../../components/page-states';
import { useAuth } from '../../../hooks/use-auth';
import { useSecurityEvents, useWeeklyReport } from '../../../hooks/use-reports';

function shiftWeek(isoDate: string, dayOffset: number) {
  const value = new Date(`${isoDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + dayOffset);
  return value.toISOString().slice(0, 10);
}

function formatWeekRange(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const startText = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const endText = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${startText} - ${endText}`;
}

export default function ReportsPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStartIsoDate());
  const [securityDirective, setSecurityDirective] = useState('');
  const [securityFrom, setSecurityFrom] = useState('');
  const [securityTo, setSecurityTo] = useState('');
  const { data: me } = useAuth();
  const { data, isLoading, isError } = useWeeklyReport(weekStart);
  const isAdmin = me?.role === 'ADMIN';
  const {
    data: securityEvents,
    isLoading: securityLoading,
    isError: securityError
  } = useSecurityEvents(isAdmin, {
    limit: 100,
    directive: securityDirective,
    from: securityFrom,
    to: securityTo
  });

  const securitySummary = useMemo(() => {
    const events = securityEvents ?? [];
    const high = events.filter((event) => event.severity === 'HIGH').length;
    const medium = events.filter((event) => event.severity === 'MEDIUM').length;
    const low = events.filter((event) => event.severity === 'LOW').length;

    const topDirectiveMap = new Map<string, number>();
    for (const event of events) {
      const directive = event.violatedDirective ?? event.effectiveDirective ?? '-';
      topDirectiveMap.set(directive, (topDirectiveMap.get(directive) ?? 0) + 1);
    }

    const topDirective = Array.from(topDirectiveMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

    return {
      total: events.length,
      high,
      medium,
      low,
      topDirective
    };
  }, [securityEvents]);

  function severityColor(value: 'HIGH' | 'MEDIUM' | 'LOW') {
    if (value === 'HIGH') return 'red';
    if (value === 'MEDIUM') return 'yellow';
    return 'blue';
  }

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <PageError message="Rapor yüklenemedi." />;

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Badge variant="light">RAPORLAR</Badge>
            <Text c="dimmed" size="sm">{new Date().toLocaleDateString('tr-TR')}</Text>
          </Group>
          <Title order={2}>Haftalık Saat Raporu</Title>
          <Text c="dimmed" size="sm">Bu hafta toplam saat, mesai ve maliyet görünümü.</Text>
        </Stack>

        <Group>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftWeek(value, -7))}>Önceki</Button>
          <Badge size="lg" variant="light">{formatWeekRange(weekStart)}</Badge>
          <Button variant="light" onClick={() => setWeekStart((value) => shiftWeek(value, 7))}>Sonraki</Button>
        </Group>
        <Button
          variant="light"
          leftSection={<IconDownload size={16} />}
          onClick={() => {
            if (!data) return;
            const headers = ['Çalışan', 'Normal Saat', 'Toplam Saat', 'Fazla Mesai', 'Maliyet'];
            const rows = data.employees.map((r) => [
              r.employeeName,
              (r.hours - r.overtimeHours).toFixed(2),
              r.hours.toFixed(2),
              r.overtimeHours.toFixed(2),
              r.cost.toFixed(2)
            ]);
            const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rapor_${weekStart}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          CSV İndir
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Toplam Saat</Text>
            <Title order={3}>{data.totals.hours.toFixed(2)}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Toplam Fazla Mesai</Text>
            <Title order={3}>{data.totals.overtimeHours.toFixed(2)}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Toplam Maliyet</Text>
            <Title order={3}>₺{data.totals.cost.toFixed(2)}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      {data.employees.length === 0 ? (
        <PageEmpty title="Rapor verisi bulunamadı" description="Seçilen hafta için çalışan kırılımı henüz oluşmamış." />
      ) : (
        <ScrollArea>
          <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="md" horizontalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Çalışan</Table.Th>
                <Table.Th>Normal Saat</Table.Th>
                <Table.Th>Toplam Saat</Table.Th>
                <Table.Th>Fazla Mesai</Table.Th>
                <Table.Th>Maliyet</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.employees.map((row) => (
                <Table.Tr key={row.employeeId}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text fw={600}>{row.employeeName}</Text>
                      <Text c="dimmed" size="xs">#{row.employeeId.slice(0, 8)}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>{(row.hours - row.overtimeHours).toFixed(2)}</Table.Td>
                  <Table.Td>{row.hours.toFixed(2)}</Table.Td>
                  <Table.Td>{row.overtimeHours.toFixed(2)}</Table.Td>
                  <Table.Td>₺{row.cost.toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      {isAdmin ? (
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Güvenlik Olayları (CSP)</Title>
            <Group>
              <Badge variant="light">Son 100 kayıt</Badge>
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  const events = securityEvents ?? [];
                  if (events.length === 0) return;

                  const headers = ['Zaman', 'Directive', 'Blocked URI', 'Document URI', 'IP'];
                  const rows = events.map((event) => [
                    new Date(event.createdAt).toLocaleString('tr-TR'),
                    event.violatedDirective ?? event.effectiveDirective ?? '',
                    event.blockedUri ?? '',
                    event.documentUri ?? '',
                    event.sourceIp ?? ''
                  ]);

                  const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
                  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `security_events_${new Date().toISOString().slice(0, 10)}.csv`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                CSV İndir
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Toplam Olay</Text>
                <Title order={3}>{securitySummary.total}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Yüksek Kritiklik</Text>
                <Title order={3} c="red">{securitySummary.high}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">Orta Kritiklik</Text>
                <Title order={3} c="yellow">{securitySummary.medium}</Title>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">En Sık Directive</Text>
                <Text fw={700}>{securitySummary.topDirective}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Directive Filtre"
                placeholder="script-src, img-src..."
                value={securityDirective}
                onChange={(event) => setSecurityDirective(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Başlangıç Tarihi"
                type="date"
                value={securityFrom}
                onChange={(event) => setSecurityFrom(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Bitiş Tarihi"
                type="date"
                value={securityTo}
                onChange={(event) => setSecurityTo(event.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          {securityLoading ? (
            <Text c="dimmed" size="sm">Güvenlik olayları yükleniyor...</Text>
          ) : securityError ? (
            <Text c="red" size="sm">Güvenlik olayları yüklenemedi.</Text>
          ) : (securityEvents ?? []).length === 0 ? (
            <PageEmpty title="Güvenlik olayı yok" description="Henüz CSP ihlal kaydı oluşmadı." />
          ) : (
            <ScrollArea>
              <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Zaman</Table.Th>
                    <Table.Th>Kritiklik</Table.Th>
                    <Table.Th>Directive</Table.Th>
                    <Table.Th>Blocked URI</Table.Th>
                    <Table.Th>Document URI</Table.Th>
                    <Table.Th>IP</Table.Th>
                    <Table.Th>Öneri</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(securityEvents ?? []).map((event) => (
                    <Table.Tr key={event.id}>
                      <Table.Td>{new Date(event.createdAt).toLocaleString('tr-TR')}</Table.Td>
                      <Table.Td>
                        <Badge color={severityColor(event.severity)} variant="light">
                          {event.severity}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{event.violatedDirective ?? event.effectiveDirective ?? '-'}</Table.Td>
                      <Table.Td>{event.blockedUri ?? '-'}</Table.Td>
                      <Table.Td>{event.documentUri ?? '-'}</Table.Td>
                      <Table.Td>{event.sourceIp ?? '-'}</Table.Td>
                      <Table.Td>{event.recommendation}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
