"use client";

import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Badge, Box, Button, Card, Group, ScrollArea, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import { getShiftStatusColor, getShiftStatusIcon, getShiftStatusLabel } from '../../lib/shift-status';
import { formatIstanbul } from '../../lib/time';

type Employee = { id: string; user: { name: string } };
type Shift = { id: string; employeeId: string; employeeName?: string; start: string; end: string; status: string };
type Day = { date: string; shifts: Shift[] };

type WeeklyGridProps = {
  employees: Employee[];
  days: Day[];
  onCreate: (employeeId: string, date: string) => void;
  onEdit: (shift: Shift) => void;
  onMove: (payload: { shiftId: string; employeeId: string; targetDate: string }) => void;
};

function formatDayHeader(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const text = date.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  });
  return text;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function shiftHours(start: string, end: string) {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  return Number(((endDate - startDate) / (1000 * 60 * 60)).toFixed(1));
}

function isToday(isoDate: string) {
  return new Date().toISOString().slice(0, 10) === isoDate;
}

function ShiftCard({ shift, onEdit }: { shift: Shift; onEdit: (shift: Shift) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: shift.id, data: shift });
  const StatusIcon = getShiftStatusIcon(shift.status);
  return (
    <Card
      className="surface-card interactive-card"
      withBorder
      radius="md"
      shadow="sm"
      ref={setNodeRef}
      p="sm"
      mb="xs"
      data-testid={`shift-card-${shift.id}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
        borderLeft: `4px solid var(--mantine-color-${getShiftStatusColor(shift.status)}-6)`
      }}
      {...listeners}
      {...attributes}
    >
      <Text size="sm" fw={700}>{formatIstanbul(shift.start)} - {formatIstanbul(shift.end)}</Text>
      <Text size="xs" c="dimmed" mt={2}>{shiftHours(shift.start, shift.end).toFixed(1)} saat</Text>
      <Group justify="space-between" mt={4}>
        <Badge
          size="sm"
          color={getShiftStatusColor(shift.status)}
          variant="light"
          leftSection={<StatusIcon size={12} />}
        >
          {getShiftStatusLabel(shift.status)}
        </Badge>
        <Button size="xs" variant="subtle" onClick={() => onEdit(shift)}>
          Düzenle
        </Button>
      </Group>
    </Card>
  );
}

function ShiftCell({
  employeeId,
  day,
  shifts,
  onCreate,
  onEdit
}: {
  employeeId: string;
  day: string;
  shifts: Shift[];
  onCreate: (employeeId: string, date: string) => void;
  onEdit: (shift: Shift) => void;
}) {
  const dropId = `${employeeId}::${day}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { employeeId, day } });

  return (
    <Box
      ref={setNodeRef}
      p="sm"
      data-testid={`drop-cell-${employeeId}-${day}`}
      style={{
        minWidth: 250,
        minHeight: 170,
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-gray-3)',
        background: isOver ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-body)'
      }}
    >
      <Button size="xs" variant="light" mb="xs" fullWidth data-testid={`create-shift-${employeeId}-${day}`} onClick={() => onCreate(employeeId, day)}>
        + Vardiya
      </Button>
      {shifts.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} onEdit={onEdit} />
      ))}
    </Box>
  );
}

export function WeeklyGrid({ employees, days, onCreate, onEdit, onMove }: WeeklyGridProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const [employeeId, targetDate] = String(over.id).split('::');
    onMove({ shiftId: String(active.id), employeeId, targetDate });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <ScrollArea>
        <Table withTableBorder highlightOnHover striped="odd" verticalSpacing="sm" horizontalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={260}>Çalışan</Table.Th>
              {days.map((day) => (
                <Table.Th key={day.date} style={{ background: isToday(day.date) ? 'var(--mantine-color-blue-light)' : undefined }}>
                  <Text fw={700}>{formatDayHeader(day.date)}</Text>
                </Table.Th>
              ))}
              <Table.Th w={130}>Toplam Saat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {employees.map((employee) => {
              const weeklyHours = days
                .flatMap((day) => day.shifts)
                .filter((shift) => shift.employeeId === employee.id)
                .reduce((sum, shift) => sum + shiftHours(shift.start, shift.end), 0);

              return (
                <Table.Tr key={employee.id}>
                  <Table.Td>
                    <Group align="flex-start" wrap="nowrap">
                      <ThemeIcon variant="light" radius="xl" size="lg">
                        {getInitials(employee.user.name)}
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={700}>{employee.user.name}</Text>
                        <Text size="xs" c="dimmed">#{employee.id.slice(0, 8)}</Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  {days.map((day) => (
                    <Table.Td key={`${employee.id}-${day.date}`} style={{ background: isToday(day.date) ? 'var(--mantine-color-blue-light)' : undefined }}>
                      <ShiftCell
                        employeeId={employee.id}
                        day={day.date}
                        shifts={day.shifts.filter((shift) => shift.employeeId === employee.id)}
                        onCreate={onCreate}
                        onEdit={onEdit}
                      />
                    </Table.Td>
                  ))}
                  <Table.Td>
                    <Badge variant="light" size="lg">{weeklyHours.toFixed(1)} saat</Badge>
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
