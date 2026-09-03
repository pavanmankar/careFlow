import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import { verify } from 'argon2';
import { ERROR_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';
import { LoginInput, RegisterInput, AcceptLegalInput, UpdateMeInput, UpdateMeRolesInput } from '@/shared/validation';
import { db, liveRoleIds, nowMs, updateStamp } from '@/db/client';
import { permissions, refreshTokens, roles, tenants, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { AuthUser } from './auth.types';
import { provisionWorkspace } from '@/modules/tenants/tenants.service';
import { writeAudit } from '@/lib/audit';
import { ensureDoctorProfile } from '@/lib/doctor-profile';
import { listOwnerAssignableRoles } from '@/modules/roles/roles.service';
import { getLocationId } from '@/lib/context';
import { listMembershipLocationIds } from '@/lib/location-membership';
import { requiresMfa } from '@/lib/mfa-policy';
import { PUBLIC_DEMO_EMAIL } from '@/lib/public-demo';
import { assertCurrentLegalVersions } from '@/lib/legal';
import { recordLegalAcceptances, getLegalConsentStatus } from '@/lib/legal-consent';
import { signMfaToken } from '@/modules/mfa/mfa.tokens';
import {
  assertMfaEnrollmentForRefresh,
  assertTenantActive,
  buildSessionPayload,
  hashToken,
  issueSession,
  loadAuthUser,
} from './auth-session';

export { hashToken, issueSession, loadAuthUser, buildSessionPayload } from './auth-session';

export type LoginResult =
  | Awaited<ReturnType<typeof issueSession>>
  | { mfaEnrollmentRequired: true; enrollToken: string }
  | { mfaRequired: true; mfaToken: string };

export async function register(input: RegisterInput, meta: { ip?: string; userAgent?: string }) {
  const { userId, tenantId } = await provisionWorkspace(input);
  await persistLegalAcceptance(userId, tenantId, input, meta);
  await writeAudit({
    action: 'REGISTER',
    resource: 'tenant',
    resourceId: tenantId,
    tenantId,
    actorId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return completePasswordAuth(userId, meta);
}

export async function acceptLegal(
  userId: string,
  tenantId: string | null,
  input: AcceptLegalInput,
  meta: { ip?: string; userAgent?: string },
) {
  await persistLegalAcceptance(userId, tenantId, input, meta);
  return buildSessionPayload(userId);
}

async function persistLegalAcceptance(
  userId: string,
  tenantId: string | null,
  input: { termsVersion: string; privacyVersion: string },
  meta: { ip?: string; userAgent?: string },
) {
  const versionError = assertCurrentLegalVersions({
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
  });
  if (versionError) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, versionError, 400);
  }

  const status = await getLegalConsentStatus(userId);
  if (status.satisfied) {
    return;
  }

  await recordLegalAcceptances({
    userId,
    tenantId,
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await writeAudit({
    action: 'LEGAL_ACCEPTED',
    resource: 'legal',
    resourceId: userId,
    tenantId,
    actorId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function login(input: LoginInput, meta: { ip?: string; userAgent?: string }): Promise<LoginResult> {
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
  return completePasswordAuth(user.id, meta, user);
}

async function completePasswordAuth(
  userId: string,
  meta: { ip?: string; userAgent?: string },
  userRow?: typeof users.$inferSelect,
) {
  const user = userRow ?? (await db.query.users.findFirst({ where: eq(users.id, userId) }));
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
  }
  if (!(await requiresMfa(user.tenantId))) {
    return issueSession(userId, meta);
  }
  if (!user.mfaEnabled || !user.mfaSecretEnc) {
    return { mfaEnrollmentRequired: true as const, enrollToken: signMfaToken(userId, 'mfa_enroll') };
  }
  if (user.email.toLowerCase() === PUBLIC_DEMO_EMAIL) {
    return issueSession(userId, meta);
  }
  return { mfaRequired: true as const, mfaToken: signMfaToken(userId, 'mfa_verify') };
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
  const membershipIds = await listMembershipLocationIds(userId, tenantId);
  const locationId = getLocationId() ?? membershipIds[0] ?? null;
  if (!locationId) {
    throw new AppError(ERROR_CODES.LOCATION_REQUIRED, 'Add a clinic location before updating roles.', 400);
  }
  const ownerRole = await db.query.roles.findFirst({
    where: and(
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, locationId),
      eq(roles.code, ROLE_CODES.TENANT_OWNER),
      isNull(roles.deletedAt),
    ),
  });
  if (!ownerRole) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'Owner role was not found.', 404);
  }
  const extraRoleIds = [...new Set(extraRoleIdsInput)].filter((id) => id !== ownerRole.id);
  if (extraRoleIds.length) {
    const found = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.locationId, locationId), inArray(roles.id, extraRoleIds)));
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
    await tx
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId), eq(userRoles.locationId, locationId)));
    await tx
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId, roleId, tenantId, locationId, createdAt: nowMs() })));
  });
  if (extraRoleIds.length) {
    const doctor = await db.query.roles.findFirst({
      where: and(
        inArray(roles.id, extraRoleIds),
        eq(roles.tenantId, tenantId),
        eq(roles.locationId, locationId),
        eq(roles.code, ROLE_CODES.DOCTOR),
      ),
    });
    if (doctor) {
      await ensureDoctorProfile(userId, tenantId, locationId);
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
  await assertMfaEnrollmentForRefresh(stored.userId);
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
