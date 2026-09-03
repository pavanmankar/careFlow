import { and, asc, count, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { ERROR_CODES } from '@/shared/types';
import { contains, db, likeContains } from '@/db/client';
import { appointments, patients } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { requireActiveLocationId } from '@/lib/location-scope';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export async function listPatients(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection ?? 'asc';
  const filters = [
    eq(patients.tenantId, tenantId),
    eq(patients.locationId, locationId),
    isNull(patients.deletedAt),
    ...(query.search
      ? [
          or(
            likeContains(patients.firstName, query.search),
            likeContains(patients.lastName, query.search),
            likeContains(patients.phone, query.search),
            sql`LOWER(concat(${patients.firstName}, ' ', ${patients.lastName})) LIKE ${contains(query.search)}`,
          )!,
        ]
      : []),
  ];
  const where = and(...filters);
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(patients)
      .where(where)
      .orderBy(sortDirection === 'desc' ? desc(patients.lastName) : asc(patients.lastName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(patients).where(where),
  ]);
  return {
    items: rows.map(serializePatient),
    page,
    pageSize,
    total: Number(totals[0]?.total ?? 0),
  };
}

export async function getPatient(id: string) {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const patient = await db.query.patients.findFirst({
    where: and(
      eq(patients.id, id),
      eq(patients.tenantId, tenantId),
      eq(patients.locationId, locationId),
      isNull(patients.deletedAt),
    ),
    with: {
      appointments: {
        where: and(isNull(appointments.deletedAt), eq(appointments.locationId, locationId)),
        orderBy: desc(appointments.startsAt),
        with: {
          doctor: { with: { doctorProfile: true } },
        },
      },
    },
  });
  if (!patient) {
    throw new AppError(ERROR_CODES.PATIENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return {
    ...serializePatient(patient),
    appointments: patient.appointments.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      doctor: {
        id: row.doctor.id,
        name: `${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
        specialty: row.doctor.doctorProfile?.specialty || '',
      },
    })),
  };
}

function serializePatient(patient: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string | null;
  bloodGroup: string | null;
  dateOfBirth: Date | null;
  lastVisitAt: bigint | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  currentMedicines?: string | null;
}) {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    phone: patient.phone,
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.getTime() : null,
    age: ageFromDob(patient.dateOfBirth),
    lastVisitAt: patient.lastVisitAt,
    emergencyContactName: patient.emergencyContactName ?? null,
    emergencyContactPhone: patient.emergencyContactPhone ?? null,
    allergies: patient.allergies ?? null,
    chronicConditions: patient.chronicConditions ?? null,
    currentMedicines: patient.currentMedicines ?? null,
  };
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
