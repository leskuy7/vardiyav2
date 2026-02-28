"use client";

import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Badge, Box, Button, Card, Group, ScrollArea, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import { getShiftStatusColor, getShiftStatusIcon, getShiftStatusLabel } from '../../lib/shift-status';
import { formatIstanbul } from '../../lib/time';

type Employee = { id: string; user: { name: string } };
type Shift = { id: string; employeeId: string; employeeName?: string; start: string; end: string; status: string };
type Leave = { id: string; employeeId: string; type: string; reason?: string | null };
type Day = { date: string; shifts: Shift[]; leaves?: Leave[] };

type WeeklyGridProps = {
  employees: Employee[];
  days: Day[];
  onCreate: (employeeId: string, date: string) => void;
  onEdit: (shift: Shift & { note?: string }) => void;
  onMove: (payload: { shiftId: string; employeeId: string; targetDate: string }) => void;
  scale?: number;
};

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
        borderLeft: `3px solid var(--mantine-color-${getShiftStatusColor(shift.status)}-6)`,
        fontSize: '0.75rem',
      }}
      {...listeners}
      {...attributes}
    >
      <Text size="xs" fw={700} lh={1.2}>{formatIstanbul(shift.start)} - {formatIstanbul(shift.end)}</Text>
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

/* ─── Drop Cell ─── */
function ShiftCell({
  employeeId,
  day,
  shifts,
  leaves,
  onCreate,
  onEdit,
}: {
  employeeId: string;
  day: string;
  shifts: Shift[];
  leaves?: Leave[];
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
        background: isOver ? 'rgba(102, 126, 234, 0.12)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
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

/* ─── Weekly Grid ─── */
export function WeeklyGrid({ employees, days, onCreate, onEdit, onMove }: WeeklyGridProps) {
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
    </DndContext>
  );
}
