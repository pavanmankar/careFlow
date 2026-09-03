import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { locations, roles, userRoles } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { DEMO_VIEWER_ROLE_CODE } from '@/lib/public-demo';
import { ERROR_CODES, ROLE_CODES } from '@/shared/types';

/** Tenant owners, demo viewers, and super-admins can use any active location in the tenant. */
export function canAccessAllTenantLocations(roleCodes: string[]) {
  return (
    roleCodes.includes(ROLE_CODES.SUPER_ADMIN) ||
    roleCodes.includes(ROLE_CODES.TENANT_OWNER) ||
    roleCodes.includes(DEMO_VIEWER_ROLE_CODE)
  );
}

export async function listMembershipLocationIds(userId: string, tenantId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ locationId: userRoles.locationId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));
  return rows.map((row) => row.locationId).filter((id): id is string => Boolean(id));
}

export async function listAccessibleLocations(
  userId: string,
  tenantId: string,
  roleCodes: string[],
): Promise<Array<{ id: string; name: string; code: string; timezone: string; status: string }>> {
  const baseWhere = and(
    eq(locations.tenantId, tenantId),
    eq(locations.status, 'ACTIVE'),
    isNull(locations.deletedAt),
  );
  if (canAccessAllTenantLocations(roleCodes)) {
    return db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
        timezone: locations.timezone,
        status: locations.status,
      })
      .from(locations)
      .where(baseWhere)
      .orderBy(locations.name);
  }
  const membershipIds = await listMembershipLocationIds(userId, tenantId);
  if (!membershipIds.length) {
    return [];
  }
  return db
    .select({
      id: locations.id,
      name: locations.name,
      code: locations.code,
      timezone: locations.timezone,
      status: locations.status,
    })
    .from(locations)
    .where(and(baseWhere, inArray(locations.id, membershipIds)))
    .orderBy(locations.name);
}

export async function assertUserCanAccessLocation(
  userId: string,
  tenantId: string,
  locationId: string,
  roleCodes: string[],
) {
  if (canAccessAllTenantLocations(roleCodes)) {
    return;
  }
  const membershipIds = await listMembershipLocationIds(userId, tenantId);
  if (!membershipIds.includes(locationId)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'You do not have access to this branch.', 403);
  }
}

export async function findRoleByCode(tenantId: string, code: string, locationId: string | null) {
  return db.query.roles.findFirst({
    where: and(
      eq(roles.tenantId, tenantId),
      eq(roles.code, code),
      isNull(roles.deletedAt),
      locationId ? eq(roles.locationId, locationId) : isNull(roles.locationId),
    ),
  });
}
