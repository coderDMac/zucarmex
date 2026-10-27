import { Frequency } from './types';
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-MX', {
    ...(options ?? { day: 'numeric', month: 'short', year: 'numeric' }),
    timeZone: 'America/Mazatlan',
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
export function nextDate(date: string, frequency: Frequency) {
  if (frequency !== 'monthly') return addDays(date, frequency === 'weekly' ? 7 : 15);
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function advanceSchedule(date: string, frequency: Frequency, now = today()) {
  let next = nextDate(date, frequency);
  while (next <= now) next = nextDate(next, frequency);
  return next;
}
export function validateFutureDate(date: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
    date <= today()
  )
    throw new Error('Selecciona una fecha futura válida.');
}

export function businessDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
