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
