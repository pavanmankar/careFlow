import { DEFAULT_CLINIC_HOURS } from '@/shared/types';

export function clinicHoursFromSettings(settings: unknown): { openTime: string; closeTime: string } {
  const row = settings && typeof settings === 'object' && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const openTime = typeof row.openTime === 'string' && /^\d{2}:\d{2}$/.test(row.openTime) ? row.openTime : DEFAULT_CLINIC_HOURS.openTime;
  const closeTime = typeof row.closeTime === 'string' && /^\d{2}:\d{2}$/.test(row.closeTime) ? row.closeTime : DEFAULT_CLINIC_HOURS.closeTime;
  return { openTime, closeTime };
}

export function formatClockHour(hour: number) {
  if (hour === 0) {
    return '12 AM';
  }
  if (hour === 12) {
    return '12 PM';
  }
  if (hour < 12) {
    return `${hour} AM`;
  }
  return `${hour - 12} PM`;
}

export function formatSlotLabel(startHour: number) {
  return `${formatClockHour(startHour)} – ${formatClockHour(startHour + 1)}`;
}

export function zonedLocalToUtcMs(ymd: string, hour: number, minute: number, timeZone: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utc));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const tzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return utc - (tzAsUtc - utc);
}

export function ymdInTimeZone(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function hourInTimeZone(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
}

function parseHour(value: string) {
  const [hour] = value.split(':').map(Number);
  return hour;
}

export function clinicStartHours(openTime: string, closeTime: string) {
  const start = parseHour(openTime);
  const end = parseHour(closeTime);
  const hours: number[] = [];
  for (let hour = start; hour < end; hour += 1) {
    hours.push(hour);
  }
  return hours;
}

export function hourSlotsForDate(ymd: string, timeZone: string, openTime: string, closeTime: string) {
  return clinicStartHours(openTime, closeTime).map((hour) => {
    const startsAt = zonedLocalToUtcMs(ymd, hour, 0, timeZone);
    const endsAt = zonedLocalToUtcMs(ymd, hour + 1, 0, timeZone);
    return { startsAt, endsAt, hour, label: formatSlotLabel(hour) };
  });
}
