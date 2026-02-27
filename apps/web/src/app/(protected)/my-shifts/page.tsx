"use client";

import { Badge, Button, Card, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PageEmpty, PageError, PageLoading } from '../../../components/page-states';
import { useShiftsActions } from '../../../hooks/use-shifts';
import { getShiftStatusColor, getShiftStatusIcon, getShiftStatusLabel } from '../../../lib/shift-status';
import { currentWeekStartIsoDate, formatDateShort, formatTimeOnly } from '../../../lib/time';
import { api } from '../../../lib/api';

type ShiftItem = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
};

export default function MyShiftsPage() {
  const weekStart = currentWeekStartIsoDate();
  const { acknowledgeShift } = useShiftsActions(weekStart);

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data as { employee?: { id: string } };
    }
  });

  const employeeId = me?.employee?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-shifts', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const response = await api.get<ShiftItem[]>(`/shifts?employeeId=${employeeId}`);
      return response.data;
    }
  });

  const total = data?.length ?? 0;
  const published = useMemo(() => (data ?? []).filter((shift) => shift.status === 'PUBLISHED').length, [data]);
  const acknowledged = useMemo(() => (data ?? []).filter((shift) => shift.status === 'ACKNOWLEDGED').length, [data]);

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Vardiyalar yüklenemedi." />;

  return (
    <Stack>
      <Stack gap={2}>
        <Badge variant="light" w="fit-content">ÇALIŞAN PANELİ</Badge>
        <Title order={2}>Vardiyalarım</Title>
        <Text c="dimmed" size="sm">Planlanan vardiyalarını takip et ve yayınlananları onayla.</Text>
      </Stack>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Toplam Vardiya</Text>
            <Title order={3}>{total}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Onay Bekleyen</Text>
            <Title order={3}>{published}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">Onaylanan</Text>
            <Title order={3}>{acknowledged}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      {(data ?? []).length === 0 ? (
        <PageEmpty title="Henüz atanmış vardiya yok" description="Yeni vardiya atandığında bu listede görünecek." />
      ) : (
        <Stack>
          {(data ?? []).map((shift: ShiftItem) => (
            <Card key={shift.id} withBorder radius="md" p="md" className="surface-card interactive-card">
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text fw={700}>{formatDateShort(shift.startTime)} — {formatTimeOnly(shift.startTime)} - {formatTimeOnly(shift.endTime)}</Text>
                  <Text size="sm" c="dimmed">Vardiya ID: #{shift.id.slice(0, 8)}</Text>
                </Stack>
                <Group>
                  <Badge
                    variant="light"
                    color={getShiftStatusColor(shift.status)}
                    leftSection={(() => {
                      const StatusIcon = getShiftStatusIcon(shift.status);
                      return <StatusIcon size={12} />;
                    })()}
                  >
                    {getShiftStatusLabel(shift.status)}
                  </Badge>
                  {shift.status === 'PUBLISHED' ? (
                    <Button
                      size="xs"
                      loading={acknowledgeShift.isPending}
                      onClick={() => acknowledgeShift.mutate(shift.id, {
                        onSuccess: () => notifications.show({ title: 'Onaylandı', message: 'Vardiya başarıyla onaylandı.', color: 'green' }),
                        onError: (err: any) => {
                          const msg = err?.response?.data?.message ?? 'Onay başarısız oldu.';
                          notifications.show({ title: 'Hata', message: msg, color: 'red' });
                        }
                      })}
                    >
                      Onayla
                    </Button>
                  ) : null}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
