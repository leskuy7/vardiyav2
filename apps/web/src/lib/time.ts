export function formatIstanbul(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour12: false
  });
}

export function formatTimeOnly(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'short'
  });
}

export function currentWeekStartIsoDate() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}
