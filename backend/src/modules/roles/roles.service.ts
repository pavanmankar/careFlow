import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { ERROR_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';
import { CreateRoleInput } from '@/shared/validation';
import { createStamps, db, liveRoleIds, nowMs, omitUndefined, updateStamp } from '@/db/client';
import { appModules, permissions, refreshTokens, rolePermissions, roles, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { AuthUser } from '@/modules/auth/auth.types';

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
  const { items } = await listRolesByFilter(and(eq(roles.tenantId, tenantId), eq(roles.isSystem, false)));
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
  return listRolesByFilter(and(eq(roles.tenantId, tenantId), eq(roles.isSystem, false)));
}

export async function listOwnerAssignableRoles() {
  const tenantId = requireTenant();
  return listRolesByFilter(
    and(eq(roles.tenantId, tenantId), or(eq(roles.isSystem, false), eq(roles.code, ROLE_CODES.DOCTOR))),
  );
}

export async function getRole(id: string) {
  const role = await requireRole(id);
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
  if (input.code === ROLE_CODES.SUPER_ADMIN || input.code === ROLE_CODES.TENANT_OWNER || input.code === ROLE_CODES.DOCTOR) {
    throw new AppError(ERROR_CODES.CONFLICT, 'This role code is reserved.', 409);
  }
  const exists = await db.query.roles.findFirst({ where: and(eq(roles.tenantId, tenantId), eq(roles.code, input.code)) });
  if (exists) {
    throw new AppError(ERROR_CODES.CONFLICT, 'A role with this name already exists.', 409);
  }
  const id = ULID.random();
  await db.insert(roles).values({
    id,
    tenantId,
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

export async function replaceRolePermissions(id: string, permissionCodes: string[], actor: AuthUser) {
  await requireRole(id);
  const uniqueCodes = [...new Set(permissionCodes)];
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
  return getRole(id);
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

async function requireRole(id: string) {
  const tenantId = requireTenant();
  const role = await db.query.roles.findFirst({ where: and(eq(roles.id, id), eq(roles.tenantId, tenantId)) });
  const live = role ? await liveRoleIds([role.id]) : new Set<string>();
  if (!role || role.isSystem || !live.has(role.id)) {
    throw new AppError(ERROR_CODES.ROLE_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return role;
}
