import { hash } from 'argon2';
import { and, eq, gte, isNull, lt, ne, notInArray } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { ERROR_CODES, ROLE_CODES, SYSTEM_CREATED_USER_PASSWORD, USER_STATUS } from '@/shared/types';
import { CreateDoctorInput, UpdateDoctorInput } from '@/shared/validation';
import { db, liveRoleIds, omitUndefined, updateStamp } from '@/db/client';
import { appointments, businesses, doctorProfiles, refreshTokens, roles, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { clinicHoursFromSettings, hourSlotsForDate } from '@/lib/clinic-hours';
import { ensureDoctorProfile } from '@/lib/doctor-profile';
import { AuthUser } from '@/modules/auth/auth.types';
import { assertLocationForAppointments } from '@/lib/location-scope';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

async function clinicContext() {
  const tenantId = requireTenant();
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new AppError(ERROR_CODES.BUSINESS_NOT_FOUND, 'Business not found.', 404);
  }
  const hours = clinicHoursFromSettings(business.settings);
  return { tenantId, timezone: business.timezone, ...hours };
}

async function doctorMemberships(tenantId: string) {
  const rows = await db
    .select({
      user: users,
      specialty: doctorProfiles.specialty,
    })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.code, ROLE_CODES.DOCTOR), isNull(roles.deletedAt)))
    .innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(doctorProfiles, eq(doctorProfiles.userId, users.id))
    .where(eq(userRoles.tenantId, tenantId));
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.user.id)) {
      return false;
    }
    seen.add(row.user.id);
    return true;
  });
}

export async function listDoctors() {
  const { tenantId, timezone, openTime, closeTime } = await clinicContext();
  const items = (await doctorMemberships(tenantId))
    .filter((row) => row.user.status === USER_STATUS.ACTIVE)
    .map((row) => serializeDoctor({ ...row.user, doctorProfile: row.specialty != null ? { specialty: row.specialty } : null }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
  return {
    items,
    clinicHours: { timezone, openTime, closeTime },
  };
}

export async function listManagedDoctors(query: { page?: number; pageSize?: number; search?: string } = {}) {
  const tenantId = requireTenant();
  const actorId = getRequestContext()?.userId;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const term = query.search?.trim().toLowerCase();
  const items = (await doctorMemberships(tenantId))
    .filter((row) => row.user.id !== actorId)
    .filter((row) => {
      if (!term) {
        return true;
      }
      const name = `${row.user.firstName} ${row.user.lastName}`.toLowerCase();
      const specialty = (row.specialty ?? '').toLowerCase();
      const email = row.user.email.toLowerCase();
      return name.includes(term) || specialty.includes(term) || email.includes(term);
    })
    .map((row) => serializeDoctor({ ...row.user, doctorProfile: row.specialty != null ? { specialty: row.specialty } : null }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
    .map((item) => ({ ...item, address: item.address ?? null }));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

export async function getDoctor(userId: string) {
  const doctor = await requireDoctorRecord(userId);
  return serializeDoctor(doctor);
}

export async function createDoctor(input: CreateDoctorInput, actor: AuthUser) {
  const tenantId = requireTenant();
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new AppError(ERROR_CODES.DUPLICATE_EMAIL, 'An account with this email already exists.', 409);
  }
  const doctorRole = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.DOCTOR), isNull(roles.deletedAt)),
  });
  if (!doctorRole) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'The Doctor role was not found.', 404);
  }
  const now = BigInt(utcNowMs());
  const userId = ULID.random();
  await db.insert(users).values({
    id: userId,
    tenantId,
    firstName: input.firstName,
    lastName: input.lastName,
    email,
    phone: input.phone ?? null,
    timezone: input.timezone ?? null,
    passwordHash: await hash(SYSTEM_CREATED_USER_PASSWORD),
    status: USER_STATUS.ACTIVE,
    address: input.address ?? null,
    createdBy: actor.userId,
    updatedBy: actor.userId,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(userRoles).values({ userId, roleId: doctorRole.id, tenantId, createdAt: now });
  await ensureDoctorProfile(userId, tenantId);
  if (input.specialty?.trim()) {
    await db
      .update(doctorProfiles)
      .set({ specialty: input.specialty.trim(), ...updateStamp() })
      .where(eq(doctorProfiles.userId, userId));
  }
  return getDoctor(userId);
}

export async function updateDoctor(userId: string, input: UpdateDoctorInput, actor: AuthUser) {
  const doctor = await requireDoctorRecord(userId);
  const isSelf = userId === actor.userId;
  const { address, specialty, ...rest } = input;
  const profileChange =
    rest.firstName !== undefined ||
    rest.lastName !== undefined ||
    rest.phone !== undefined ||
    rest.timezone !== undefined ||
    address !== undefined;
  if (isSelf && profileChange) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'You cannot edit the logged-in user from Doctors. Use My profile instead.',
      403,
    );
  }
  const tenantId = requireTenant();
  if (!isSelf) {
    await db
      .update(users)
      .set({
        ...omitUndefined(rest as Record<string, unknown>),
        ...(address !== undefined ? { address } : {}),
        updatedBy: actor.userId,
        ...updateStamp(),
      })
      .where(eq(users.id, doctor.id));
  }
  if (specialty !== undefined) {
    await ensureDoctorProfile(doctor.id, tenantId);
    await db
      .update(doctorProfiles)
      .set({ specialty: specialty.trim(), ...updateStamp() })
      .where(eq(doctorProfiles.userId, doctor.id));
  }
  return getDoctor(doctor.id);
}

export async function setDoctorActive(userId: string, active: boolean, actor: AuthUser) {
  const doctor = await requireDoctorRecord(userId);
  if (doctor.id === actor.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'You cannot change your own active status.', 403);
  }
  if (!active) {
    await ensureNotLastOwner(doctor.id);
  }
  await db
    .update(users)
    .set({
      status: active ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
      updatedBy: actor.userId,
      ...updateStamp(),
    })
    .where(eq(users.id, doctor.id));
  if (!active) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, doctor.id), isNull(refreshTokens.revokedAt)));
  }
  return getDoctor(doctor.id);
}

export async function listDoctorSlots(userId: string, date: string, excludeAppointmentId?: string) {
  await assertLocationForAppointments();
  const doctor = await requireActiveDoctor(userId);
  const { tenantId, timezone, openTime, closeTime } = await clinicContext();
  const slots = hourSlotsForDate(date, timezone, openTime, closeTime);
  if (!slots.length) {
    return { items: [] as Array<{ startsAt: number; endsAt: number; label: string }> };
  }
  const booked = await db
    .select({ id: appointments.id, startsAt: appointments.startsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.doctorUserId, doctor.id),
        isNull(appointments.deletedAt),
        notInArray(appointments.status, ['Cancelled', 'Expired']),
        gte(appointments.startsAt, BigInt(slots[0].startsAt)),
        lt(appointments.startsAt, BigInt(slots[slots.length - 1].endsAt)),
        ...(excludeAppointmentId ? [ne(appointments.id, excludeAppointmentId)] : []),
      ),
    );
  const taken = new Set(booked.map((row) => Number(row.startsAt)));
  const now = utcNowMs();
  return {
    items: slots
      .filter((slot) => !taken.has(slot.startsAt) && slot.startsAt > now)
      .map((slot) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt, label: slot.label })),
  };
}

export async function requireDoctor(userId: string) {
  return requireActiveDoctor(userId);
}

async function requireActiveDoctor(userId: string) {
  const doctor = await requireDoctorRecord(userId);
  if (doctor.status !== USER_STATUS.ACTIVE) {
    throw new AppError(ERROR_CODES.DOCTOR_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return doctor;
}

async function requireDoctorRecord(userId: string) {
  const tenantId = requireTenant();
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    with: { doctorProfile: true, userRoles: { with: { role: true } } },
  });
  const live = user ? await liveRoleIds(user.userRoles.map((row) => row.roleId)) : new Set<string>();
  const isDoctor = Boolean(
    user && user.userRoles.some((row) => live.has(row.roleId) && row.role.code === ROLE_CODES.DOCTOR),
  );
  if (!user || !isDoctor) {
    throw new AppError(ERROR_CODES.DOCTOR_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return user;
}

async function ensureNotLastOwner(userId: string) {
  const tenantId = requireTenant();
  const ownerMembership = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId), eq(roles.code, ROLE_CODES.TENANT_OWNER)))
    .limit(1);
  if (!ownerMembership.length) {
    return;
  }
  const owners = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(roles.code, ROLE_CODES.TENANT_OWNER),
        isNull(users.deletedAt),
        eq(users.status, USER_STATUS.ACTIVE),
        ne(users.id, userId),
      ),
    );
  if (!owners.length) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot remove or deactivate the last Owner.', 403);
  }
}

function serializeDoctor(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  timezone?: string | null;
  createdAt?: bigint;
  address?: unknown;
  doctorProfile: { specialty: string } | null;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone ?? null,
    specialty: user.doctorProfile?.specialty || '',
    status: user.status,
    timezone: user.timezone ?? null,
    createdAt: user.createdAt ?? null,
    address: user.address ?? null,
  };
}
