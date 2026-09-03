import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { locations } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getLocationId, getRequestContext, requireLocationId } from '@/lib/context';
import { ERROR_CODES } from '@/shared/types';

/** Ensures tenant has ≥1 active location and request has a valid X-Location-Id. */
export async function assertActiveLocation(message: string): Promise<string> {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  const [totalRow] = await db
    .select({ total: count() })
    .from(locations)
    .where(and(eq(locations.tenantId, tenantId), eq(locations.status, 'ACTIVE'), isNull(locations.deletedAt)));
  if (Number(totalRow?.total ?? 0) < 1) {
    throw new AppError(ERROR_CODES.LOCATION_REQUIRED, message, 400);
  }
  return requireLocationId();
}

export async function assertLocationForAppointments(): Promise<string> {
  return assertActiveLocation('Add a clinic location before booking appointments.');
}

export async function assertLocationForInventory(): Promise<string> {
  return assertActiveLocation('Add a clinic location before managing inventory.');
}

export async function assertLocationForPatients(): Promise<string> {
  return assertActiveLocation('Add a clinic location before managing patients.');
}

export async function assertLocationForDoctors(): Promise<string> {
  return assertActiveLocation('Add a clinic location before managing doctors.');
}

export async function assertLocationForUsers(): Promise<string> {
  return assertActiveLocation('Add a clinic location before managing staff.');
}

export async function assertLocationForRoles(): Promise<string> {
  return assertActiveLocation('Add a clinic location before managing roles.');
}

export function optionalActiveLocationId(): string | null {
  return getLocationId();
}

/** Require location for operational reads (non–super-admin). */
export function requireActiveLocationId(): string {
  return requireLocationId();
}
