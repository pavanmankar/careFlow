import { hash } from 'argon2';
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { closeDb, createStamps, db, nowMs, updateStamp } from './client';
import { appModules, businesses, permissions, rolePermissions, roles, tenants, userRoles, users } from './schema';
import { ULID } from '../lib/id';
import { migrateVisitSchema } from './migrate-visit';
import { migrateInventorySchema } from './migrate-inventory';
import { migrateBusinessTypesToMetadata } from './migrate-metadata';
import { migrateSubscriptionSchema } from './migrate-subscription';
import { seedMetadataMasters } from '@/modules/metadata/metadata.service';

export const MODULES = [
  { code: 'BUSINESS', name: 'Business', sortOrder: 1 },
  { code: 'LOCATIONS', name: 'Locations', sortOrder: 2 },
  { code: 'STAFF', name: 'Staff', sortOrder: 3 },
  { code: 'ROLES', name: 'Roles', sortOrder: 4 },
  { code: 'PATIENTS', name: 'Patients', sortOrder: 5 },
  { code: 'DOCTORS', name: 'Doctors', sortOrder: 6 },
  { code: 'APPOINTMENTS', name: 'Appointments', sortOrder: 7 },
  { code: 'INVENTORY', name: 'Inventory', sortOrder: 8 },
] as const;

export const PERMISSIONS = [
  { module: 'BUSINESS', code: 'BUSINESS_READ', name: 'View business', action: 'view', sortOrder: 1 },
  { module: 'BUSINESS', code: 'BUSINESS_UPDATE', name: 'Update business', action: 'update', sortOrder: 2 },
  { module: 'LOCATIONS', code: 'LOCATION_READ', name: 'View locations', action: 'view', sortOrder: 1 },
  { module: 'LOCATIONS', code: 'LOCATION_CREATE', name: 'Add location', action: 'create', sortOrder: 2 },
  { module: 'LOCATIONS', code: 'LOCATION_UPDATE', name: 'Update location', action: 'update', sortOrder: 3 },
  { module: 'LOCATIONS', code: 'LOCATION_DELETE', name: 'Delete location', action: 'delete', sortOrder: 4 },
  { module: 'STAFF', code: 'STAFF_READ', name: 'View staff', action: 'view', sortOrder: 1 },
  { module: 'STAFF', code: 'STAFF_CREATE', name: 'Add staff', action: 'create', sortOrder: 2 },
  { module: 'STAFF', code: 'STAFF_UPDATE', name: 'Update staff', action: 'update', sortOrder: 3 },
  { module: 'STAFF', code: 'STAFF_ACTIVATE', name: 'Activate / deactivate staff', action: 'activate', sortOrder: 4 },
  { module: 'ROLES', code: 'ROLE_READ', name: 'View roles', action: 'view', sortOrder: 1 },
  { module: 'ROLES', code: 'ROLE_CREATE', name: 'Create role', action: 'create', sortOrder: 2 },
  { module: 'ROLES', code: 'ROLE_UPDATE', name: 'Update role', action: 'update', sortOrder: 3 },
  { module: 'ROLES', code: 'ROLE_DELETE', name: 'Delete role', action: 'delete', sortOrder: 4 },
  { module: 'ROLES', code: 'ROLE_ASSIGN_PERMISSIONS', name: 'Assign permissions', action: 'assign', sortOrder: 5 },
  { module: 'ROLES', code: 'USER_ASSIGN_ROLE', name: 'Assign role to user', action: 'assign_role', sortOrder: 6 },
  { module: 'PATIENTS', code: 'PATIENT_READ', name: 'View patients', action: 'view', sortOrder: 1 },
  { module: 'DOCTORS', code: 'DOCTOR_READ', name: 'View doctors', action: 'view', sortOrder: 1 },
  { module: 'DOCTORS', code: 'DOCTOR_CREATE', name: 'Add doctor', action: 'create', sortOrder: 2 },
  { module: 'DOCTORS', code: 'DOCTOR_UPDATE', name: 'Update doctor', action: 'update', sortOrder: 3 },
  { module: 'DOCTORS', code: 'DOCTOR_ACTIVATE', name: 'Activate / deactivate doctor', action: 'activate', sortOrder: 4 },
  { module: 'APPOINTMENTS', code: 'APPOINTMENT_READ', name: 'View appointments', action: 'view', sortOrder: 1 },
  { module: 'APPOINTMENTS', code: 'APPOINTMENT_CREATE', name: 'Book appointments', action: 'create', sortOrder: 2 },
  { module: 'APPOINTMENTS', code: 'APPOINTMENT_UPDATE', name: 'Update visit chart', action: 'update', sortOrder: 3 },
  { module: 'INVENTORY', code: 'INVENTORY_READ', name: 'View inventory', action: 'view', sortOrder: 1 },
  { module: 'INVENTORY', code: 'INVENTORY_CREATE', name: 'Add stock', action: 'create', sortOrder: 2 },
  { module: 'INVENTORY', code: 'INVENTORY_UPDATE', name: 'Update stock', action: 'update', sortOrder: 3 },
] as const;

async function seedMasters() {
  await migrateBusinessTypesToMetadata();
  await migrateVisitSchema();
  await migrateInventorySchema();
  await migrateSubscriptionSchema();
  await seedMetadataMasters();
  const now = nowMs();

  for (const mod of MODULES) {
    await db
      .insert(appModules)
      .values({
        id: ULID.random(),
        code: mod.code,
        name: mod.name,
        sortOrder: mod.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: { name: mod.name, sortOrder: mod.sortOrder, updatedAt: now },
      });
  }

  const modules = await db.select().from(appModules);
  const moduleByCode = new Map(modules.map((m) => [m.code, m]));

  for (const perm of PERMISSIONS) {
    const module = moduleByCode.get(perm.module);
    if (!module) {
      throw new Error(`Missing module ${perm.module}`);
    }
    await db
      .insert(permissions)
      .values({
        id: ULID.random(),
        code: perm.code,
        name: perm.name,
        action: perm.action,
        moduleId: module.id,
        sortOrder: perm.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: perm.name,
          action: perm.action,
          moduleId: module.id,
          sortOrder: perm.sortOrder,
          updatedAt: now,
        },
      });
  }
}

async function seedSuperAdmin() {
  const email = 'superadmin@gmail.com';
  const existing =
    (await db.query.users.findFirst({ where: eq(users.email, email) })) ??
    (await db.query.users.findFirst({ where: eq(users.email, 'platform@localhost') }));
  const passwordHash = await hash('PlatformAdmin!234');
  const userId = existing?.id ?? ULID.random();

  if (existing) {
    await db
      .update(users)
      .set({
        email,
        firstName: 'Platform',
        lastName: 'Admin',
        status: 'ACTIVE',
        ...updateStamp(),
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      id: userId,
      tenantId: null,
      firstName: 'Platform',
      lastName: 'Admin',
      email,
      passwordHash,
      status: 'ACTIVE',
      ...createStamps(),
    });
  }

  let role = await db.query.roles.findFirst({
    where: and(isNull(roles.tenantId), eq(roles.code, 'SUPER_ADMIN')),
  });
  if (!role) {
    const id = ULID.random();
    await db.insert(roles).values({
      id,
      tenantId: null,
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Platform administrator',
      isSystem: true,
      templateCode: 'SUPER_ADMIN',
      ...createStamps(),
    });
    role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  }

  return { userId, roleId: role!.id };
}

async function removeDefaultTenantRoles() {
  const extra = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.isSystem, true), ne(roles.code, 'SUPER_ADMIN'), ne(roles.code, 'TENANT_OWNER'), ne(roles.code, 'DOCTOR')));
  const ids = extra.map((role) => role.id);
  if (!ids.length) {
    return;
  }
  await db.delete(userRoles).where(inArray(userRoles.roleId, ids));
  await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, ids));
  await db.delete(roles).where(inArray(roles.id, ids));
}

async function backfillClinicScheduling() {
  const now = nowMs();
  const allPermissions = await db.select().from(permissions);
  const permissionByCode = new Map(allPermissions.map((permission) => [permission.code, permission.id]));
  const doctorCodes = ['BUSINESS_READ', 'PATIENT_READ', 'DOCTOR_READ', 'DOCTOR_UPDATE', 'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE'];
  const tenantRows = await db.select({ id: tenants.id }).from(tenants).where(isNull(tenants.deletedAt));

  for (const tenant of tenantRows) {
    const owner = await db.query.roles.findFirst({
      where: and(eq(roles.tenantId, tenant.id), eq(roles.code, 'TENANT_OWNER'), isNull(roles.deletedAt)),
    });
    if (owner) {
      for (const permission of allPermissions) {
        await db
          .insert(rolePermissions)
          .values({ roleId: owner.id, permissionId: permission.id, createdAt: now })
          .onDuplicateKeyUpdate({ set: { createdAt: sql`createdAt` } });
      }
    }

    let doctor = await db.query.roles.findFirst({
      where: and(eq(roles.tenantId, tenant.id), eq(roles.code, 'DOCTOR')),
    });
    if (!doctor) {
      const id = ULID.random();
      await db.insert(roles).values({
        id,
        tenantId: tenant.id,
        name: 'Doctor',
        code: 'DOCTOR',
        description: 'See patients and book appointments',
        isSystem: true,
        templateCode: 'DOCTOR',
        createdAt: now,
        updatedAt: now,
      });
      doctor = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    }
    if (!doctor) {
      continue;
    }
    for (const code of doctorCodes) {
      const permissionId = permissionByCode.get(code);
      if (!permissionId) {
        continue;
      }
      await db
        .insert(rolePermissions)
        .values({ roleId: doctor.id, permissionId, createdAt: now })
        .onDuplicateKeyUpdate({ set: { createdAt: sql`createdAt` } });
    }

    const business = await db.query.businesses.findFirst({
      where: and(eq(businesses.tenantId, tenant.id), isNull(businesses.deletedAt)),
    });
    if (business) {
      const current =
        business.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
          ? (business.settings as Record<string, unknown>)
          : {};
      if (typeof current.openTime !== 'string' || typeof current.closeTime !== 'string') {
        await db
          .update(businesses)
          .set({
            settings: { ...current, openTime: '09:00', closeTime: '21:00' },
            updatedAt: now,
          })
          .where(eq(businesses.id, business.id));
      }
    }
  }
}

async function main() {
  await seedMasters();
  await seedSuperAdmin();
  await removeDefaultTenantRoles();
  await backfillClinicScheduling();
  console.log('Seed complete: metadata, modules, permissions, platform admin (superadmin@gmail.com / PlatformAdmin!234)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
