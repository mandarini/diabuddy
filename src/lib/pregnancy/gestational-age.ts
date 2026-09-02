export interface GestationalAge {
  weeks: number;
  days: number;
  formatted: string;
}

export function getGestationalAge(date: Date, dueDate: Date): GestationalAge | null {
  const diff = dueDate.getTime() - date.getTime();
  if (diff < 0) {
    return { weeks: 40, days: 0, formatted: '40w0d' };
  }
  const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, formatted: `${weeks}w${days}d` };
}

export function daysUntilDueDate(dueDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
