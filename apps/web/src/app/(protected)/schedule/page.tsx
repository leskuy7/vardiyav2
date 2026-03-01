"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageError, PageLoading } from "../../../components/page-states";
import { useAvailability } from "../../../hooks/use-availability";
import { useEmployees } from "../../../hooks/use-employees";
import { useShiftsActions, useWeeklySchedule } from "../../../hooks/use-shifts";
import type { AvailabilityHintType } from "../../../components/schedule/weekly-grid";
import { currentWeekStartIsoDate, formatWeekRange, isoToLocalTimeString, localTimeToIso, shiftIsoDate } from "../../../lib/time";

const WeeklyGrid = dynamic(
  () => import("../../../components/schedule/weekly-grid").then((m) => m.WeeklyGrid),
  { loading: () => <PageLoading /> }
);
const ShiftModal = dynamic(
  () => import("../../../components/schedule/shift-modal").then((m) => m.ShiftModal),
  { loading: () => <PageLoading /> }
);

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(currentWeekStartIsoDate());
  const [warning, setWarning] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<
    | {
      id: string;
      employeeId: string;
      start: string;
      end: string;
      note?: string;
    }
    | undefined
  >(undefined);

  const { data, isLoading, isError } = useWeeklySchedule(weekStart);
  const { data: employees } = useEmployees(true);
  const { data: availabilityList } = useAvailability();
  const { createShift, updateShift, deleteShift } = useShiftsActions(weekStart);

  const totalShifts = useMemo(
    () => (data?.days ?? []).reduce((sum, day) => sum + day.shifts.length, 0),
    [data],
  );
  const totalHours = useMemo(() => {
    return Number(
      (data?.days ?? [])
        .flatMap((day) => day.shifts)
        .reduce((sum, shift) => {
          const start = new Date(shift.start).getTime();
          const end = new Date(shift.end).getTime();
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0)
        .toFixed(1),
    );
  }, [data]);

  const shiftIndex = useMemo(() => {
    const index = new Map<
      string,
      {
        id: string;
        employeeId: string;
        start: string;
        end: string;
        note?: string;
      }
    >();
    for (const day of data?.days ?? []) {
      for (const shift of day.shifts) {
        index.set(shift.id, {
          id: shift.id,
          employeeId: shift.employeeId,
          start: shift.start,
          end: shift.end,
          note: shift.note,
        });
      }
    }
    return index;
  }, [data]);

  const departmentOptions = useMemo(() => {
    const departments = Array.from(
      new Set((employees ?? []).map((e) => e.department).filter(Boolean)),
    ) as string[];
    return [
      { value: "all", label: "Tüm Departmanlar" },
      ...departments.map((d) => ({ value: d, label: d })),
    ];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (departmentFilter === "all") return employees ?? [];
    return (employees ?? []).filter((e) => e.department === departmentFilter);
  }, [departmentFilter, employees]);

  const availabilityHints = useMemo((): Record<string, Record<string, AvailabilityHintType>> => {
    const blocks = availabilityList ?? [];
    const out: Record<string, Record<string, AvailabilityHintType>> = {};
    const empIds = new Set((filteredEmployees ?? []).map((e) => e.id));
    for (const block of blocks) {
      if (!empIds.has(block.employeeId)) continue;
      const dayOfWeek = block.dayOfWeek;
      const startDate = block.startDate ? new Date(block.startDate).toISOString().slice(0, 10) : null;
      const endDate = block.endDate ? new Date(block.endDate).toISOString().slice(0, 10) : null;
      for (const day of data?.days ?? []) {
        const date = day.date;
        const d = new Date(`${date}T12:00:00.000Z`);
        const dow = d.getUTCDay();
        if (dow !== dayOfWeek) continue;
        if (startDate != null && date < startDate) continue;
        if (endDate != null && date > endDate) continue;
        if (!out[block.employeeId]) out[block.employeeId] = {};
        const existing = out[block.employeeId][date];
        const priority = { UNAVAILABLE: 3, PREFER_NOT: 2, AVAILABLE_ONLY: 1 };
        if (existing == null || priority[block.type] >= priority[existing]) {
          out[block.employeeId][date] = block.type as AvailabilityHintType;
        }
      }
    }
    return out;
  }, [availabilityList, filteredEmployees, data?.days]);

  const openCreate = useCallback((employeeId: string, date: string) => {
    setSelectedShift(undefined);
    setSelectedEmployeeId(employeeId);
    const start = localTimeToIso(date, "06:00");
    const end = localTimeToIso(date, "14:00");
    setSelectedShift({ id: "", employeeId, start, end });
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((shift: {
    id: string;
    employeeId: string;
    start: string;
    end: string;
    note?: string;
  }) => {
    setSelectedEmployeeId(shift.employeeId);
    setSelectedShift({
      id: shift.id,
      employeeId: shift.employeeId,
      start: shift.start,
      end: shift.end,
      note: shift.note,
    });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (payload: {
    employeeId: string;
    startTime: string;
    endTime: string;
    note?: string;
    forceOverride?: boolean;
  }) => {
    try {
      if (selectedShift?.id) {
        const result = await updateShift.mutateAsync({
          id: selectedShift.id,
          ...payload,
        });
        const warnings = result.warnings ?? [];
        setWarning(warnings.length > 0 ? warnings.join(", ") : null);
        notifications.show({
          title: "Başarılı",
          message: "Vardiya güncellendi.",
          color: "green",
        });
        setModalOpen(false);
        return;
      }
      const result = await createShift.mutateAsync(payload);
      const warnings = result.warnings ?? [];
      setWarning(warnings.length > 0 ? warnings.join(", ") : null);
      notifications.show({
        title: "Başarılı",
        message: "Vardiya oluşturuldu.",
        color: "green",
      });
      setModalOpen(false);
    } catch {
      notifications.show({
        title: "Hata",
        message: "Vardiya kaydedilemedi.",
        color: "red",
      });
    }
  }, [selectedShift, updateShift, createShift]);

  const handleMove = useCallback(async (payload: {
    shiftId: string;
    employeeId: string;
    targetDate: string;
  }) => {
    const shift = shiftIndex.get(payload.shiftId);
    if (!shift) return;
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const duration = end.getTime() - start.getTime();
    const localTime = isoToLocalTimeString(shift.start);
    const movedStart = new Date(localTimeToIso(payload.targetDate, localTime));
    const movedEnd = new Date(movedStart.getTime() + duration);

    try {
      const result = await updateShift.mutateAsync({
        id: shift.id,
        employeeId: payload.employeeId,
        startTime: movedStart.toISOString(),
        endTime: movedEnd.toISOString(),
      });
      const warnings = result.warnings ?? [];
      setWarning(warnings.length > 0 ? warnings.join(", ") : null);
      notifications.show({
        title: "Başarılı",
        message: "Vardiya taşındı.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Hata",
        message: "Vardiya taşınamadı.",
        color: "red",
      });
    }
  }, [shiftIndex, updateShift]);

  const closeWarning = useCallback(() => setWarning(null), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const openQuickCreate = useCallback(() => {
    setSelectedShift(undefined);
    setSelectedEmployeeId((employees ?? [])[0]?.id ?? "");
    setModalOpen(true);
  }, [employees]);

  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map((e) => ({
        value: e.id,
        label: e.user.name,
      })),
    [employees]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedShift?.id) return;
    try {
      await deleteShift.mutateAsync(selectedShift.id);
      setModalOpen(false);
      notifications.show({
        title: "Başarılı",
        message: "Vardiya iptal edildi.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Hata",
        message: "Vardiya iptal edilemedi.",
        color: "red",
      });
    }
  }, [selectedShift?.id, deleteShift]);

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <PageError message="Plan yüklenemedi." />;

  return (
    <Stack gap="sm">
      {/* ─── Toolbar ─── */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="xs" wrap="wrap">
          <Badge variant="light" size="sm">
            HAFTALIK PROGRAM
          </Badge>
          <Badge variant="light" size="sm">
            Çalışan: {filteredEmployees.length}
          </Badge>
          <Badge variant="light" size="sm">
            Vardiya: {totalShifts}
          </Badge>
          <Badge variant="light" size="sm">
            Saat: {totalHours}
          </Badge>
        </Group>
        <Group gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="default"
            onClick={() =>
              window.open(`/schedule/print?start=${weekStart}`, "_blank")
            }
          >
            Yazdır
          </Button>
          <Button
            size="xs"
            className="btn-gradient"
            disabled={!(employees ?? []).length}
            title={!(employees ?? []).length ? "Önce en az bir çalışan ekleyin." : undefined}
            onClick={openQuickCreate}
          >
            Vardiya Ekle
          </Button>
        </Group>
      </Group>

      {/* ─── Navigation ─── */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={() => setWeekStart((v) => shiftIsoDate(v, -7))}
          >
            Önceki
          </Button>
          <Title order={4}>{formatWeekRange(weekStart)}</Title>
          <Button
            size="xs"
            variant="light"
            onClick={() => setWeekStart((v) => shiftIsoDate(v, 7))}
          >
            Sonraki
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={() => setWeekStart(currentWeekStartIsoDate())}
          >
            Bugün
          </Button>
        </Group>
        <Select
          size="xs"
          w={180}
          data={departmentOptions}
          value={departmentFilter}
          onChange={(value) => setDepartmentFilter(value ?? "all")}
          placeholder="Departman"
        />
      </Group>

      {warning && (
        <Alert
          color="yellow"
          variant="light"
          title="Planlama Uyarısı"
          withCloseButton
          onClose={closeWarning}
        >
          {warning}
        </Alert>
      )}

      {/* ─── Grid ─── */}
      <WeeklyGrid
        employees={filteredEmployees}
        days={data.days}
        availabilityHints={availabilityHints}
        onCreate={openCreate}
        onEdit={openEdit}
        onMove={handleMove}
      />

      <ShiftModal
        opened={modalOpen}
        onClose={closeModal}
        employeeId={selectedEmployeeId}
        employees={employeeOptions}
        availabilityList={availabilityList ?? undefined}
        initial={
          selectedShift
            ? {
              start: selectedShift.start,
              end: selectedShift.end,
              note: selectedShift.note,
            }
            : undefined
        }
        onSubmit={handleSubmit}
        onDelete={selectedShift?.id ? handleDelete : undefined}
      />
    </Stack>
  );
}
