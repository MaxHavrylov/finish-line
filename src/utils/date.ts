export function isWithinDays(iso: string, days: number): boolean {
  const dt = new Date(iso).getTime();
  const now = Date.now();
  const rangeEnd = now + days * 24 * 60 * 60 * 1000;
  return dt <= rangeEnd && dt >= now;
}