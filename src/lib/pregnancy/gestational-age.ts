export interface GestationalAge {
  weeks: number;
  days: number;
  formatted: string;
}

export function getGestationalAge(date: Date, dueDate: Date): GestationalAge {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const daysRemaining = Math.round((due.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.max(0, 280 - daysRemaining);
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
