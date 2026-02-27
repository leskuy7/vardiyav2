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
import { useMemo, useState } from "react";
import { PageError, PageLoading } from "../../../components/page-states";
import { useEmployees } from "../../../hooks/use-employees";
import { useShiftsActions, useWeeklySchedule } from "../../../hooks/use-shifts";
import { currentWeekStartIsoDate } from "../../../lib/time";
import { ShiftModal } from "../../../components/schedule/shift-modal";
import { WeeklyGrid } from "../../../components/schedule/weekly-grid";

function shiftIsoDate(isoDate: string, days: number) {
  const value = new Date(`${isoDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatWeekRange(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const startText = start.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
  });
  const endText = end.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startText} - ${endText}`;
}

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

  function openCreate(employeeId: string, date: string) {
    setSelectedShift(undefined);
    setSelectedEmployeeId(employeeId);
    const start = new Date(`${date}T06:00:00.000Z`).toISOString();
    const end = new Date(`${date}T14:00:00.000Z`).toISOString();
    setSelectedShift({ id: "", employeeId, start, end });
    setModalOpen(true);
  }

  function openEdit(shift: {
    id: string;
    employeeId: string;
    start: string;
    end: string;
  }) {
    setSelectedEmployeeId(shift.employeeId);
    setSelectedShift({
      id: shift.id,
      employeeId: shift.employeeId,
      start: shift.start,
      end: shift.end,
    });
    setModalOpen(true);
  }

  async function handleSubmit(payload: {
    employeeId: string;
    startTime: string;
    endTime: string;
    note?: string;
    forceOverride?: boolean;
  }) {
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
  }

  async function handleMove(payload: {
    shiftId: string;
    employeeId: string;
    targetDate: string;
  }) {
    const shift = shiftIndex.get(payload.shiftId);
    if (!shift) return;
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const duration = end.getTime() - start.getTime();
    const timePart = start.toISOString().slice(11, 19);
    const movedStart = new Date(`${payload.targetDate}T${timePart}.000Z`);
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
  }

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
            onClick={() => {
              setSelectedShift(undefined);
              setSelectedEmployeeId((employees ?? [])[0]?.id ?? "");
              setModalOpen(true);
            }}
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
          onClose={() => setWarning(null)}
        >
          {warning}
        </Alert>
      )}

      {/* ─── Grid ─── */}
      <WeeklyGrid
        employees={filteredEmployees}
        days={data.days}
        onCreate={openCreate}
        onEdit={(shift) =>
          openEdit({
            id: shift.id,
            employeeId: shift.employeeId,
            start: shift.start,
            end: shift.end,
          })
        }
        onMove={handleMove}
      />

      <ShiftModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeId={selectedEmployeeId}
        employees={(employees ?? []).map((e) => ({
          value: e.id,
          label: e.user.name,
        }))}
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
        onDelete={
          selectedShift?.id
            ? async () => {
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
              }
            : undefined
        }
      />
    </Stack>
  );
}
