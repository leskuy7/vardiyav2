"use client";

import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { DateInput, TimeInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useAuth } from '../../../hooks/use-auth';
import { useEmployees } from '../../../hooks/use-employees';
import { useAvailability, useAvailabilityActions, type AvailabilityType } from '../../../hooks/use-availability';
import { formatDateDisplay } from '../../../lib/time';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function typeBadgeColor(type: AvailabilityType): string {
  if (type === 'UNAVAILABLE') return 'red';
  if (type === 'PREFER_NOT') return 'orange';
  return 'green';
}

const dayOptions = [
  { value: '1', label: 'Pazartesi' },
  { value: '2', label: 'Salı' },
  { value: '3', label: 'Çarşamba' },
  { value: '4', label: 'Perşembe' },
  { value: '5', label: 'Cuma' },
  { value: '6', label: 'Cumartesi' },
  { value: '0', label: 'Pazar' }
];

const typeOptions: Array<{ value: AvailabilityType; label: string }> = [
  { value: 'UNAVAILABLE', label: 'Müsait Değil' },
  { value: 'PREFER_NOT', label: 'Tercih Etmiyor' },
  { value: 'AVAILABLE_ONLY', label: 'Sadece Müsait' }
];

function typeLabel(type: AvailabilityType) {
  return typeOptions.find((item) => item.value === type)?.label ?? type;
}

function dayLabel(dayOfWeek: number) {
  return dayOptions.find((item) => Number(item.value) === dayOfWeek)?.label ?? String(dayOfWeek);
}

export default function AvailabilityPage() {
  const { data: auth } = useAuth();
  const canManageAll = auth?.role === 'ADMIN' || auth?.role === 'MANAGER';

  const { data: employees } = useEmployees(true);
  const defaultEmployeeId = canManageAll ? employees?.[0]?.id ?? '' : auth?.employee?.id ?? '';

  const [employeeId, setEmployeeId] = useState<string>('');
  const [type, setType] = useState<AvailabilityType>('UNAVAILABLE');
  const [dayOfWeek, setDayOfWeek] = useState<string>('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [note, setNote] = useState('');

  const effectiveEmployeeId = employeeId || defaultEmployeeId;
  const { data, isLoading, isError } = useAvailability(canManageAll ? undefined : effectiveEmployeeId || undefined);
  const { createAvailability, deleteAvailability } = useAvailabilityActions(canManageAll ? undefined : effectiveEmployeeId || undefined);

  const employeeOptions = useMemo(
    () => (employees ?? []).map((employee) => ({ value: employee.id, label: `${employee.user.name} (${employee.user.email})` })),
    [employees]
  );

  async function handleCreate() {
    const selectedEmployeeId = effectiveEmployeeId;
    if (!selectedEmployeeId) {
      notifications.show({ title: 'Hata', message: 'Önce çalışan seçmelisin.', color: 'red' });
      return;
    }

    try {
      await createAvailability.mutateAsync({
        employeeId: selectedEmployeeId,
        type,
        dayOfWeek: Number(dayOfWeek),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        note: note || undefined
      });
      setNote('');
      notifications.show({ title: 'Başarılı', message: 'Müsaitlik kaydı oluşturuldu.', color: 'green' });
    } catch {
      notifications.show({ title: 'Hata', message: 'Müsaitlik kaydı oluşturulamadı.', color: 'red' });
    }
  }

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Müsaitlik kayıtları yüklenemedi." />;

  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Badge variant="light">MÜSAİTLİK YÖNETİMİ</Badge>
          <Title order={2}>Müsaitlik</Title>
          <Text c="dimmed" size="sm">Vardiya kuralları için çalışan müsaitlik bloklarını tanımla.</Text>
        </Stack>
        <Badge size="lg" variant="light">Kayıt: {data?.length ?? 0}</Badge>
      </Group>

      <Card withBorder radius="lg" p="md">
        <Stack>
          <Grid>
            {canManageAll ? (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Çalışan"
                  placeholder="Çalışan seç"
                  value={employeeId || defaultEmployeeId}
                  onChange={(value) => setEmployeeId(value ?? '')}
                  data={employeeOptions}
                  searchable
                />
              </Grid.Col>
            ) : null}

            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Tür"
                value={type}
                onChange={(value) => setType((value as AvailabilityType) ?? 'UNAVAILABLE')}
                data={typeOptions}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Gün"
                value={dayOfWeek}
                onChange={(value) => setDayOfWeek(value ?? '1')}
                data={dayOptions}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <TimeInput label="Başlangıç Saat" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} withSeconds={false} />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <TimeInput label="Bitiş Saat" value={endTime} onChange={(event) => setEndTime(event.currentTarget.value)} withSeconds={false} />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <DateInput label="Başlangıç Tarih" placeholder="Tarih seçin" value={startDate ? new Date(startDate) : null} onChange={(val) => setStartDate(val ? val.toISOString().slice(0, 10) : todayIso())} clearable />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <DateInput label="Bitiş Tarih" placeholder="Tarih seçin" value={endDate ? new Date(endDate) : null} onChange={(val) => setEndDate(val ? val.toISOString().slice(0, 10) : todayIso())} clearable />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Not"
            placeholder="Opsiyonel not"
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end">
            <Button onClick={handleCreate} loading={createAvailability.isPending}>Müsaitlik Ekle</Button>
          </Group>
        </Stack>
      </Card>

      <ScrollArea>
        <Table withTableBorder striped="odd" highlightOnHover verticalSpacing="md" horizontalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Çalışan</Table.Th>
              <Table.Th>Tür</Table.Th>
              <Table.Th>Gün</Table.Th>
              <Table.Th>Saat Aralığı</Table.Th>
              <Table.Th>Tarih Aralığı</Table.Th>
              <Table.Th>Not</Table.Th>
              <Table.Th>Aksiyon</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(data ?? []).length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">Müsaitlik kaydı bulunamadı.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              (data ?? []).map((item) => {
                const owner = (employees ?? []).find((employee) => employee.id === item.employeeId);
                return (
                  <Table.Tr key={item.id}>
                    <Table.Td>{owner?.user.name ?? item.employeeId.slice(0, 8)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={typeBadgeColor(item.type)}>{typeLabel(item.type)}</Badge>
                    </Table.Td>
                    <Table.Td>{dayLabel(item.dayOfWeek)}</Table.Td>
                    <Table.Td>{item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : '–'}</Table.Td>
                    <Table.Td>
                      {item.startDate || item.endDate
                        ? [item.startDate, item.endDate]
                          .filter(Boolean)
                          .map((d) => formatDateDisplay(d!))
                          .join(' – ')
                        : '–'}
                    </Table.Td>
                    <Table.Td>{item.note ?? '–'}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        loading={deleteAvailability.isPending}
                        onClick={() => {
                          const ownerName = owner?.user.name ?? item.employeeId.slice(0, 8);
                          const timeRange = item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : 'Tüm gün';
                          const dateRange = item.startDate || item.endDate
                            ? [item.startDate, item.endDate].filter(Boolean).map((d) => formatDateDisplay(d!)).join(' – ')
                            : 'Süresiz';
                          modals.openConfirmModal({
                            title: 'Müsaitlik kaydını sil',
                            centered: true,
                            children: (
                              <Stack gap="xs">
                                <Text size="sm" c="dimmed">
                                  Aşağıdaki kaydı silmek istediğinize emin misiniz?
                                </Text>
                                <Text size="sm" fw={600}>Çalışan: {ownerName}</Text>
                                <Text size="sm">Gün: {dayLabel(item.dayOfWeek)} · Saat: {timeRange}</Text>
                                <Text size="sm">Tarih aralığı: {dateRange}</Text>
                                {item.note ? <Text size="sm" c="dimmed">Not: {item.note}</Text> : null}
                              </Stack>
                            ),
                            labels: { confirm: 'Sil', cancel: 'İptal' },
                            confirmProps: { color: 'red' },
                            onConfirm: () =>
                              deleteAvailability.mutate(item.id, {
                                onSuccess: () => notifications.show({ title: 'Silindi', message: `${ownerName} – ${dayLabel(item.dayOfWeek)} müsaitlik kaydı silindi.`, color: 'green' }),
                                onError: () => notifications.show({ title: 'Hata', message: 'Silme başarısız.', color: 'red' }),
                              }),
                          });
                        }}
                      >
                        Sil
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
