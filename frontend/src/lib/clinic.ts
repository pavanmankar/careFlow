export const APPOINTMENT_TYPES = [
  'Consultation',
  'Follow-up',
  'Check-up',
  'Procedure',
] as const;

export const APPOINTMENT_STATUSES = ['Confirmed', 'In progress', 'Completed', 'Cancelled', 'Expired'] as const;

export const TYPE_COLORS: Record<string, string> = {
  Consultation: '#14b8a6',
  'Follow-up': '#0ea5e9',
  'Check-up': '#10b981',
  Procedure: '#f59e0b',
};

export const STATUS_COLORS: Record<string, string> = {
  Confirmed: '#4f8fd9',
  'In progress': '#3aa0c8',
  Completed: '#34a87a',
  Cancelled: '#e25555',
  Expired: '#e8a04a',
};

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? '#0f766e';
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CLINIC_START_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export interface ClinicDoctor {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  specialty: string;
  status: string;
}

export interface ClinicPatient {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  gender: string | null;
  bloodGroup: string | null;
  dateOfBirth: number | null;
  age: number | null;
  lastVisitAt: number | null;
}

export interface ClinicAppointment {
  id: string;
  type: string;
  status: string;
  startsAt: number;
  endsAt: number;
  patient: {
    id: string;
    name: string;
    phone: string;
    gender: string | null;
    bloodGroup: string | null;
  };
  doctor: { id: string; name: string; specialty: string };
}

export interface SlotOption {
  startsAt: number;
  endsAt: number;
  label: string;
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

export function ymdInTimeZone(ms: number, timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

export function isPastYmd(ymd: string, timeZone = 'Asia/Kolkata') {
  return ymd < ymdInTimeZone(Date.now(), timeZone);
}

export function isPastSlot(startsAt: number) {
  return startsAt <= Date.now();
}

/** Confirmed visits open only during the slot; in-progress/completed stay open; expired/cancelled stay closed. */
export function canOpenVisit(appointment: {
  status: string;
  startsAt: number;
  endsAt: number;
}) {
  if (appointment.status === 'Expired' || appointment.status === 'Cancelled') {
    return false;
  }
  if (appointment.status === 'In progress' || appointment.status === 'Completed') {
    return true;
  }
  const now = Date.now();
  return now >= appointment.startsAt && now < appointment.endsAt;
}

export function hourInTimeZone(ms: number, timeZone = 'Asia/Kolkata') {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(ms))
      .find((part) => part.type === 'hour')?.value ?? 0,
  );
}

export function zonedLocalToUtcMs(ymd: string, hour: number, timeZone = 'Asia/Kolkata') {
  const [year, month, day] = ymd.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, 0, 0);
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

export function formatClinicDate(ms: number, timeZone = 'Asia/Kolkata') {
  return new Date(ms).toLocaleDateString('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatClinicDayHeading(date: Date, timeZone = 'Asia/Kolkata') {
  return date.toLocaleDateString('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ageFromDob(ms: number | null | undefined) {
  if (ms == null) {
    return null;
  }
  const birth = new Date(ms);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function ageLabel(age: number | null | undefined) {
  return age == null ? '—' : `${age} years`;
}
