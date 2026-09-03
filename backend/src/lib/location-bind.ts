import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { createStamps, db, nowMs } from '@/db/client';
import { rolePermissions, roles, userRoles } from '@/db/schema';

/**
 * After a location is created:
 * - First location: backfill null locationId on roles / user_roles for the tenant.
 * - Additional locations: clone system roles (Owner, Doctor) + permissions from an existing located role set.
 */
export async function bindTenantToNewLocation(tenantId: string, locationId: string) {
  const source = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), isNotNull(roles.locationId), isNull(roles.deletedAt)),
  });

  if (!source?.locationId) {
    await db
      .update(roles)
      .set({ locationId })
      .where(and(eq(roles.tenantId, tenantId), isNull(roles.locationId), isNull(roles.deletedAt)));
    await db
      .update(userRoles)
      .set({ locationId })
      .where(and(eq(userRoles.tenantId, tenantId), isNull(userRoles.locationId)));
    return;
  }

  if (source.locationId === locationId) {
    return;
  }

  const sourceRoles = await db.query.roles.findMany({
    where: and(
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, source.locationId),
      eq(roles.isSystem, true),
      isNull(roles.deletedAt),
    ),
    with: { rolePermissions: true },
  });

  for (const role of sourceRoles) {
    const already = await db.query.roles.findFirst({
      where: and(
        eq(roles.tenantId, tenantId),
        eq(roles.locationId, locationId),
        eq(roles.code, role.code),
        isNull(roles.deletedAt),
      ),
    });
    if (already) {
      continue;
    }
    const newRoleId = ULID.random();
    await db.insert(roles).values({
      id: newRoleId,
      tenantId,
      locationId,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      templateCode: role.templateCode,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      ...createStamps(),
    });
    if (role.rolePermissions.length) {
      await db.insert(rolePermissions).values(
        role.rolePermissions.map((rp) => ({
          roleId: newRoleId,
          permissionId: rp.permissionId,
          createdAt: nowMs(),
        })),
      );
    }
  }
}
