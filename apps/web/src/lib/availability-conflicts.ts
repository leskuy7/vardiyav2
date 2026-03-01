import type { AvailabilityItem } from "../hooks/use-availability";

export type AvailabilityConflict = {
  type: "UNAVAILABLE" | "PREFER_NOT" | "AVAILABLE_ONLY";
  label: string;
  note?: string | null;
};

function toMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function inDateRange(d: Date, startDate?: string | null, endDate?: string | null): boolean {
  const dateStr = d.toISOString().slice(0, 10);
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

/**
 * Seçilen vardiya (startAt, endAt) ile çalışanın müsaitlik bloklarını karşılaştırır;
 * çakışan bloklar için kullanıcıya gösterilecek liste döner.
 */
export function getAvailabilityConflicts(
  availabilityList: AvailabilityItem[] | undefined,
  employeeId: string,
  startAt: Date | null,
  endAt: Date | null
): AvailabilityConflict[] {
  if (!availabilityList?.length || !employeeId || !startAt || !endAt) return [];

  const conflicts: AvailabilityConflict[] = [];
  const blocks = availabilityList.filter((b) => b.employeeId === employeeId);
  if (blocks.length === 0) return [];

  const day1 = startAt.getUTCDay();
  const shiftStart1 = toMinutes(startAt);
  const isCrossDay =
    startAt.getUTCDate() !== endAt.getUTCDate() ||
    startAt.getUTCMonth() !== endAt.getUTCMonth() ||
    startAt.getUTCFullYear() !== endAt.getUTCFullYear();
  const shiftEnd1 = isCrossDay ? 24 * 60 : toMinutes(endAt);

  for (const block of blocks.filter((b) => b.dayOfWeek === day1)) {
    if (!inDateRange(startAt, block.startDate, block.endDate)) continue;

    const blockStart = block.startTime ? parseTimeToMinutes(block.startTime) : 0;
    const blockEnd = block.endTime ? parseTimeToMinutes(block.endTime) : 24 * 60;
    if (!intervalsOverlap(shiftStart1, shiftEnd1, blockStart, blockEnd)) continue;

    const label =
      block.type === "UNAVAILABLE"
        ? "Bu tarih/saatte çalışan “Müsait değil” olarak işaretlemiş."
        : block.type === "PREFER_NOT"
          ? "Bu tarih/saatte çalışan “Tercih etmiyorum” olarak işaretlemiş."
          : "Vardiya, çalışanın “Sadece belirli saatler” aralığıyla kısmen çakışıyor.";
    conflicts.push({ type: block.type, label, note: block.note });
  }

  if (isCrossDay) {
    const day2 = endAt.getUTCDay();
    const shiftStart2 = 0;
    const shiftEnd2 = toMinutes(endAt);

    for (const block of blocks.filter((b) => b.dayOfWeek === day2)) {
      if (!inDateRange(endAt, block.startDate, block.endDate)) continue;

      const blockStart = block.startTime ? parseTimeToMinutes(block.startTime) : 0;
      const blockEnd = block.endTime ? parseTimeToMinutes(block.endTime) : 24 * 60;
      if (!intervalsOverlap(shiftStart2, shiftEnd2, blockStart, blockEnd)) continue;

      const label =
        block.type === "UNAVAILABLE"
          ? "Bitiş gününde çalışan “Müsait değil” olarak işaretlemiş."
          : block.type === "PREFER_NOT"
            ? "Bitiş gününde çalışan “Tercih etmiyorum” olarak işaretlemiş."
            : "Bitiş gününde “Sadece belirli saatler” aralığıyla çakışma var.";
      conflicts.push({ type: block.type, label, note: block.note });
    }
  }

  return conflicts;
}
