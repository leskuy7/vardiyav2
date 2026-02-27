"use client";

import { Alert, Badge, Button, Card, Container, Grid, Group, Paper, Select, Stack, Text, Title } from '@mantine/core';
import { useMemo, useState } from 'react';
import { PageError, PageLoading } from '../../../components/page-states';
import { useEmployees } from '../../../hooks/use-employees';
import { useShiftsActions, useWeeklySchedule } from '../../../hooks/use-shifts';
import { currentWeekStartIsoDate } from '../../../lib/time';
import { ShiftModal } from '../../../components/schedule/shift-modal';
import { WeeklyGrid } from '../../../components/schedule/weekly-grid';

function shiftIsoDate(isoDate: string, days: number) {
  const value = new Date(`${isoDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
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

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(currentWeekStartIsoDate());
  const [gridScale, setGridScale] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<
    { id: string; employeeId: string; start: string; end: string; note?: string } | undefined
  >(undefined);

  const { data, isLoading, isError } = useWeeklySchedule(weekStart);
  const { data: employees } = useEmployees(true);
  const { createShift, updateShift, deleteShift } = useShiftsActions(weekStart);

  const totalShifts = useMemo(() => (data?.days ?? []).reduce((sum, day) => sum + day.shifts.length, 0), [data]);
  const totalHours = useMemo(() => {
    return Number(
      ((data?.days ?? []).flatMap((day) => day.shifts).reduce((sum, shift) => {
        const start = new Date(shift.start).getTime();
        const end = new Date(shift.end).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0)).toFixed(1)
    );
  }, [data]);

  const shiftIndex = useMemo(() => {
    const index = new Map<string, { id: string; employeeId: string; start: string; end: string; note?: string }>();
    for (const day of data?.days ?? []) {
      for (const shift of day.shifts) {
        index.set(shift.id, {
          id: shift.id,
          employeeId: shift.employeeId,
          start: shift.start,
          end: shift.end
        });
      }
    }
    return index;
  }, [data]);

  const departmentOptions = useMemo(() => {
    const departments = Array.from(new Set((employees ?? []).map((employee) => employee.department).filter(Boolean))) as string[];
    return [{ value: 'all', label: 'Tüm Departmanlar' }, ...departments.map((department) => ({ value: department, label: department }))];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (departmentFilter === 'all') {
      return employees ?? [];
    }
    return (employees ?? []).filter((employee) => employee.department === departmentFilter);
  }, [departmentFilter, employees]);

  function openCreate(employeeId: string, date: string) {
    setSelectedShift(undefined);
    setSelectedEmployeeId(employeeId);
    const start = new Date(`${date}T06:00:00.000Z`).toISOString();
    const end = new Date(`${date}T14:00:00.000Z`).toISOString();
    setSelectedShift({ id: '', employeeId, start, end });
    setModalOpen(true);
  }

  function openEdit(shift: { id: string; employeeId: string; start: string; end: string }) {
    setSelectedEmployeeId(shift.employeeId);
    setSelectedShift({ id: shift.id, employeeId: shift.employeeId, start: shift.start, end: shift.end });
    setModalOpen(true);
  }

  async function handleSubmit(payload: { employeeId: string; startTime: string; endTime: string; note?: string; forceOverride?: boolean }) {
    if (selectedShift?.id) {
      const result = await updateShift.mutateAsync({ id: selectedShift.id, ...payload });
      const warnings = result.warnings ?? [];
      setWarning(warnings.length > 0 ? warnings.join(', ') : null);
      return;
    }

    const result = await createShift.mutateAsync(payload);
    const warnings = result.warnings ?? [];
    setWarning(warnings.length > 0 ? warnings.join(', ') : null);
  }

  async function handleMove(payload: { shiftId: string; employeeId: string; targetDate: string }) {
    const shift = shiftIndex.get(payload.shiftId);
    if (!shift) return;

    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const duration = end.getTime() - start.getTime();

    const timePart = start.toISOString().slice(11, 19);
    const movedStart = new Date(`${payload.targetDate}T${timePart}.000Z`);
    const movedEnd = new Date(movedStart.getTime() + duration);

    const result = await updateShift.mutateAsync({
      id: shift.id,
      employeeId: payload.employeeId,
      startTime: movedStart.toISOString(),
      endTime: movedEnd.toISOString()
    });

    const warnings = result.warnings ?? [];
    setWarning(warnings.length > 0 ? warnings.join(', ') : null);
  }

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError || !data) {
    return <PageError message="Plan yüklenemedi." />;
  }

  return (
    <Container fluid>
      <Stack>
        <Paper withBorder radius="lg" p="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <Badge variant="light">Haftalık Vardiya Programı</Badge>
                <Text c="dimmed" size="sm">{new Date().toLocaleDateString('tr-TR')}</Text>
              </Group>
              <Group>
                <Badge variant="light">Çalışan: {employees?.length ?? 0}</Badge>
                <Badge variant="light">Vardiya: {totalShifts}</Badge>
                <Badge variant="light">Saat: {totalHours.toFixed(1)}</Badge>
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="wrap">
              <Group wrap="wrap">
                <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, -7))}>Önceki</Button>
                <Title order={3}>{formatWeekRange(weekStart)}</Title>
                <Button variant="light" onClick={() => setWeekStart((value) => shiftIsoDate(value, 7))}>Sonraki</Button>
                <Button variant="default" onClick={() => setWeekStart(currentWeekStartIsoDate())}>Bugün</Button>
              </Group>
              <Group>
                <Group gap="xs">
                  <Button
                    variant="default"
                    onClick={() => setGridScale((value) => Number(Math.max(0.8, value - 0.1).toFixed(1)))}
                    aria-label="Programı küçült"
                  >
                    -
                  </Button>
                  <Badge variant="light">{Math.round(gridScale * 100)}%</Badge>
                  <Button
                    variant="default"
                    onClick={() => setGridScale((value) => Number(Math.min(1.4, value + 0.1).toFixed(1)))}
                    aria-label="Programı büyüt"
                  >
                    +
                  </Button>
                </Group>
                <Button variant="default" onClick={() => window.open(`/schedule/print?start=${weekStart}`, '_blank')}>Yazdır</Button>
                <Button
                  onClick={() => {
                    setSelectedShift(undefined);
                    setSelectedEmployeeId((employees ?? [])[0]?.id ?? '');
                    setModalOpen(true);
                  }}
                >
                  Vardiya Ekle
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Text c="dimmed" size="sm">Toplam Çalışan</Text>
              <Title order={3}>{filteredEmployees.length}</Title>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Text c="dimmed" size="sm">Planlanan Gün</Text>
              <Title order={3}>{data.days.length}</Title>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              label="Departman Filtresi"
              data={departmentOptions}
              value={departmentFilter}
              onChange={(value) => setDepartmentFilter(value ?? 'all')}
            />
          </Grid.Col>
        </Grid>

        {warning ? (
          <Alert color="yellow" variant="light" title="Planlama Uyarısı">
            {warning}
          </Alert>
        ) : null}

        <WeeklyGrid
          employees={filteredEmployees}
          days={data.days}
          scale={gridScale}
          onCreate={openCreate}
          onEdit={(shift) => openEdit({ id: shift.id, employeeId: shift.employeeId, start: shift.start, end: shift.end })}
          onMove={handleMove}
        />
      </Stack>

      <ShiftModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeId={selectedEmployeeId}
        employees={(employees ?? []).map((employee) => ({ value: employee.id, label: employee.user.name }))}
        initial={selectedShift ? { start: selectedShift.start, end: selectedShift.end, note: selectedShift.note } : undefined}
        onSubmit={handleSubmit}
        onDelete={
          selectedShift?.id
            ? async () => {
              await deleteShift.mutateAsync(selectedShift.id);
            }
            : undefined
        }
      />
    </Container>
  );
}
