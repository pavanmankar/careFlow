import { randomBytes } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { hash, verify } from 'argon2';
import { createTotpSecret, totpAuthUri, verifyTotpCode } from '@/lib/mfa-totp';
import QRCode from 'qrcode';
import { db, updateStamp } from '@/db/client';
import { refreshTokens, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { writeAudit } from '@/lib/audit';
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';
import { ERROR_CODES } from '@/shared/types';
import { issueSession } from '@/modules/auth/auth-session';
import { signMfaToken, verifyMfaToken } from './mfa.tokens';

const BACKUP_CODE_COUNT = 10;

type BackupCodeEntry = { hash: string };

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

async function hashBackupCodes(codes: string[]): Promise<BackupCodeEntry[]> {
  return Promise.all(codes.map(async (code) => ({ hash: await hash(code) })));
}

function normalizeBackupCode(code: string) {
  return code.replace(/\s+/g, '').toUpperCase();
}

function normalizeTotpCode(code: string) {
  return code.replace(/\s+/g, '');
}

async function loadUserForMfa(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
  }
  return user;
}

export async function enrollStart(
  enrollToken: string,
  meta: { ip?: string; userAgent?: string },
) {
  const userId = verifyMfaToken(enrollToken, 'mfa_enroll');
  const user = await loadUserForMfa(userId);
  if (user.mfaEnabled) {
    throw new AppError(ERROR_CODES.CONFLICT, 'MFA is already enabled for this account.', 409);
  }
  const secret = user.mfaSecretEnc ? decryptSecret(user.mfaSecretEnc) : createTotpSecret();
  if (!user.mfaSecretEnc) {
    await db
      .update(users)
      .set({
        mfaSecretEnc: encryptSecret(secret),
        mfaBackupCodesHash: null,
        ...updateStamp(),
      })
      .where(eq(users.id, userId));
  }
  const qrDataUrl = await QRCode.toDataURL(totpAuthUri(user.email, secret));
  await writeAudit({
    action: 'MFA_ENROLL_START',
    resource: 'auth',
    actorId: userId,
    tenantId: user.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { qrDataUrl, manualSecret: secret };
}

export async function enrollConfirm(
  enrollToken: string,
  code: string,
  meta: { ip?: string; userAgent?: string },
) {
  const userId = verifyMfaToken(enrollToken, 'mfa_enroll');
  const user = await loadUserForMfa(userId);
  if (!user.mfaSecretEnc) {
    throw new AppError(ERROR_CODES.MFA_ENROLLMENT_REQUIRED, 'Start MFA enrollment first.', 400);
  }
  const secret = decryptSecret(user.mfaSecretEnc);
  if (!verifyTotpCode(secret, code)) {
    await writeAudit({
      action: 'MFA_FAILED',
      resource: 'auth',
      actorId: userId,
      tenantId: user.tenantId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw new AppError(ERROR_CODES.MFA_INVALID, 'Invalid authentication code.', 401);
  }
  const backupCodes = generateBackupCodes();
  const backupHashes = await hashBackupCodes(backupCodes);
  await db
    .update(users)
    .set({
      mfaEnabled: true,
      mfaBackupCodesHash: backupHashes,
      ...updateStamp(),
    })
    .where(eq(users.id, userId));
  await writeAudit({
    action: 'MFA_ENROLL',
    resource: 'auth',
    actorId: userId,
    tenantId: user.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  const session = await issueSession(userId, meta);
  return { backupCodes, ...session };
}

export async function verifyMfaLogin(
  mfaToken: string,
  code: string,
  meta: { ip?: string; userAgent?: string },
) {
  const userId = verifyMfaToken(mfaToken, 'mfa_verify');
  const user = await loadUserForMfa(userId);
  if (!user.mfaEnabled || !user.mfaSecretEnc) {
    throw new AppError(ERROR_CODES.MFA_ENROLLMENT_REQUIRED, 'MFA enrollment is required.', 403);
  }
  const verified = await verifyMfaCode(user, code, meta);
  if (!verified) {
    await writeAudit({
      action: 'MFA_FAILED',
      resource: 'auth',
      actorId: userId,
      tenantId: user.tenantId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw new AppError(ERROR_CODES.MFA_INVALID, 'Invalid authentication code.', 401);
  }
  await writeAudit({
    action: 'MFA_VERIFY',
    resource: 'auth',
    actorId: userId,
    tenantId: user.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return issueSession(userId, meta);
}

async function verifyMfaCode(
  user: typeof users.$inferSelect,
  code: string,
  meta: { ip?: string; userAgent?: string },
): Promise<boolean> {
  const secret = decryptSecret(user.mfaSecretEnc!);
  const normalized = normalizeTotpCode(code);
  if (verifyTotpCode(secret, normalized)) {
    return true;
  }
  const backupEntries = (user.mfaBackupCodesHash as BackupCodeEntry[] | null) ?? [];
  const normalizedBackup = normalizeBackupCode(code);
  for (let index = 0; index < backupEntries.length; index += 1) {
    const entry = backupEntries[index];
    if (await verify(entry.hash, normalizedBackup)) {
      const remaining = backupEntries.filter((_, i) => i !== index);
      await db
        .update(users)
        .set({ mfaBackupCodesHash: remaining, ...updateStamp() })
        .where(eq(users.id, user.id));
      await writeAudit({
        action: 'MFA_BACKUP_USED',
        resource: 'auth',
        actorId: user.id,
        tenantId: user.tenantId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return true;
    }
  }
  return false;
}

export async function regenerateBackupCodes(
  userId: string,
  password: string,
  meta: { ip?: string; userAgent?: string },
) {
  const user = await loadUserForMfa(userId);
  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid password.', 401);
  }
  if (!user.mfaEnabled) {
    throw new AppError(ERROR_CODES.MFA_ENROLLMENT_REQUIRED, 'MFA is not enabled for this account.', 400);
  }
  const backupCodes = generateBackupCodes();
  const backupHashes = await hashBackupCodes(backupCodes);
  await db
    .update(users)
    .set({ mfaBackupCodesHash: backupHashes, ...updateStamp() })
    .where(eq(users.id, userId));
  await writeAudit({
    action: 'MFA_BACKUP_REGENERATED',
    resource: 'auth',
    actorId: userId,
    tenantId: user.tenantId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { backupCodes };
}

export async function resetUserMfa(
  userId: string,
  meta: { actorId: string; tenantId: string | null; ip?: string; userAgent?: string },
) {
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
  });
  if (!user) {
    throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  await db
    .update(users)
    .set({
      mfaEnabled: false,
      mfaSecretEnc: null,
      mfaBackupCodesHash: null,
      updatedBy: meta.actorId,
      ...updateStamp(),
    })
    .where(eq(users.id, userId));
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  await writeAudit({
    action: 'MFA_RESET',
    resource: 'user',
    resourceId: userId,
    tenantId: user.tenantId ?? meta.tenantId,
    actorId: meta.actorId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return {
    id: user.id,
    email: user.email,
    mfaEnabled: false,
  };
}

export { signMfaToken };
