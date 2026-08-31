import { eq } from 'drizzle-orm';
import { db, updateStamp } from '@/db/client';
import { platformSettings, tenants } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { ERROR_CODES } from '@/shared/types';

export const SUBCRIPTION_TRIAL_DAYS_KEY = 'subcription_trial_days';
export const DEFAULT_SUBCRIPTION_TRIAL_DAYS = 30;
export const DAY_MS = 86_400_000;

export type AppointmentsEntitlement = {
  allowed: boolean;
  subcriptionEnabled: boolean;
  subcriptionUntil: number | null;
  reason: 'disabled' | 'expired' | null;
};

function asNumber(value: bigint | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return typeof value === 'bigint' ? Number(value) : value;
}

export function evaluateAppointmentsEntitlement(input: {
  subcriptionEnabled: boolean | number | null | undefined;
  subcriptionUntil: bigint | number | null | undefined;
}): AppointmentsEntitlement {
  const subcriptionEnabled = Boolean(input.subcriptionEnabled);
  const subcriptionUntil = asNumber(input.subcriptionUntil);
  if (!subcriptionEnabled) {
    return { allowed: false, subcriptionEnabled: false, subcriptionUntil, reason: 'disabled' };
  }
  if (subcriptionUntil == null || utcNowMs() >= subcriptionUntil) {
    return { allowed: false, subcriptionEnabled: true, subcriptionUntil, reason: 'expired' };
  }
  return { allowed: true, subcriptionEnabled: true, subcriptionUntil, reason: null };
}

export async function getAppointmentsEntitlement(tenantId: string | null | undefined): Promise<AppointmentsEntitlement> {
  if (!tenantId) {
    return {
      allowed: false,
      subcriptionEnabled: false,
      subcriptionUntil: null,
      reason: null,
    };
  }
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) {
    return {
      allowed: false,
      subcriptionEnabled: false,
      subcriptionUntil: null,
      reason: null,
    };
  }
  return evaluateAppointmentsEntitlement(tenant);
}

export async function assertSubcriptionAccess(tenantId: string) {
  const entitlement = await getAppointmentsEntitlement(tenantId);
  if (entitlement.allowed) {
    return;
  }
  throw new AppError(
    ERROR_CODES.SUBSCRIPTION_REQUIRED,
    'A subscription is required to use Appointments and Calendar. Contact your platform administrator to restore access.',
    403,
  );
}

type TrialValue = { days?: unknown };

function parseTrialDays(value: unknown): number {
  const days = typeof value === 'object' && value !== null ? Number((value as TrialValue).days) : Number(value);
  if (!Number.isFinite(days) || days < 1) {
    return DEFAULT_SUBCRIPTION_TRIAL_DAYS;
  }
  return Math.min(Math.floor(days), 3650);
}

export async function getSubcriptionTrialDays(): Promise<number> {
  const row = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, SUBCRIPTION_TRIAL_DAYS_KEY),
  });
  if (!row) {
    return DEFAULT_SUBCRIPTION_TRIAL_DAYS;
  }
  return parseTrialDays(row.value);
}

export async function setSubcriptionTrialDays(days: number): Promise<number> {
  const next = parseTrialDays({ days });
  const now = BigInt(utcNowMs());
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, SUBCRIPTION_TRIAL_DAYS_KEY),
  });
  if (existing) {
    await db
      .update(platformSettings)
      .set({ value: { days: next }, updatedAt: now })
      .where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({
      id: ULID.random(),
      key: SUBCRIPTION_TRIAL_DAYS_KEY,
      value: { days: next },
      createdAt: now,
      updatedAt: now,
    });
  }
  return next;
}

export function trialUntilFromNow(trialDays: number, nowMs = utcNowMs()): bigint {
  return BigInt(nowMs + trialDays * DAY_MS);
}

export async function updateTenantSubscription(
  tenantId: string,
  input: {
    subcriptionEnabled?: boolean;
    subcriptionUntil?: number | null;
  },
  actorUserId: string,
) {
  await db
    .update(tenants)
    .set({
      updatedBy: actorUserId,
      ...updateStamp(),
      ...(input.subcriptionEnabled !== undefined ? { subcriptionEnabled: input.subcriptionEnabled } : {}),
      ...(input.subcriptionUntil !== undefined
        ? { subcriptionUntil: input.subcriptionUntil == null ? null : BigInt(input.subcriptionUntil) }
        : {}),
    })
    .where(eq(tenants.id, tenantId));
}
