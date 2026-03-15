export function parseWeekStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

/** Current week start (Monday) in YYYY-MM-DD (UTC). */
export function currentWeekStartIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  return toIsoDate(monday);
}

const ISTANBUL_UTC_OFFSET_MINUTES = 180;

export function istanbulDateStartUtc(value: string) {
  const utcMidnightMs = Date.parse(`${value}T00:00:00.000Z`);
  return new Date(utcMidnightMs - ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000);
}

export function istanbulDateEndUtc(value: string) {
  return new Date(istanbulDateStartUtc(value).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function istanbulLocalTimeToUtcDate(date: string, time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const utcMidnightMs = Date.parse(`${date}T00:00:00.000Z`);
  const utcMs =
    utcMidnightMs +
    (hours * 60 + minutes) * 60 * 1000 -
    ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}
