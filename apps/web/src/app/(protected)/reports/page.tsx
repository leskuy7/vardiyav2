"use client";

import { Badge, Button, Card, Grid, Group, ScrollArea, Stack, Table, Text, Title } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useState } from 'react';
import { currentWeekStartIsoDate } from '../../../lib/time';
import { PageEmpty, PageError, PageLoading } from '../../../components/page-states';
import { useWeeklyReport } from '../../../hooks/use-reports';

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
  const { data, isLoading, isError } = useWeeklyReport(weekStart);

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
    </Stack>
  );
}
