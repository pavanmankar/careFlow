import { and, asc, count, desc, eq, inArray, isNull, ne, notInArray, or } from 'drizzle-orm';
import { hash } from 'argon2';
import { ULID } from '@/lib/id';
import { ERROR_CODES, ROLE_CODES, SYSTEM_CREATED_USER_PASSWORD, USER_STATUS } from '@/shared/types';
import { CreateUserInput } from '@/shared/validation';
import { createStamps, db, likeContains, liveRoleIds, nowMs, omitUndefined, updateStamp } from '@/db/client';
import { refreshTokens, roles, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { AuthUser } from '@/modules/auth/auth.types';
import { ensureDoctorProfile } from '@/lib/doctor-profile';
import { assertLocationForUsers, requireActiveLocationId } from '@/lib/location-scope';
import { resetUserMfa as clearUserMfa } from '@/modules/mfa/mfa.service';

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export async function listUsers(query: {
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
  const actorId = getRequestContext()?.userId;
  const doctorIds = db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(eq(userRoles.tenantId, tenantId), eq(userRoles.locationId, locationId), eq(roles.code, ROLE_CODES.DOCTOR)),
    );
  const memberIds = db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.locationId, locationId)));
  const filters = [
    eq(users.tenantId, tenantId),
    isNull(users.deletedAt),
    inArray(users.id, memberIds),
    notInArray(users.id, doctorIds),
    ...(actorId ? [ne(users.id, actorId)] : []),
    ...(query.search
      ? [
          or(
            likeContains(users.firstName, query.search),
            likeContains(users.lastName, query.search),
            likeContains(users.email, query.search),
          )!,
        ]
      : []),
  ];
  const where = and(...filters);
  const [rows, totals] = await Promise.all([
    db.query.users.findMany({
      where,
      with: { userRoles: { with: { role: true } } },
      orderBy: sortDirection === 'desc' ? desc(users.firstName) : asc(users.firstName),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(users).where(where),
  ]);
  const scoped = rows.map((user) => ({
    ...user,
    userRoles: user.userRoles.filter((ur) => ur.locationId === locationId),
  }));
  return {
    items: scoped.map((user) => serialize(user)),
    page,
    pageSize,
    total: Number(totals[0]?.total ?? 0),
  };
}

export async function getUser(id: string) {
  return serialize(await requireUser(id));
}

export async function createUser(input: CreateUserInput, actor: AuthUser) {
  const tenantId = requireTenant();
  const locationId = await assertLocationForUsers();
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new AppError(ERROR_CODES.DUPLICATE_EMAIL, 'An account with this email already exists.', 409);
  }
  await assertAssignableRoles(input.roleIds, tenantId, locationId);
  const userId = ULID.random();
  const now = nowMs();
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
    ...createStamps(),
  });
  if (input.roleIds.length) {
    await db
      .insert(userRoles)
      .values(input.roleIds.map((roleId) => ({ userId, roleId, tenantId, locationId, createdAt: now })));
  }
  await ensureDoctorIfAssigned(input.roleIds, userId, tenantId, locationId);
  return getUser(userId);
}

export async function updateUser(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    timezone?: string | null;
    address?: Address | null;
  },
  actor: AuthUser,
) {
  if (id === actor.userId) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'You cannot edit the logged-in user from Staff. Use My profile instead.',
      403,
    );
  }
  await requireUser(id);
  const { address, ...rest } = input;
  await db
    .update(users)
    .set({
      ...omitUndefined(rest as Record<string, unknown>),
      ...(address !== undefined ? { address } : {}),
      updatedBy: actor.userId,
      ...updateStamp(),
    })
    .where(eq(users.id, id));
  return getUser(id);
}

export async function setUserActive(id: string, active: boolean, actor: AuthUser) {
  const user = await requireUser(id);
  if (user.id === actor.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'You cannot change your own active status.', 403);
  }
  if (!active) {
    await ensureNotLastOwner(user.id);
  }
  await db
    .update(users)
    .set({
      status: active ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
      updatedBy: actor.userId,
      ...updateStamp(),
    })
    .where(eq(users.id, id));
  if (!active) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(and(eq(refreshTokens.userId, id), isNull(refreshTokens.revokedAt)));
  }
  return getUser(id);
}

function assertTenantOwner(actor: AuthUser) {
  if (!actor.roles.includes(ROLE_CODES.TENANT_OWNER)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Only the clinic owner can perform this action.', 403);
  }
}

export async function resetStaffMfa(
  id: string,
  actor: AuthUser,
  meta: { ip?: string; userAgent?: string },
) {
  assertTenantOwner(actor);
  if (id === actor.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'You cannot reset your own two-factor authentication.', 403);
  }
  const target = await requireUser(id);
  if (target.userRoles.some((ur) => ur.role.code === ROLE_CODES.TENANT_OWNER)) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'Owner two-factor authentication can only be reset by a platform administrator.',
      403,
    );
  }
  return clearUserMfa(id, {
    actorId: actor.userId,
    tenantId: actor.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function assignUserRoles(id: string, roleIds: string[], actor: AuthUser) {
  if (id === actor.userId) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'You cannot edit the logged-in user from Staff. Use My profile instead.',
      403,
    );
  }
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  await requireUser(id);
  await assertAssignableRoles(roleIds, tenantId, locationId);
  const target = await requireUser(id);
  const removingOwner =
    target.userRoles.some((ur) => ur.role.code === ROLE_CODES.TENANT_OWNER) &&
    !(await rolesIncludeOwner(roleIds, tenantId, locationId));
  if (removingOwner) {
    await ensureNotLastOwner(id);
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(userRoles)
      .where(and(eq(userRoles.userId, id), eq(userRoles.tenantId, tenantId), eq(userRoles.locationId, locationId)));
    if (roleIds.length) {
      await tx
        .insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId: id, roleId, tenantId, locationId, createdAt: nowMs() })));
    }
  });
  await ensureDoctorIfAssigned(roleIds, id, tenantId, locationId);
  return getUser(id);
}

async function rolesIncludeOwner(roleIds: string[], tenantId: string, locationId: string) {
  const owner = await db.query.roles.findFirst({
    where: and(
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, locationId),
      eq(roles.code, ROLE_CODES.TENANT_OWNER),
      inArray(roles.id, roleIds),
    ),
  });
  return Boolean(owner);
}

async function ensureNotLastOwner(userId: string) {
  const tenantId = requireTenant();
  const ownerRows = await db
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
  if (!ownerRows.length) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot remove or deactivate the last Owner.', 403);
  }
}

async function assertAssignableRoles(roleIds: string[], tenantId: string, locationId: string) {
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.locationId, locationId), inArray(roles.id, roleIds)));
  const live = await liveRoleIds(roleIds);
  if (found.length !== roleIds.length || roleIds.some((id) => !live.has(id))) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'One or more roles were not found.', 404);
  }
  if (found.some((role) => role.isSystem)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'The Owner and Doctor roles cannot be assigned to staff.', 403);
  }
}

async function ensureDoctorIfAssigned(roleIds: string[], userId: string, tenantId: string, locationId: string) {
  const doctor = await db.query.roles.findFirst({
    where: and(
      inArray(roles.id, roleIds),
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, locationId),
      eq(roles.code, ROLE_CODES.DOCTOR),
    ),
  });
  if (doctor) {
    await ensureDoctorProfile(userId, tenantId, locationId);
  }
}

async function requireUser(id: string) {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    with: { userRoles: { with: { role: true } } },
  });
  const atLocation = user?.userRoles.some((ur) => ur.locationId === locationId);
  if (!user || !atLocation) {
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return {
    ...user,
    userRoles: user.userRoles.filter((ur) => ur.locationId === locationId),
  };
}

function serialize(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  timezone: string | null;
  lastLoginAt: Date | null;
  createdAt: bigint;
  updatedAt: bigint;
  address: unknown;
  mfaEnabled?: boolean;
  userRoles: Array<{ role: { id: string; name: string; code: string } }>;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    timezone: user.timezone,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    address: user.address ?? null,
    mfaEnabled: Boolean(user.mfaEnabled),
    roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name, code: ur.role.code })),
  };
}
