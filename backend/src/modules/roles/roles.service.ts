import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { ERROR_CODES, PERMISSION_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';
import { CreateRoleInput } from '@/shared/validation';
import { createStamps, db, liveRoleIds, nowMs, omitUndefined, updateStamp } from '@/db/client';
import { appModules, permissions, refreshTokens, rolePermissions, roles, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { AuthUser } from '@/modules/auth/auth.types';
import { assertLocationForRoles, requireActiveLocationId } from '@/lib/location-scope';
import { getLocationId } from '@/lib/context';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

function serializeRole(role: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  createdAt: bigint;
  userRoles: Array<{ user?: { deletedAt: Date | null } | null }>;
  rolePermissions: Array<{ permission: { code: string } }>;
}) {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role.userRoles.filter((ur) => ur.user?.deletedAt == null).length,
    createdAt: role.createdAt,
    permissions: role.rolePermissions.map((rp) => rp.permission.code),
  };
}

async function listRolesByFilter(where: ReturnType<typeof and>) {
  const rows = await db.query.roles.findMany({
    where,
    with: {
      rolePermissions: { with: { permission: true } },
      userRoles: { with: { user: true } },
    },
    orderBy: asc(roles.name),
  });
  const live = await liveRoleIds(rows.map((role) => role.id));
  return { items: rows.filter((role) => live.has(role.id)).map(serializeRole) };
}

export async function listRoles(query: { page?: number; pageSize?: number } = {}) {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const { items } = await listRolesByFilter(
    and(eq(roles.tenantId, tenantId), eq(roles.locationId, locationId), eq(roles.isSystem, false)),
  );
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

export async function listAssignableRoles() {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  return listRolesByFilter(
    and(eq(roles.tenantId, tenantId), eq(roles.locationId, locationId), eq(roles.isSystem, false)),
  );
}

export async function listOwnerAssignableRoles() {
  const tenantId = requireTenant();
  let locationId = getLocationId();
  if (!locationId) {
    const first = await db.query.roles.findFirst({
      where: and(eq(roles.tenantId, tenantId), isNull(roles.deletedAt)),
    });
    locationId = first?.locationId ?? null;
  }
  if (!locationId) {
    return { items: [] };
  }
  return listRolesByFilter(
    and(
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, locationId),
      or(eq(roles.isSystem, false), eq(roles.code, ROLE_CODES.DOCTOR)),
    ),
  );
}

export async function getRole(id: string, options: { allowDoctorSystemRole?: boolean } = {}) {
  const role = await requireRole(id, options);
  const withPerms = await db.query.roles.findFirst({
    where: eq(roles.id, role.id),
    with: { rolePermissions: { with: { permission: true } }, userRoles: true },
  });
  return {
    id: withPerms!.id,
    name: withPerms!.name,
    code: withPerms!.code,
    description: withPerms!.description,
    isSystem: withPerms!.isSystem,
    userCount: withPerms!.userRoles.length,
    permissions: withPerms!.rolePermissions.map((rp) => rp.permission.code),
  };
}

export async function createRole(input: CreateRoleInput, actor: AuthUser) {
  const tenantId = requireTenant();
  const locationId = await assertLocationForRoles();
  if (input.code === ROLE_CODES.SUPER_ADMIN || input.code === ROLE_CODES.TENANT_OWNER || input.code === ROLE_CODES.DOCTOR) {
    throw new AppError(ERROR_CODES.CONFLICT, 'This role code is reserved.', 409);
  }
  const exists = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.locationId, locationId), eq(roles.code, input.code)),
  });
  if (exists) {
    throw new AppError(ERROR_CODES.CONFLICT, 'A role with this name already exists.', 409);
  }
  const id = ULID.random();
  await db.insert(roles).values({
    id,
    tenantId,
    locationId,
    name: input.name,
    code: input.code,
    description: input.description ?? null,
    isSystem: false,
    createdBy: actor.userId,
    updatedBy: actor.userId,
    ...createStamps(),
  });
  return getRole(id);
}

export async function updateRole(
  id: string,
  input: { name?: string; description?: string | null },
  actor: AuthUser,
) {
  await requireRole(id);
  await db
    .update(roles)
    .set({ ...omitUndefined(input as Record<string, unknown>), updatedBy: actor.userId, ...updateStamp() })
    .where(eq(roles.id, id));
  return getRole(id);
}

export async function removeRole(id: string, actor: AuthUser) {
  const role = await requireRole(id);
  const tenantId = requireTenant();
  const assigned = await db.query.userRoles.findMany({
    where: and(eq(userRoles.roleId, id), eq(userRoles.tenantId, tenantId)),
    with: { user: { with: { userRoles: { with: { role: true } } } } },
  });
  const now = new Date();
  const userIds = [
    ...new Set(
      assigned
        .filter((row) => {
          const user = row.user;
          if (user.deletedAt) {
            return false;
          }
          if (user.id === actor.userId) {
            return false;
          }
          if (user.userRoles.some((ur) => ur.role.code === ROLE_CODES.TENANT_OWNER)) {
            return false;
          }
          return true;
        })
        .map((row) => row.user.id),
    ),
  ];

  await db.transaction(async (tx) => {
    if (userIds.length) {
      await tx
        .update(users)
        .set({ deletedAt: now, status: USER_STATUS.INACTIVE, updatedBy: actor.userId, ...updateStamp() })
        .where(and(inArray(users.id, userIds), eq(users.tenantId, tenantId)));
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(and(inArray(refreshTokens.userId, userIds), isNull(refreshTokens.revokedAt)));
    }
    const nextCode = `${role.code.slice(0, 48)}_${role.id.slice(-8)}`.slice(0, 64);
    await tx
      .update(roles)
      .set({ deletedAt: now, code: nextCode, updatedBy: actor.userId, ...updateStamp() })
      .where(eq(roles.id, role.id));
  });
  return { deleted: true };
}

export async function getDoctorRolePermissions() {
  const role = await requireDoctorSystemRole();
  return getRole(role.id, { allowDoctorSystemRole: true });
}

export async function replaceDoctorRolePermissions(permissionCodes: string[], actor: AuthUser) {
  const role = await requireDoctorSystemRole();
  const codes = [...new Set(permissionCodes)];
  if (!codes.includes(PERMISSION_CODES.DOCTOR_READ)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'The Doctor role must keep at least the “Read doctors” permission.',
      400,
    );
  }
  return replaceRolePermissions(role.id, codes, actor, { allowDoctorSystemRole: true });
}

export async function replaceRolePermissions(
  id: string,
  permissionCodes: string[],
  actor: AuthUser,
  options: { allowDoctorSystemRole?: boolean } = {},
) {
  const role = await findRoleForPermissions(id);
  const mergedOptions =
    role.code === ROLE_CODES.DOCTOR ? { ...options, allowDoctorSystemRole: true } : options;
  await requireRole(id, mergedOptions);
  const uniqueCodes = [...new Set(permissionCodes)];
  if (mergedOptions.allowDoctorSystemRole && role.code === ROLE_CODES.DOCTOR && !uniqueCodes.includes(PERMISSION_CODES.DOCTOR_READ)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'The Doctor role must keep at least the “Read doctors” permission.',
      400,
    );
  }
  const found = uniqueCodes.length
    ? await db.select().from(permissions).where(inArray(permissions.code, uniqueCodes))
    : [];
  if (found.length !== uniqueCodes.length) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'One or more permissions are invalid.', 400);
  }
  assertGrantAllowed(actor, uniqueCodes);
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (found.length) {
      await tx.insert(rolePermissions).values(found.map((p) => ({ roleId: id, permissionId: p.id, createdAt: nowMs() })));
    }
  });
  return getRole(id, mergedOptions);
}

export async function listPermissionCatalog(grouped: boolean) {
  const modules = await db.query.appModules.findMany({
    with: {
      permissions: {
        orderBy: (permission, { asc }) => [asc(permission.sortOrder)],
      },
    },
    orderBy: (mod, { asc }) => [asc(mod.sortOrder)],
  });
  if (grouped) {
    return {
      modules: modules.map((mod) => ({
        code: mod.code,
        name: mod.name,
        permissions: mod.permissions.map((p) => ({ code: p.code, name: p.name, action: p.action })),
      })),
    };
  }
  return {
    items: modules.flatMap((mod) =>
      mod.permissions.map((p) => ({
        code: p.code,
        name: p.name,
        action: p.action,
        module: mod.code,
      })),
    ),
  };
}

export async function listModules() {
  const items = await db.select().from(appModules).orderBy(asc(appModules.sortOrder));
  return { items };
}

function assertGrantAllowed(actor: AuthUser, codes: string[]) {
  if (actor.roles.includes(ROLE_CODES.SUPER_ADMIN) || actor.roles.includes(ROLE_CODES.TENANT_OWNER)) {
    return;
  }
  const missing = codes.filter((code) => !actor.permissions.includes(code));
  if (missing.length) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'You can only grant permissions that you already have.', 403);
  }
}

async function requireDoctorSystemRole() {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const role =
    (await db.query.roles.findFirst({
      where: and(
        eq(roles.tenantId, tenantId),
        eq(roles.locationId, locationId),
        eq(roles.code, ROLE_CODES.DOCTOR),
        isNull(roles.deletedAt),
      ),
    })) ??
    (await db.query.roles.findFirst({
      where: and(
        eq(roles.tenantId, tenantId),
        isNull(roles.locationId),
        eq(roles.code, ROLE_CODES.DOCTOR),
        isNull(roles.deletedAt),
      ),
    }));
  const live = role ? await liveRoleIds([role.id]) : new Set<string>();
  if (!role || !live.has(role.id)) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'The Doctor role was not found for this branch.', 404);
  }
  return role;
}

async function findRoleForPermissions(id: string) {
  const tenantId = requireTenant();
  const role = await db.query.roles.findFirst({
    where: and(eq(roles.id, id), eq(roles.tenantId, tenantId), isNull(roles.deletedAt)),
  });
  if (!role) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return role;
}

async function requireRole(id: string, options: { allowDoctorSystemRole?: boolean } = {}) {
  const tenantId = requireTenant();
  const locationId = requireActiveLocationId();
  const role = await findRoleForPermissions(id);
  const atLocation =
    role.locationId === locationId || (options.allowDoctorSystemRole && role.code === ROLE_CODES.DOCTOR && role.locationId == null);
  const live = await liveRoleIds([role.id]);
  const editableDoctor = Boolean(options.allowDoctorSystemRole && role.code === ROLE_CODES.DOCTOR);
  if (!atLocation || !live.has(role.id) || (role.isSystem && !editableDoctor)) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return role;
}
