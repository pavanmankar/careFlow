import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { platformSettings, refreshTokens } from '@/db/schema';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';

export const MFA_AUTHENTICATION_ENABLED_KEY = 'mfa_authentication_enabled';

type MfaEnabledValue = { enabled?: unknown };

function parseEnabled(value: unknown): boolean {
  if (typeof value === 'object' && value !== null) {
    return Boolean((value as MfaEnabledValue).enabled);
  }
  return Boolean(value);
}

export async function getMfaAuthenticationEnabled(): Promise<boolean> {
  const row = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, MFA_AUTHENTICATION_ENABLED_KEY),
  });
  if (!row) {
    return false;
  }
  return parseEnabled(row.value);
}

export async function setMfaAuthenticationEnabled(enabled: boolean): Promise<boolean> {
  const next = Boolean(enabled);
  const previous = await getMfaAuthenticationEnabled();
  const now = BigInt(utcNowMs());
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, MFA_AUTHENTICATION_ENABLED_KEY),
  });
  if (existing) {
    await db
      .update(platformSettings)
      .set({ value: { enabled: next }, updatedAt: now })
      .where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({
      id: ULID.random(),
      key: MFA_AUTHENTICATION_ENABLED_KEY,
      value: { enabled: next },
      createdAt: now,
      updatedAt: now,
    });
  }
  if (next && !previous) {
    await db.delete(refreshTokens);
  }
  return next;
}
