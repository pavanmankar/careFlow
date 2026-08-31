import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import { createHash, randomUUID } from 'crypto';
import { ULID } from '@/lib/id';
import jwt from 'jsonwebtoken';
import { verify } from 'argon2';
import {
  ALL_PERMISSION_CODES,
  ERROR_CODES,
  ROLE_CODES,
  USER_STATUS,
} from '@/shared/types';
import { LoginInput, RegisterInput, UpdateMeInput, UpdateMeRolesInput } from '@/shared/validation';
import { db, liveRoleIds, nowMs, updateStamp } from '@/db/client';
import { businesses, locations, permissions, refreshTokens, rolePermissions, roles, tenants, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { config } from '@/lib/config';
import { AuthUser } from './auth.types';
import { provisionWorkspace } from '@/modules/tenants/tenants.service';
import { writeAudit } from '@/lib/audit';
import { ensureDoctorProfile } from '@/lib/doctor-profile';
import { listOwnerAssignableRoles } from '@/modules/roles/roles.service';
import { findActiveMetadataItem } from '@/modules/metadata/metadata.service';
import { METADATA_KEYS } from '@/db/masters';
import { evaluateAppointmentsEntitlement } from '@/lib/subscription';
import { clipRequestMeta } from '@/lib/request-meta';

export async function register(input: RegisterInput, meta: { ip?: string; userAgent?: string }) {
  const { userId, tenantId } = await provisionWorkspace(input);
  await writeAudit({
    action: 'REGISTER',
    resource: 'tenant',
    resourceId: tenantId,
    tenantId,
    actorId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return issueSession(userId, meta);
}

export async function login(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)),
  });
  if (!user) {
    await writeAudit({ action: 'LOGIN_FAILED', resource: 'auth', ip: meta.ip, userAgent: meta.userAgent });
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password.', 401);
  }
  const valid = await verify(user.passwordHash, input.password);
  if (!valid) {
    await writeAudit({ action: 'LOGIN_FAILED', resource: 'auth', ip: meta.ip, userAgent: meta.userAgent });
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password.', 401);
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(ERROR_CODES.ACCOUNT_INACTIVE, 'This account is inactive.', 403);
  }
  await assertTenantActive(user.tenantId);
  await writeAudit({
    action: 'LOGIN_SUCCESS',
    resource: 'auth',
    actorId: user.id,
    tenantId: user.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return issueSession(user.id, meta);
}

export async function me(userId: string, authUser?: AuthUser) {
  return buildSessionPayload(userId, authUser);
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  await db
    .update(users)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone.trim(),
      timezone: input.timezone || null,
      updatedBy: userId,
      ...updateStamp(),
    })
    .where(eq(users.id, userId));
  await writeAudit({ action: 'PROFILE_UPDATE', resource: 'user', resourceId: userId, actorId: userId });
  return buildSessionPayload(userId);
}

export async function updateMyRoles(userId: string, input: UpdateMeRolesInput) {
  const extraRoleIdsInput = input.extraRoleIds ?? [];
  const auth = await loadAuthUser(userId);
  if (!auth.tenantId || !auth.roles.includes(ROLE_CODES.TENANT_OWNER)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Only the clinic owner can change extra roles from profile.', 403);
  }
  const tenantId = auth.tenantId;
  const ownerRole = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.TENANT_OWNER), isNull(roles.deletedAt)),
  });
  if (!ownerRole) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'Owner role was not found.', 404);
  }
  const extraRoleIds = [...new Set(extraRoleIdsInput)].filter((id) => id !== ownerRole.id);
  if (extraRoleIds.length) {
    const found = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), inArray(roles.id, extraRoleIds)));
    const live = await liveRoleIds(extraRoleIds);
    if (found.length !== extraRoleIds.length || extraRoleIds.some((id) => !live.has(id))) {
      throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'One or more roles were not found.', 404);
    }
    if (found.some((role) => role.code === ROLE_CODES.TENANT_OWNER || role.code === ROLE_CODES.SUPER_ADMIN)) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'The Owner role cannot be removed or replaced.', 403);
    }
    if (found.some((role) => role.isSystem && role.code !== ROLE_CODES.DOCTOR)) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'This role cannot be assigned from profile.', 403);
    }
  }
  const roleIds = [ownerRole.id, ...extraRoleIds];
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));
    await tx.insert(userRoles).values(roleIds.map((roleId) => ({ userId, roleId, tenantId, createdAt: nowMs() })));
  });
  if (extraRoleIds.length) {
    const doctor = await db.query.roles.findFirst({
      where: and(inArray(roles.id, extraRoleIds), eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.DOCTOR)),
    });
    if (doctor) {
      await ensureDoctorProfile(userId, tenantId);
    }
  }
  await writeAudit({
    action: 'PROFILE_ROLES_UPDATE',
    resource: 'user',
    resourceId: userId,
    actorId: userId,
    tenantId,
  });
  return buildSessionPayload(userId);
}

export async function listMyAssignableRoles(userId: string) {
  const auth = await loadAuthUser(userId);
  if (!auth.tenantId || !auth.roles.includes(ROLE_CODES.TENANT_OWNER)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Only the clinic owner can change extra roles from profile.', 403);
  }
  return listOwnerAssignableRoles();
}

export async function refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }) {
  const tokenHash = hashToken(refreshToken);
  const stored = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())),
  });
  if (!stored) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid refresh token.', 401);
  }
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
  return issueSession(stored.userId, meta);
}

export async function logout(refreshToken: string | undefined, meta?: { ip?: string; userAgent?: string }) {
  if (!refreshToken) {
    return { loggedOut: true };
  }
  const tokenHash = hashToken(refreshToken);
  const stored = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)),
  });
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
  if (stored) {
    await writeAudit({
      action: 'LOGOUT',
      resource: 'auth',
      actorId: stored.userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }
  return { loggedOut: true };
}

export async function loadAuthUser(userId: string): Promise<AuthUser> {
  const [user] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      status: users.status,
      tenantStatus: tenants.status,
      tenantDeletedAt: tenants.deletedAt,
    })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError(ERROR_CODES.ACCOUNT_INACTIVE, 'This account is inactive.', 403);
  }
  if (!user.tenantId) {
    return {
      userId: user.id,
      tenantId: null,
      email: user.email,
      roles: [ROLE_CODES.SUPER_ADMIN],
      permissions: [...ALL_PERMISSION_CODES],
    };
  }
  if (user.tenantDeletedAt || user.tenantStatus !== 'ACTIVE') {
    throw new AppError(ERROR_CODES.TENANT_INACTIVE, 'This workspace is inactive.', 403);
  }
  const memberships = await db
    .select({
      roleCode: roles.code,
      permissionCode: permissions.code,
    })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), isNull(roles.deletedAt)))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.tenantId, user.tenantId)));
  return {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    roles: [...new Set(memberships.map((row) => row.roleCode))],
    permissions: [...new Set(memberships.map((row) => row.permissionCode).filter((code): code is string => Boolean(code)))],
  };
}

async function issueSession(userId: string, meta: { ip?: string; userAgent?: string }) {
  const payload = await buildSessionPayload(userId);
  const accessToken = jwt.sign(
    { sub: userId, tenantId: payload.user.tenantId, email: payload.user.email },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiration as jwt.SignOptions['expiresIn'] },
  );
  const refreshToken = randomUUID() + randomUUID();
  const days = refreshDays();
  const clipped = clipRequestMeta(meta);
  await db.insert(refreshTokens).values({
    id: ULID.random(),
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    ip: clipped.ip,
    userAgent: clipped.userAgent,
    createdAt: nowMs(),
  });
  await db.update(users).set({ lastLoginAt: new Date(), ...updateStamp() }).where(eq(users.id, userId));
  return { ...payload, accessToken, refreshToken };
}

async function buildSessionPayload(userId: string, authUser?: AuthUser) {
  const [auth, user] = await Promise.all([
    authUser ? Promise.resolve(authUser) : loadAuthUser(userId),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
  }
  const [tenant, business, roleAssignments, locationRows] = await Promise.all([
    user.tenantId
      ? db.query.tenants.findFirst({ where: and(eq(tenants.id, user.tenantId), isNull(tenants.deletedAt)) })
      : Promise.resolve(null),
    user.tenantId
      ? db.query.businesses.findFirst({
          where: and(eq(businesses.tenantId, user.tenantId), isNull(businesses.deletedAt)),
        })
      : Promise.resolve(null),
    listRoleAssignments(userId, user.tenantId),
    user.tenantId
      ? db
          .select({
            id: locations.id,
            name: locations.name,
            code: locations.code,
            timezone: locations.timezone,
            status: locations.status,
          })
          .from(locations)
          .where(
            and(
              eq(locations.tenantId, user.tenantId),
              eq(locations.status, 'ACTIVE'),
              isNull(locations.deletedAt),
            ),
          )
          .orderBy(locations.name)
      : Promise.resolve([]),
  ]);
  const typeItem = business
    ? await findActiveMetadataItem(METADATA_KEYS.BUSINESS_TYPE, business.businessType)
    : null;
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      timezone: user.timezone,
      tenantId: user.tenantId,
      status: user.status,
    },
    tenant: tenant ? { id: tenant.id, name: tenant.name, status: tenant.status } : null,
    business: business
      ? {
          id: business.id,
          name: business.name,
          businessType: business.businessType,
          businessTypeName: typeItem?.name ?? business.businessType,
          status: business.status,
          timezone: business.timezone,
          currency: business.currency,
          settings: business.settings,
        }
      : null,
    locations: locationRows,
    roles: auth.roles,
    roleAssignments,
    permissions: auth.permissions,
    entitlements: {
      appointments: tenant
        ? evaluateAppointmentsEntitlement(tenant)
        : {
            allowed: false,
            subcriptionEnabled: false,
            subcriptionUntil: null,
            reason: null,
          },
    },
  };
}

async function listRoleAssignments(userId: string, tenantId: string | null) {
  if (!tenantId) {
    return [];
  }
  const memberships = await db
    .select({
      roleId: roles.id,
      name: roles.name,
      code: roles.code,
    })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), isNull(roles.deletedAt)))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));
  return memberships.map((row) => ({ id: row.roleId, name: row.name, code: row.code }));
}

function refreshDays() {
  const match = /^(\d+)d$/.exec(config.jwtRefreshExpiration);
  return match ? Number(match[1]) : 7;
}

async function assertTenantActive(tenantId: string | null) {
  if (!tenantId) {
    return;
  }
  const tenant = await db.query.tenants.findFirst({ where: and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)) });
  if (!tenant || tenant.status !== 'ACTIVE') {
    throw new AppError(ERROR_CODES.TENANT_INACTIVE, 'This workspace is inactive.', 403);
  }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
