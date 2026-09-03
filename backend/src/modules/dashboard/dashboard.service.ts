import { and, count, eq, gte, isNull, lt, notInArray } from 'drizzle-orm';
import { APPOINTMENT_STATUSES, ERROR_CODES } from '@/shared/types';
import { db } from '@/db/client';
import { appointmentCharges, appointments, businesses, locations, patients } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getLocationId, getRequestContext } from '@/lib/context';
import { utcNowMs } from '@/lib/time';
import { ymdInTimeZone, zonedLocalToUtcMs } from '@/lib/clinic-hours';

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 730;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AGE_GROUPS = ['0-18', '19-35', '36-50', '51+'] as const;

export type DashboardPeriod = 'current' | 'last' | '3m' | '6m' | '1y' | 'custom';

export type DashboardQuery = {
  period?: DashboardPeriod;
  from?: string;
  to?: string;
};

type ClinicRange = {
  period: DashboardPeriod;
  from: string;
  to: string;
  startMs: number;
  endMs: number;
  timeZone: string;
  tenantId: string;
  locationId: string | null;
};

type TimeBucket = { date: string; label: string; start: number; end: number };

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

function shiftYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function addMonthsYmd(ymd: string, months: number) {
  const [year, month] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}-01`;
}

function subtractMonthsYmd(ymd: string, months: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 - months, day));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function inclusiveDays(fromYmd: string, toYmd: string) {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS) + 1;
}

function dayLabelFromYmd(ymd: string) {
  const [, month, day] = ymd.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function monthLabelFromYmd(ymd: string, includeYear: boolean) {
  const [year, month] = ymd.split('-').map(Number);
  const label = MONTHS[month - 1];
  if (!includeYear) {
    return label;
  }
  return `${label} ${String(year).slice(-2)}`;
}

function ageFromDob(dob: Date | null) {
  if (!dob) {
    return null;
  }
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const month = today.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

function ageBucket(age: number | null): (typeof AGE_GROUPS)[number] | null {
  if (age === null || age < 0) {
    return null;
  }
  if (age <= 18) {
    return '0-18';
  }
  if (age <= 35) {
    return '19-35';
  }
  if (age <= 50) {
    return '36-50';
  }
  return '51+';
}

function bucketsForRange(fromYmd: string, toYmd: string, timeZone: string): TimeBucket[] {
  const spanDays = inclusiveDays(fromYmd, toYmd);
  const buckets: TimeBucket[] = [];

  if (spanDays <= 62) {
    for (let ymd = fromYmd; ymd <= toYmd; ymd = shiftYmd(ymd, 1)) {
      const next = shiftYmd(ymd, 1);
      buckets.push({
        date: ymd,
        label: dayLabelFromYmd(ymd),
        start: zonedLocalToUtcMs(ymd, 0, 0, timeZone),
        end: zonedLocalToUtcMs(next, 0, 0, timeZone),
      });
    }
    return buckets;
  }

  if (spanDays <= 180) {
    for (let ymd = fromYmd; ymd <= toYmd; ymd = shiftYmd(ymd, 7)) {
      const next = shiftYmd(ymd, 7) <= toYmd ? shiftYmd(ymd, 7) : shiftYmd(toYmd, 1);
      buckets.push({
        date: ymd,
        label: dayLabelFromYmd(ymd),
        start: zonedLocalToUtcMs(ymd, 0, 0, timeZone),
        end: zonedLocalToUtcMs(next, 0, 0, timeZone),
      });
    }
    return buckets;
  }

  const includeYear = fromYmd.slice(0, 4) !== toYmd.slice(0, 4);
  for (let ymd = fromYmd; ymd <= toYmd; ) {
    const monthStart = `${ymd.slice(0, 7)}-01`;
    const nextMonth = addMonthsYmd(monthStart, 1);
    const endYmd = nextMonth <= toYmd ? nextMonth : shiftYmd(toYmd, 1);
    buckets.push({
      date: ymd,
      label: monthLabelFromYmd(ymd, includeYear),
      start: zonedLocalToUtcMs(ymd, 0, 0, timeZone),
      end: zonedLocalToUtcMs(endYmd, 0, 0, timeZone),
    });
    ymd = endYmd;
  }
  return buckets;
}

async function clinicRange(query: DashboardQuery): Promise<ClinicRange> {
  const tenantId = requireTenant();
  const locationId = getLocationId();
  const [business, location] = await Promise.all([
    db.query.businesses.findFirst({
      where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
    }),
    locationId
      ? db.query.locations.findFirst({
          where: and(eq(locations.id, locationId), eq(locations.tenantId, tenantId), isNull(locations.deletedAt)),
        })
      : Promise.resolve(null),
  ]);
  const timeZone = location?.timezone || business?.timezone || 'Asia/Kolkata';
  const today = ymdInTimeZone(utcNowMs(), timeZone);
  const period = query.period ?? 'current';
  let from = query.from;
  let to = query.to;

  if (period === 'custom') {
    if (!from || !to) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Custom range needs from and to dates.', 400);
    }
  } else if (period === 'current') {
    from = `${today.slice(0, 7)}-01`;
    to = shiftYmd(addMonthsYmd(from, 1), -1);
  } else if (period === 'last') {
    const firstThisMonth = `${today.slice(0, 7)}-01`;
    to = shiftYmd(firstThisMonth, -1);
    from = `${to.slice(0, 7)}-01`;
  } else {
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    from = subtractMonthsYmd(today, months);
    to = today;
  }

  if (from > to) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'From date must be on or before To date.', 400);
  }
  if (inclusiveDays(from, to) > MAX_RANGE_DAYS) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Date range cannot exceed 2 years.', 400);
  }

  return {
    period,
    from,
    to,
    startMs: zonedLocalToUtcMs(from, 0, 0, timeZone),
    endMs: zonedLocalToUtcMs(shiftYmd(to, 1), 0, 0, timeZone),
    timeZone,
    tenantId,
    locationId,
  };
}

function rangeMeta(range: ClinicRange) {
  return { period: range.period, from: range.from, to: range.to };
}

function appointmentWhere(range: ClinicRange) {
  return and(
    eq(appointments.tenantId, range.tenantId),
    isNull(appointments.deletedAt),
    gte(appointments.startsAt, BigInt(range.startMs)),
    lt(appointments.startsAt, BigInt(range.endMs)),
    ...(range.locationId ? [eq(appointments.locationId, range.locationId)] : []),
  );
}

function patientWhere(range: ClinicRange) {
  return and(
    eq(patients.tenantId, range.tenantId),
    isNull(patients.deletedAt),
    gte(patients.createdAt, BigInt(range.startMs)),
    lt(patients.createdAt, BigInt(range.endMs)),
    ...(range.locationId ? [eq(patients.locationId, range.locationId)] : []),
  );
}

export async function getCounts(query: DashboardQuery) {
  const range = await clinicRange(query);
  const allPatientsWhere = and(
    eq(patients.tenantId, range.tenantId),
    isNull(patients.deletedAt),
    ...(range.locationId ? [eq(patients.locationId, range.locationId)] : []),
  );
  const [patientTotal, newPatientTotal, appointmentTotal] = await Promise.all([
    db.select({ total: count() }).from(patients).where(allPatientsWhere),
    db.select({ total: count() }).from(patients).where(patientWhere(range)),
    db.select({ total: count() }).from(appointments).where(appointmentWhere(range)),
  ]);
  return {
    ...rangeMeta(range),
    patients: Number(patientTotal[0]?.total ?? 0),
    newPatients: Number(newPatientTotal[0]?.total ?? 0),
    appointments: Number(appointmentTotal[0]?.total ?? 0),
  };
}

export async function getPatientsByAge(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db
    .select({ dateOfBirth: patients.dateOfBirth, gender: patients.gender })
    .from(patients)
    .where(patientWhere(range));

  const groups = Object.fromEntries(
    AGE_GROUPS.map((age) => [age, { age, male: 0, female: 0 }]),
  ) as Record<(typeof AGE_GROUPS)[number], { age: string; male: number; female: number }>;

  let total = 0;
  for (const row of rows) {
    const bucket = ageBucket(ageFromDob(row.dateOfBirth));
    if (!bucket) {
      continue;
    }
    const group = groups[bucket];
    const gender = (row.gender ?? '').toLowerCase();
    if (gender === 'male') {
      group.male += 1;
      total += 1;
    } else if (gender === 'female') {
      group.female += 1;
      total += 1;
    }
  }

  return {
    ...rangeMeta(range),
    total,
    groups: AGE_GROUPS.map((age) => groups[age]),
  };
}

export async function getAppointmentsByType(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db.select({ type: appointments.type }).from(appointments).where(appointmentWhere(range));
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  }
  return {
    ...rangeMeta(range),
    total: rows.length,
    types: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count })),
  };
}

export async function getAppointmentsByStatus(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db.select({ status: appointments.status }).from(appointments).where(appointmentWhere(range));
  const counts = new Map<string, number>(APPOINTMENT_STATUSES.map((status) => [status, 0]));
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return {
    ...rangeMeta(range),
    total: rows.length,
    statuses: APPOINTMENT_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })),
  };
}

export async function getPatientsOverTime(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db
    .select({ patientId: appointments.patientId, startsAt: appointments.startsAt })
    .from(appointments)
    .where(appointmentWhere(range));
  const buckets = bucketsForRange(range.from, range.to, range.timeZone);
  return {
    ...rangeMeta(range),
    points: buckets.map((bucket) => {
      const ids = new Set(
        rows
          .filter((row) => {
            const startsAt = Number(row.startsAt);
            return startsAt >= bucket.start && startsAt < bucket.end;
          })
          .map((row) => row.patientId),
      );
      return {
        date: bucket.date,
        label: bucket.label,
        count: ids.size,
      };
    }),
  };
}

export async function getAppointmentsOverTime(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db.select({ startsAt: appointments.startsAt }).from(appointments).where(appointmentWhere(range));
  const buckets = bucketsForRange(range.from, range.to, range.timeZone);
  return {
    ...rangeMeta(range),
    points: buckets.map((bucket) => ({
      date: bucket.date,
      label: bucket.label,
      count: rows.filter((row) => {
        const startsAt = Number(row.startsAt);
        return startsAt >= bucket.start && startsAt < bucket.end;
      }).length,
    })),
  };
}

export async function getRevenueOverTime(query: DashboardQuery) {
  const range = await clinicRange(query);
  const rows = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      taxPercent: appointments.taxPercent,
      amount: appointmentCharges.amount,
    })
    .from(appointmentCharges)
    .innerJoin(appointments, eq(appointmentCharges.appointmentId, appointments.id))
    .where(
      and(
        appointmentWhere(range),
        isNull(appointmentCharges.deletedAt),
        notInArray(appointments.status, ['Cancelled', 'Expired']),
      ),
    );

  const billed = new Map<string, { startsAt: number; amount: number; taxPercent: number }>();
  for (const row of rows) {
    const current = billed.get(row.appointmentId) ?? {
      startsAt: Number(row.startsAt),
      amount: 0,
      taxPercent: row.taxPercent,
    };
    current.amount += row.amount;
    billed.set(row.appointmentId, current);
  }
  const items = [...billed.values()].map((item) => ({
    startsAt: item.startsAt,
    amount: item.amount + Math.round((item.amount * item.taxPercent) / 100),
  }));
  const buckets = bucketsForRange(range.from, range.to, range.timeZone);
  return {
    ...rangeMeta(range),
    points: buckets.map((bucket) => ({
      date: bucket.date,
      label: bucket.label,
      amount: items
        .filter((item) => item.startsAt >= bucket.start && item.startsAt < bucket.end)
        .reduce((sum, item) => sum + item.amount, 0),
    })),
  };
}
