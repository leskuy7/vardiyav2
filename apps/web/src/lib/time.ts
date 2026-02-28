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

/**
 * ISO string'i verilen timezone'da "HH:mm" olarak döndürür (localTimeToIso ile eşleşir).
 */
export function isoToLocalTimeString(
  iso: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = new Date(iso);
  const h = d.toLocaleString('en-CA', { timeZone, hour: '2-digit', hour12: false });
  const m = d.toLocaleString('en-CA', { timeZone, minute: '2-digit', hour12: false });
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
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

const DEFAULT_TIMEZONE = "Europe/Istanbul";

/** Europe/Istanbul UTC offset in minutes (fixed +3, no DST since 2016). */
const ISTANBUL_UTC_OFFSET_MINUTES = 180;

/**
 * Verilen tarih (YYYY-MM-DD) ve yerel saat (HH:mm) için timezone'a göre ISO string üretir.
 * Varsayılan: Europe/Istanbul (UTC+3).
 */
export function localTimeToIso(
  date: string,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const localMinutes = h * 60 + m;
  const midnightUtc = new Date(`${date}T00:00:00.000Z`).getTime();
  const offsetMinutes =
    timeZone === "Europe/Istanbul"
      ? ISTANBUL_UTC_OFFSET_MINUTES
      : getTimezoneOffsetMinutes(date, timeZone);
  const utcMs =
    midnightUtc + localMinutes * 60 * 1000 - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function getTimezoneOffsetMinutes(date: string, timeZone: string): number {
  const probe = new Date(`${date}T12:00:00.000Z`);
  const utcHour = 12;
  const localStr = probe.toLocaleString("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [lh, lm] = localStr.split(":").map(Number);
  const localMins = lh * 60 + (lm ?? 0);
  const utcMins = utcHour * 60;
  return localMins - utcMins;
}
