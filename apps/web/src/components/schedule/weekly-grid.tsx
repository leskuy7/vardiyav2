"use client";

import { memo, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Badge, Box, Button, Card, Group, Popover, ScrollArea, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { getShiftStatusColor, getShiftStatusIcon, getShiftStatusLabel } from '../../lib/shift-status';
import { formatTimeOnly } from '../../lib/time';

type Employee = { id: string; user: { name: string } };
type Shift = { id: string; employeeId: string; employeeName?: string; start: string; end: string; status: string };
type Leave = { id: string; employeeId: string; type: string; reason?: string | null };
type Day = { date: string; shifts: Shift[]; leaves?: Leave[] };

export type AvailabilityHintType = 'UNAVAILABLE' | 'PREFER_NOT' | 'AVAILABLE_ONLY';

type WeeklyGridProps = {
  employees: Employee[];
  days: Day[];
  onCreate: (employeeId: string, date: string) => void;
  onEdit: (shift: Shift & { note?: string }) => void;
  onMove: (payload: { shiftId: string; employeeId: string; targetDate: string }) => void;
  /** Per (employeeId, date) availability hint for the cell (e.g. from availability blocks). */
  availabilityHints?: Record<string, Record<string, AvailabilityHintType>>;
  scale?: number;
};

function ColorLegendPopover() {
  return (
    <Popover width={320} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconInfoCircle size={14} />}
        >
          Renk Açıklamaları
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={8}>
          <Text size="sm" fw={700}>Müsaitlik çizgileri</Text>
          <Group gap="xs" wrap="nowrap">
            <Box w={16} h={16} style={{ background: 'rgba(250, 82, 82, 0.16)', borderLeft: '5px solid var(--mantine-color-red-5)', borderRadius: 2 }} />
            <Text size="xs">Kırmızı: Müsait değil</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Box w={16} h={16} style={{ background: 'rgba(250, 176, 5, 0.16)', borderLeft: '5px solid var(--mantine-color-yellow-5)', borderRadius: 2 }} />
            <Text size="xs">Sarı: Tercih edilmez</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Box w={16} h={16} style={{ background: 'rgba(34, 197, 94, 0.12)', borderLeft: '5px solid var(--mantine-color-green-5)', borderRadius: 2 }} />
            <Text size="xs">Yeşil: Sadece belirli saatler</Text>
          </Group>

          <Text size="sm" fw={700} mt={4}>Vardiya durumları</Text>
          <Text size="xs">Rozet üzerindeki metin durumun ne olduğunu gösterir (Onay Bekliyor, Onaylı, vb.).</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function formatDayHeader(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function getInitials(fullName: string) {
  return fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function shiftHours(start: string, end: string) {
  return Number(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000).toFixed(1));
}

function isToday(isoDate: string) {
  return new Date().toISOString().slice(0, 10) === isoDate;
}

/* ─── Compact Shift Card ─── */
function ShiftCard({ shift, onEdit }: { shift: Shift; onEdit: (s: Shift) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: shift.id, data: shift });
  const StatusIcon = getShiftStatusIcon(shift.status);

  return (
    <Card
      withBorder
      radius="sm"
      ref={setNodeRef}
      p={6}
      mb={4}
      data-testid={`shift-card-${shift.id}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        borderLeft: `4px solid var(--mantine-color-${getShiftStatusColor(shift.status)}-6)`,
        fontSize: '0.75rem',
      }}
      {...listeners}
      {...attributes}
    >
      <Text size="xs" fw={700} lh={1.2}>{formatTimeOnly(shift.start)} – {formatTimeOnly(shift.end)}</Text>
      <Text size="xs" c="dimmed" lh={1.2}>{shiftHours(shift.start, shift.end)} saat</Text>
      <Group justify="space-between" mt={2} gap={4}>
        <Badge size="xs" color={getShiftStatusColor(shift.status)} variant="light" leftSection={<StatusIcon size={10} />}>
          {getShiftStatusLabel(shift.status)}
        </Badge>
        <Button size="compact-xs" variant="subtle" onClick={() => onEdit(shift)} fz={10}>
          Düzenle
        </Button>
      </Group>
    </Card>
  );
}

function availabilityHintStyle(hint: AvailabilityHintType | undefined): { backgroundColor?: string; borderLeft?: string } {
  if (!hint) return {};
  if (hint === 'UNAVAILABLE') return { backgroundColor: 'rgba(250, 82, 82, 0.08)', borderLeft: '5px solid var(--mantine-color-red-5)' };
  if (hint === 'PREFER_NOT') return { backgroundColor: 'rgba(250, 176, 5, 0.08)', borderLeft: '5px solid var(--mantine-color-yellow-5)' };
  if (hint === 'AVAILABLE_ONLY') return { backgroundColor: 'rgba(34, 197, 94, 0.06)', borderLeft: '5px solid var(--mantine-color-green-5)' };
  return {};
}

/* ─── Drop Cell ─── */
function ShiftCell({
  employeeId,
  day,
  shifts,
  leaves,
  availabilityHint,
  onCreate,
  onEdit,
}: {
  employeeId: string;
  day: string;
  shifts: Shift[];
  leaves?: Leave[];
  availabilityHint?: AvailabilityHintType;
  onCreate: (employeeId: string, date: string) => void;
  onEdit: (shift: Shift) => void;
}) {
  const employeeLeaves = leaves?.filter((l) => l.employeeId === employeeId) || [];

  if (employeeLeaves.length > 0) {
    const leave = employeeLeaves[0];
    let label = "İzinli";
    if (leave.type === "ANNUAL") label = "Yıllık İzin";
    else if (leave.type === "SICK") label = "Raporlu";
    else if (leave.type === "UNPAID") label = "Ücretsiz İzin";

    return (
      <Box
        p={4}
        style={{
          minWidth: 130,
          minHeight: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(134, 142, 150, 0.1)",
          borderRadius: "var(--mantine-radius-sm)",
          border: "1px dashed var(--mantine-color-gray-4)",
        }}
      >
        <Badge color="gray" variant="filled" size="sm" title={leave.reason || label}>
          {label}
        </Badge>
      </Box>
    );
  }

  const dropId = `${employeeId}::${day}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { employeeId, day } });

  const hintStyle = availabilityHintStyle(availabilityHint);

  return (
    <Box
      ref={setNodeRef}
      p={4}
      data-testid={`drop-cell-${employeeId}-${day}`}
      style={{
        minWidth: 130,
        minHeight: 80,
        borderRadius: 'var(--mantine-radius-sm)',
        border: '1px solid var(--glass-border)',
        background: isOver ? 'rgba(102, 126, 234, 0.12)' : (hintStyle.backgroundColor ?? 'transparent'),
        borderLeft: hintStyle.borderLeft,
        transition: 'background 0.15s ease',
      }}
      title={availabilityHint === 'UNAVAILABLE' ? 'Müsait değil' : availabilityHint === 'PREFER_NOT' ? 'Tercih edilmez' : availabilityHint === 'AVAILABLE_ONLY' ? 'Sadece belirli saatler' : undefined}
    >
      <Button
        size="compact-xs"
        variant="light"
        fullWidth
        mb={4}
        fz={10}
        data-testid={`create-shift-${employeeId}-${day}`}
        onClick={() => onCreate(employeeId, day)}
      >
        + Vardiya
      </Button>
      {shifts.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} onEdit={onEdit} />
      ))}
    </Box>
  );
}

/* ─── Daily Mobile View ─── */
function DailyScheduleView({ employees, days, onCreate, onEdit, availabilityHints }: WeeklyGridProps) {
  const [selectedDate, setSelectedDate] = useState<string>(days[0]?.date || "");

  if (!days || days.length === 0) return null;
  const activeDate = selectedDate || days[0].date;
  const activeDay = days.find((d) => d.date === activeDate) || days[0];

  return (
    <Stack gap="md" mt="sm">
      <ScrollArea w="100%" type="never">
        <Group wrap="nowrap" gap="xs" pb="xs">
          {days.map((day) => {
            const isSelected = day.date === activeDate;
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString("tr-TR", { weekday: "short" });
            const dayNum = dateObj.getDate();
            return (
              <Button
                key={day.date}
                variant={isSelected ? "filled" : "light"}
                color={isSelected ? "indigo" : "gray"}
                onClick={() => setSelectedDate(day.date)}
                size="xs"
                radius="md"
                style={{ display: "flex", flexDirection: "column", gap: 2, height: 'auto', padding: '6px 16px' }}
              >
                <Text size="xs" fw={isSelected ? 700 : 500}>{dayName}</Text>
                <Text size="lg" fw={700}>{dayNum}</Text>
              </Button>
            );
          })}
        </Group>
      </ScrollArea>

      <Stack gap="xs">
        {employees.map((employee) => {
          const empShifts = activeDay.shifts.filter((s) => s.employeeId === employee.id);
          const hint = availabilityHints?.[employee.id]?.[activeDay.date];

          return (
            <Card key={employee.id} withBorder radius="md" p="sm">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon variant="light" radius="xl" size="md">
                    <Text size="xs" fw={700}>{getInitials(employee.user.name)}</Text>
                  </ThemeIcon>
                  <Text fw={600} size="sm">{employee.user.name}</Text>
                </Group>
              </Group>

              <Box mt="xs">
                <ShiftCell
                  employeeId={employee.id}
                  day={activeDay.date}
                  shifts={empShifts}
                  leaves={activeDay.leaves}
                  availabilityHint={hint}
                  onCreate={onCreate}
                  onEdit={onEdit}
                />
              </Box>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

/* ─── Weekly Grid ─── */
function WeeklyGridComponent(props: WeeklyGridProps) {
  const { employees, days, onCreate, onEdit, onMove, availabilityHints } = props;
  const isMobile = useMediaQuery('(max-width: 62em)');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const [employeeId, targetDate] = String(over.id).split('::');
    onMove({ shiftId: String(active.id), employeeId, targetDate });
  }

  if (isMobile) {
    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Stack gap="sm">
          <Group justify="flex-end">
            <ColorLegendPopover />
          </Group>
          <DailyScheduleView {...props} />
        </Stack>
      </DndContext>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Stack gap="sm">
        <Group justify="flex-end">
          <ColorLegendPopover />
        </Group>
        <ScrollArea type="always" scrollbars="x" offsetScrollbars>
          <Table
            withTableBorder
            highlightOnHover
            verticalSpacing={4}
            horizontalSpacing={4}
            style={{ tableLayout: 'fixed', minWidth: employees.length > 0 ? 130 * days.length + 200 : undefined }}
          >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 160, position: 'sticky', left: 0, zIndex: 2, background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
                <Text size="xs" fw={700} tt="uppercase">Çalışan</Text>
              </Table.Th>
              {days.map((day) => (
                <Table.Th
                  key={day.date}
                  style={{
                    background: isToday(day.date) ? 'rgba(102, 126, 234, 0.12)' : undefined,
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" fw={700}>{formatDayHeader(day.date)}</Text>
                </Table.Th>
              ))}
              <Table.Th style={{ width: 80, textAlign: 'center' }}>
                <Text size="xs" fw={700} tt="uppercase">Toplam</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {employees.map((employee) => {
              const weeklyHours = days
                .flatMap((d) => d.shifts)
                .filter((s) => s.employeeId === employee.id)
                .reduce((sum, s) => sum + shiftHours(s.start, s.end), 0);

              return (
                <Table.Tr key={employee.id}>
                  <Table.Td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
                    <Group align="center" wrap="nowrap" gap={6}>
                      <ThemeIcon variant="light" radius="xl" size="sm">
                        <Text size="xs" fw={700}>{getInitials(employee.user.name)}</Text>
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="xs" fw={700} truncate style={{ maxWidth: 100 }}>{employee.user.name}</Text>
                        <Text size="10px" c="dimmed">#{employee.id.slice(0, 6)}</Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  {days.map((day) => (
                    <Table.Td
                      key={`${employee.id}-${day.date}`}
                      style={{ background: isToday(day.date) ? 'rgba(102, 126, 234, 0.06)' : undefined, verticalAlign: 'top' }}
                    >
                      <ShiftCell
                        employeeId={employee.id}
                        day={day.date}
                        shifts={day.shifts.filter((s) => s.employeeId === employee.id)}
                        leaves={day.leaves}
                        availabilityHint={availabilityHints?.[employee.id]?.[day.date]}
                        onCreate={onCreate}
                        onEdit={onEdit}
                      />
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    {(() => {
                      const trLimit = (employee as any).maxWeeklyHours || 45;
                      const isBreach = weeklyHours > trLimit;

                      if (isBreach) {
                        return (
                          <Badge variant="filled" color="red" size="sm" title={`${trLimit} saat sınırı aşıldı!`}>
                            {weeklyHours.toFixed(1)}s (Aşım)
                          </Badge>
                        );
                      }

                      return <Badge variant="light" size="sm">{weeklyHours.toFixed(1)}s</Badge>;
                    })()}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </DndContext>
  );
}

export const WeeklyGrid = memo(WeeklyGridComponent);
