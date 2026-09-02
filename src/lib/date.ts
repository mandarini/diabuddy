const TIMEZONE = 'Europe/Athens';

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TIMEZONE,
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  });
}

export function getAthensDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
}

export function getAthensDateString(d: Date): string {
  const year = d.toLocaleString('en-GB', { year: 'numeric', timeZone: TIMEZONE });
  const month = d.toLocaleString('en-GB', { month: '2-digit', timeZone: TIMEZONE });
  const day = d.toLocaleString('en-GB', { day: '2-digit', timeZone: TIMEZONE });
  return `${year}-${month}-${day}`;
}

export function startOfDayForAthens(date: Date): Date {
  const dateStr = getAthensDateString(date);
  return new Date(`${dateStr}T00:00:00+03:00`);
}

export function endOfDayForAthens(date: Date): Date {
  const dateStr = getAthensDateString(date);
  return new Date(`${dateStr}T23:59:59.999+03:00`);
}

export function toLocalISO(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return getAthensDateString(a) === getAthensDateString(b);
}

export function relativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function formatTimeFromISO(iso: string): string {
  return formatTime(new Date(iso));
}

export function formatDateFromISO(iso: string): string {
  return formatDate(new Date(iso));
}

export function minutesAfterMeal(mealEatenAt: string, glucoseMeasuredAt: string): number {
  const diff = new Date(glucoseMeasuredAt).getTime() - new Date(mealEatenAt).getTime();
  return Math.round(diff / (1000 * 60));
}
