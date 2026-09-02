export interface Stats {
  n: number;
  average: number;
  median: number;
  min: number;
  max: number;
}

export function computeStats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
  return {
    n,
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    min: sorted[0],
    max: sorted[n - 1],
  };
}
