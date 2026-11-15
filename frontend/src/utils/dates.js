// Calendar validation without Date.parse's silent day/month rollover.
export function calendarDay(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  const year = Number(value.slice(0, 4)), month = Number(value.slice(4, 6)), day = Number(value.slice(6));
  if (year < 1) return null;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() / 86400000 : null;
}
export function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.test(value)) return false;
  return calendarDay(value.slice(0, 10).replaceAll('-', '')) !== null;
}
export function validPeriod(period) {
  const first = calendarDay(period?.inicio), last = calendarDay(period?.fin);
  return first !== null && last !== null && first <= last;
}
