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
