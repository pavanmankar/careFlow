import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { tenants } from '@/db/schema';
import { getMfaAuthenticationEnabled } from '@/lib/mfa-settings';

export function isMfaExempt(tenantId: string | null): boolean {
  return tenantId === null;
}

export async function isTenantMfaRequired(tenantId: string): Promise<boolean> {
  const platformEnabled = await getMfaAuthenticationEnabled();
  if (!platformEnabled) {
    return false;
  }
  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)),
  });
  if (!tenant || tenant.mfaAuthenticationEnabled === false) {
    return false;
  }
  return true;
}

export async function requiresMfa(tenantId: string | null): Promise<boolean> {
  if (isMfaExempt(tenantId) || !tenantId) {
    return false;
  }
  return isTenantMfaRequired(tenantId);
}
