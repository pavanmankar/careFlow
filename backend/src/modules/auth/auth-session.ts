import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomUUID } from 'crypto';
import { ULID } from '@/lib/id';
import jwt from 'jsonwebtoken';
import { ALL_PERMISSION_CODES, ERROR_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';
import { db, nowMs, updateStamp } from '@/db/client';
import {
  businesses,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  tenants,
  userRoles,
  users,
} from '@/db/schema';
import { AppError } from '@/lib/errors';
import { config } from '@/lib/config';
import { AuthUser } from './auth.types';
import { findActiveMetadataItem } from '@/modules/metadata/metadata.service';
import { METADATA_KEYS } from '@/db/masters';
import { listAccessibleLocations } from '@/lib/location-membership';
import { bypassesSubscriptionCheck } from '@/lib/public-demo';
import { evaluateAppointmentsEntitlement } from '@/lib/subscription';
import { getLegalConsentStatus } from '@/lib/legal-consent';
import { clipRequestMeta } from '@/lib/request-meta';
import { getMfaAuthenticationEnabled } from '@/lib/mfa-settings';
import { isTenantMfaRequired, requiresMfa } from '@/lib/mfa-policy';

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
    permissions: [
      ...new Set(memberships.map((row) => row.permissionCode).filter((code): code is string => Boolean(code))),
    ],
  };
}

export async function issueSession(userId: string, meta: { ip?: string; userAgent?: string }) {
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

export async function buildSessionPayload(userId: string, authUser?: AuthUser) {
  const [auth, user] = await Promise.all([
    authUser ? Promise.resolve(authUser) : loadAuthUser(userId),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
  }
  const platformMfaEnabled = await getMfaAuthenticationEnabled();
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
    user.tenantId ? listAccessibleLocations(userId, user.tenantId, auth.roles) : Promise.resolve([]),
  ]);
  const typeItem = business
    ? await findActiveMetadataItem(METADATA_KEYS.BUSINESS_TYPE, business.businessType)
    : null;
  const mfaRequired = user.tenantId ? await isTenantMfaRequired(user.tenantId) : false;
  const legal = await getLegalConsentStatus(userId);
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
        ? bypassesSubscriptionCheck(tenant.id, auth.roles)
          ? {
              allowed: true,
              subcriptionEnabled: Boolean(tenant.subcriptionEnabled),
              subcriptionUntil:
                tenant.subcriptionUntil == null
                  ? null
                  : typeof tenant.subcriptionUntil === 'bigint'
                    ? Number(tenant.subcriptionUntil)
                    : tenant.subcriptionUntil,
              reason: null,
            }
          : evaluateAppointmentsEntitlement(tenant)
        : {
            allowed: false,
            subcriptionEnabled: false,
            subcriptionUntil: null,
            reason: null,
          },
    },
    mfa: {
      enabled: Boolean(user.mfaEnabled),
      required: mfaRequired,
      platformEnabled: platformMfaEnabled,
      clinicEnabled: tenant?.mfaAuthenticationEnabled !== false,
    },
    legal,
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

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function assertTenantActive(tenantId: string | null) {
  if (!tenantId) {
    return;
  }
  const tenant = await db.query.tenants.findFirst({ where: and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)) });
  if (!tenant || tenant.status !== 'ACTIVE') {
    throw new AppError(ERROR_CODES.TENANT_INACTIVE, 'This workspace is inactive.', 403);
  }
}

export async function assertMfaEnrollmentForRefresh(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid refresh token.', 401);
  }
  if (await requiresMfa(user.tenantId)) {
    if (!user.mfaEnabled) {
      throw new AppError(
        ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
        'Multi-factor authentication enrollment is required.',
        403,
      );
    }
  }
}
