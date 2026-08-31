import { and, asc, count, desc, eq, gte, inArray, isNull, lt, ne, notInArray, or, sql } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { APPOINTMENT_STATUSES, ERROR_CODES } from '@/shared/types';
import { CreateAppointmentInput, RescheduleAppointmentInput } from '@/shared/validation';
import { contains, db, likeContains, updateStamp } from '@/db/client';
import { appointments, businesses, patients } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { clinicHoursFromSettings, hourSlotsForDate } from '@/lib/clinic-hours';
import { requireDoctor } from '@/modules/doctors/doctors.service';
import { requireAppointmentType } from '@/modules/metadata/metadata.service';
import { expireOverdueConfirmedAppointments } from '@/jobs/expire-appointments';

const CANCELLED = 'Cancelled';
const EXPIRED = 'Expired';
const INACTIVE_STATUSES: string[] = [CANCELLED, EXPIRED];

async function patientNameFilter(tenantId: string, search?: string) {
  const term = search?.trim();
  if (!term) {
    return [];
  }
  const matches = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt),
        or(
          likeContains(patients.firstName, term),
          likeContains(patients.lastName, term),
          sql`LOWER(concat(${patients.firstName}, ' ', ${patients.lastName})) LIKE ${contains(term)}`,
        ),
      ),
    );
  const ids = matches.map((row) => row.id);
  if (!ids.length) {
    return [sql`1 = 0`];
  }
  return [inArray(appointments.patientId, ids)];
}

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export async function listAppointments(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortDirection?: 'asc' | 'desc';
  type?: string;
  status?: string;
  doctorUserId?: string;
  patientId?: string;
  from?: number;
  to?: number;
}) {
  await expireOverdueConfirmedAppointments();
  const tenantId = requireTenant();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection === 'asc' ? 'asc' : 'desc';
  const byPatientName = await patientNameFilter(tenantId, query.search);
  const filters = [
    eq(appointments.tenantId, tenantId),
    isNull(appointments.deletedAt),
    ...(query.type ? [eq(appointments.type, query.type)] : []),
    ...(query.status ? [eq(appointments.status, query.status)] : []),
    ...(query.doctorUserId ? [eq(appointments.doctorUserId, query.doctorUserId)] : []),
    ...(query.patientId ? [eq(appointments.patientId, query.patientId)] : []),
    ...(query.from ? [gte(appointments.startsAt, BigInt(query.from))] : []),
    ...(query.to ? [lt(appointments.startsAt, BigInt(query.to))] : []),
    ...byPatientName,
  ];
  const countFilters = [
    eq(appointments.tenantId, tenantId),
    isNull(appointments.deletedAt),
    ...(query.type ? [eq(appointments.type, query.type)] : []),
    ...(query.doctorUserId ? [eq(appointments.doctorUserId, query.doctorUserId)] : []),
    ...(query.patientId ? [eq(appointments.patientId, query.patientId)] : []),
    ...(query.from ? [gte(appointments.startsAt, BigInt(query.from))] : []),
    ...(query.to ? [lt(appointments.startsAt, BigInt(query.to))] : []),
    ...byPatientName,
  ];
  const where = and(...filters);
  const countWhere = and(...countFilters);
  const [rows, totals, statusRows] = await Promise.all([
    db.query.appointments.findMany({
      where,
      with: {
        patient: true,
        doctor: { with: { doctorProfile: true } },
      },
      orderBy: sortDirection === 'asc' ? asc(appointments.startsAt) : desc(appointments.startsAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(appointments).where(where),
    db
      .select({ status: appointments.status, total: count() })
      .from(appointments)
      .where(countWhere)
      .groupBy(appointments.status),
  ]);
  const byStatus = new Map(statusRows.map((row) => [row.status, Number(row.total)]));
  return {
    items: rows.map(serializeAppointment),
    page,
    pageSize,
    total: Number(totals[0]?.total ?? 0),
    statusCounts: APPOINTMENT_STATUSES.map((status) => ({
      status,
      total: byStatus.get(status) ?? 0,
    })),
  };
}

export async function getAppointment(id: string) {
  const tenantId = requireTenant();
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
    with: {
      patient: true,
      doctor: { with: { doctorProfile: true } },
    },
  });
  if (!row) {
    throw new AppError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return serializeAppointment(row);
}

export async function createAppointment(input: CreateAppointmentInput, actorId: string) {
  const tenantId = requireTenant();
  const doctor = await requireDoctor(input.doctorUserId);
  const appointmentType = await requireAppointmentType(input.type);
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new AppError(ERROR_CODES.BUSINESS_NOT_FOUND, 'Business not found.', 404);
  }
  const hours = clinicHoursFromSettings(business.settings);
  const slot = matchingSlot(input.startsAt, business.timezone, hours.openTime, hours.closeTime);
  if (!slot) {
    throw new AppError(ERROR_CODES.SLOT_UNAVAILABLE, 'Choose a 1-hour slot inside clinic hours.', 409);
  }
  if (slot.startsAt <= utcNowMs()) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot book an appointment in the past.', 400);
  }

  const clash = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.doctorUserId, doctor.id),
      isNull(appointments.deletedAt),
      notInArray(appointments.status, INACTIVE_STATUSES),
      eq(appointments.startsAt, BigInt(slot.startsAt)),
    ),
  });
  if (clash) {
    throw new AppError(ERROR_CODES.SLOT_UNAVAILABLE, 'This time is already booked for that doctor.', 409);
  }

  const now = BigInt(utcNowMs());
  const phone = input.patient.phone.trim();
  let patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.phone, phone), isNull(patients.deletedAt)),
  });
  const dateOfBirth = parseDob(input.patient.dateOfBirth);
  if (!patient) {
    const patientId = ULID.random();
    await db.insert(patients).values({
      id: patientId,
      tenantId,
      firstName: input.patient.firstName.trim(),
      lastName: input.patient.lastName.trim(),
      phone,
      gender: input.patient.gender.trim(),
      bloodGroup: input.patient.bloodGroup.trim(),
      dateOfBirth,
      lastVisitAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    });
    patient = await db.query.patients.findFirst({ where: eq(patients.id, patientId) });
  }
  if (!patient) {
    throw new AppError(ERROR_CODES.PATIENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }

  const appointmentId = ULID.random();
  await db.insert(appointments).values({
    id: appointmentId,
    tenantId,
    patientId: patient.id,
    doctorUserId: doctor.id,
    type: appointmentType.name,
    status: 'Confirmed',
    startsAt: BigInt(slot.startsAt),
    endsAt: BigInt(slot.endsAt),
    reasonForVisit: input.reasonForVisit?.trim() || null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  });

  const lastVisit = Number(patient.lastVisitAt ?? 0);
  if (slot.startsAt >= lastVisit) {
    await db
      .update(patients)
      .set({ lastVisitAt: BigInt(slot.startsAt), updatedBy: actorId, ...updateStamp() })
      .where(eq(patients.id, patient.id));
  }

  return getAppointment(appointmentId);
}

export async function rescheduleAppointment(id: string, input: RescheduleAppointmentInput, actorId: string) {
  const tenantId = requireTenant();
  await expireOverdueConfirmedAppointments();
  const existing = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
  });
  if (!existing) {
    throw new AppError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found.', 404);
  }
  if (existing.status !== 'Confirmed') {
    throw new AppError(
      ERROR_CODES.APPOINTMENT_STATUS,
      'Only confirmed appointments can be rescheduled.',
      409,
    );
  }

  const doctor = await requireDoctor(existing.doctorUserId);
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new AppError(ERROR_CODES.BUSINESS_NOT_FOUND, 'Business not found.', 404);
  }
  const hours = clinicHoursFromSettings(business.settings);
  const slot = matchingSlot(input.startsAt, business.timezone, hours.openTime, hours.closeTime);
  if (!slot) {
    throw new AppError(ERROR_CODES.SLOT_UNAVAILABLE, 'Choose a 1-hour slot inside clinic hours.', 409);
  }
  if (slot.startsAt <= utcNowMs()) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot move an appointment to the past.', 400);
  }

  if (Number(existing.startsAt) !== slot.startsAt) {
    const clash = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.doctorUserId, doctor.id),
        isNull(appointments.deletedAt),
        notInArray(appointments.status, INACTIVE_STATUSES),
        eq(appointments.startsAt, BigInt(slot.startsAt)),
        ne(appointments.id, id),
      ),
    });
    if (clash) {
      throw new AppError(ERROR_CODES.SLOT_UNAVAILABLE, 'This time is already booked for that doctor.', 409);
    }
  }

  await db
    .update(appointments)
    .set({
      startsAt: BigInt(slot.startsAt),
      endsAt: BigInt(slot.endsAt),
      updatedBy: actorId,
      ...updateStamp(),
    })
    .where(eq(appointments.id, id));

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, existing.patientId) });
  if (patient) {
    const lastVisit = Number(patient.lastVisitAt ?? 0);
    if (slot.startsAt >= lastVisit) {
      await db
        .update(patients)
        .set({ lastVisitAt: BigInt(slot.startsAt), updatedBy: actorId, ...updateStamp() })
        .where(eq(patients.id, patient.id));
    }
  }

  return getAppointment(id);
}

function matchingSlot(startsAt: number, timezone: string, openTime: string, closeTime: string) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startsAt));
  return hourSlotsForDate(ymd, timezone, openTime, closeTime).find((slot) => slot.startsAt === startsAt) ?? null;
}

function parseDob(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Date of birth must be YYYY-MM-DD.', 400);
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function serializeAppointment(row: {
  id: string;
  type: string;
  status: string;
  startsAt: bigint;
  endsAt: bigint;
  patient: { id: string; firstName: string; lastName: string; phone: string; gender: string | null; bloodGroup: string | null };
  doctor: { id: string; firstName: string; lastName: string; doctorProfile: { specialty: string } | null };
}) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    patient: {
      id: row.patient.id,
      firstName: row.patient.firstName,
      lastName: row.patient.lastName,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      phone: row.patient.phone,
      gender: row.patient.gender,
      bloodGroup: row.patient.bloodGroup,
    },
    doctor: {
      id: row.doctor.id,
      name: `${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
      specialty: row.doctor.doctorProfile?.specialty || '',
    },
  };
}
