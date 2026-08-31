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
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection ?? 'asc';
  const actorId = getRequestContext()?.userId;
  const doctorIds = db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.tenantId, tenantId), eq(roles.code, ROLE_CODES.DOCTOR)));
  const filters = [
    eq(users.tenantId, tenantId),
    isNull(users.deletedAt),
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
  return {
    items: rows.map((user) => serialize(user)),
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
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new AppError(ERROR_CODES.DUPLICATE_EMAIL, 'An account with this email already exists.', 409);
  }
  await assertAssignableRoles(input.roleIds, tenantId);
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
    await db.insert(userRoles).values(input.roleIds.map((roleId) => ({ userId, roleId, tenantId, createdAt: now })));
  }
  await ensureDoctorIfAssigned(input.roleIds, userId, tenantId);
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

export async function assignUserRoles(id: string, roleIds: string[], actor: AuthUser) {
  if (id === actor.userId) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      'You cannot edit the logged-in user from Staff. Use My profile instead.',
      403,
    );
  }
  const tenantId = requireTenant();
  await requireUser(id);
  await assertAssignableRoles(roleIds, tenantId);
  const target = await requireUser(id);
  const removingOwner =
    target.userRoles.some((ur) => ur.role.code === ROLE_CODES.TENANT_OWNER) &&
    !(await rolesIncludeOwner(roleIds, tenantId));
  if (removingOwner) {
    await ensureNotLastOwner(id);
  }
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(and(eq(userRoles.userId, id), eq(userRoles.tenantId, tenantId)));
    if (roleIds.length) {
      await tx.insert(userRoles).values(roleIds.map((roleId) => ({ userId: id, roleId, tenantId, createdAt: nowMs() })));
    }
  });
  await ensureDoctorIfAssigned(roleIds, id, tenantId);
  return getUser(id);
}

async function rolesIncludeOwner(roleIds: string[], tenantId: string) {
  const owner = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.TENANT_OWNER), inArray(roles.id, roleIds)),
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

async function assertAssignableRoles(roleIds: string[], tenantId: string) {
  const found = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), inArray(roles.id, roleIds)));
  const live = await liveRoleIds(roleIds);
  if (found.length !== roleIds.length || roleIds.some((id) => !live.has(id))) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'One or more roles were not found.', 404);
  }
  if (found.some((role) => role.isSystem)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'The Owner and Doctor roles cannot be assigned to staff.', 403);
  }
}

async function ensureDoctorIfAssigned(roleIds: string[], userId: string, tenantId: string) {
  const doctor = await db.query.roles.findFirst({
    where: and(inArray(roles.id, roleIds), eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.DOCTOR)),
  });
  if (doctor) {
    await ensureDoctorProfile(userId, tenantId);
  }
}

async function requireUser(id: string) {
  const tenantId = requireTenant();
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    with: { userRoles: { with: { role: true } } },
  });
  if (!user) {
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return user;
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
    roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name, code: ur.role.code })),
  };
}
