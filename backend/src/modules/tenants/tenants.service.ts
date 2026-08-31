import { and, asc, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { hash } from 'argon2';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import {
  ALL_PERMISSION_CODES,
  DEFAULT_CLINIC_HOURS,
  DOCTOR_PERMISSION_CODES,
  ERROR_CODES,
  ENTITY_STATUS,
  ROLE_CODES,
  USER_STATUS,
} from '@/shared/types';
import { RegisterInput } from '@/shared/validation';
import { db, likeContains, updateStamp } from '@/db/client';
import {
  businesses,
  locations,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  tenants,
  userRoles,
  users,
} from '@/db/schema';
import { AppError } from '@/lib/errors';
import { requireBusinessType, listActiveMetadataItems } from '@/modules/metadata/metadata.service';
import { METADATA_KEYS } from '@/db/masters';
import {
  evaluateAppointmentsEntitlement,
  getSubcriptionTrialDays,
  trialUntilFromNow,
  updateTenantSubscription,
} from '@/lib/subscription';

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export async function listTenants(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection ?? 'desc';
  const matchingBusinesses = query.search
    ? db
        .select({ tenantId: businesses.tenantId })
        .from(businesses)
        .where(and(isNull(businesses.deletedAt), likeContains(businesses.name, query.search)))
    : null;
  const filters = [
    isNull(tenants.deletedAt),
    ...(query.search
      ? [or(likeContains(tenants.name, query.search), inArray(tenants.id, matchingBusinesses!))!]
      : []),
  ];
  const where = and(...filters);
  const [rows, totals] = await Promise.all([
    db.query.tenants.findMany({
      where,
      with: {
        businesses: {
          where: isNull(businesses.deletedAt),
          limit: 1,
        },
      },
      orderBy: sortDirection === 'asc' ? asc(tenants.createdAt) : desc(tenants.createdAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(tenants).where(where),
  ]);
  const tenantIds = rows.map((tenant) => tenant.id);
  const [owners, userRows] = await Promise.all([
    tenantIds.length
      ? db.query.userRoles.findMany({
          where: inArray(userRoles.tenantId, tenantIds),
          with: { role: true, user: true },
        })
      : Promise.resolve([]),
    tenantIds.length
      ? db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(and(inArray(users.tenantId, tenantIds), isNull(users.deletedAt)))
      : Promise.resolve([]),
  ]);
  const ownerByTenant = new Map(
    owners
      .filter((row) => row.role.code === ROLE_CODES.TENANT_OWNER && row.user.deletedAt === null)
      .map((row) => [
        row.tenantId,
        {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          email: row.user.email,
        },
      ]),
  );
  const countByTenant = new Map<string, number>();
  for (const row of userRows) {
    if (!row.tenantId) {
      continue;
    }
    countByTenant.set(row.tenantId, (countByTenant.get(row.tenantId) ?? 0) + 1);
  }

  const typeNames = new Map(
    (await listActiveMetadataItems(METADATA_KEYS.BUSINESS_TYPE)).map((item) => [item.code, item.name]),
  );

  return {
    items: rows.map((tenant) => {
      const business = tenant.businesses[0] ?? null;
      const entitlement = evaluateAppointmentsEntitlement(tenant);
      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.createdAt,
        subcriptionEnabled: entitlement.subcriptionEnabled,
        subcriptionUntil: entitlement.subcriptionUntil,
        appointmentsAccess: entitlement,
        business: business
          ? {
              id: business.id,
              name: business.name,
              businessType: typeNames.get(business.businessType) ?? business.businessType,
              businessTypeCode: business.businessType,
            }
          : null,
        owner: ownerByTenant.get(tenant.id) ?? null,
        employeeCount: countByTenant.get(tenant.id) ?? 0,
      };
    }),
    page,
    pageSize,
    total: Number(totals[0]?.total ?? 0),
  };
}

export async function provisionWorkspace(input: RegisterInput, actorUserId?: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase()) });
  if (existing) {
    throw new AppError(ERROR_CODES.DUPLICATE_EMAIL, 'An account with this email already exists.', 409);
  }

  const businessType = await requireBusinessType(input.businessTypeId);

  const passwordHash = await hash(input.password);
  const tenantId = ULID.random();
  const userId = ULID.random();
  const businessId = ULID.random();
  const actor = actorUserId ?? userId;
  const nowMs = utcNowMs();
  const now = BigInt(nowMs);
  const trialDays = await getSubcriptionTrialDays();
  const allPermissions = await db.select().from(permissions);
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  await db.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id: tenantId,
      name: input.businessName,
      status: ENTITY_STATUS.ACTIVE,
      subcriptionEnabled: true,
      subcriptionUntil: trialUntilFromNow(trialDays, nowMs),
      subcriptionTrialDays: null,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(users).values({
      id: userId,
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash,
      status: USER_STATUS.ACTIVE,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(businesses).values({
      id: businessId,
      tenantId,
      businessType: businessType.code,
      name: input.businessName,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      country: 'IN',
      status: ENTITY_STATUS.ACTIVE,
      settings: { ...DEFAULT_CLINIC_HOURS },
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    const ownerRoleId = ULID.random();
    await tx.insert(roles).values({
      id: ownerRoleId,
      tenantId,
      name: 'Owner',
      code: ROLE_CODES.TENANT_OWNER,
      description: 'Full access to the clinic',
      isSystem: true,
      templateCode: ROLE_CODES.TENANT_OWNER,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    const ownerPerms = ALL_PERMISSION_CODES.map((code) => permissionByCode.get(code)).filter((id): id is string => Boolean(id));
    if (ownerPerms.length) {
      await tx.insert(rolePermissions).values(ownerPerms.map((permissionId) => ({ roleId: ownerRoleId, permissionId, createdAt: now })));
    }
    await tx.insert(userRoles).values({ userId, roleId: ownerRoleId, tenantId, createdAt: now });
    const doctorRoleId = ULID.random();
    await tx.insert(roles).values({
      id: doctorRoleId,
      tenantId,
      name: 'Doctor',
      code: ROLE_CODES.DOCTOR,
      description: 'See patients and book appointments',
      isSystem: true,
      templateCode: ROLE_CODES.DOCTOR,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    const doctorPerms = DOCTOR_PERMISSION_CODES.map((code) => permissionByCode.get(code)).filter((id): id is string => Boolean(id));
    if (doctorPerms.length) {
      await tx.insert(rolePermissions).values(doctorPerms.map((permissionId) => ({ roleId: doctorRoleId, permissionId, createdAt: now })));
    }
  });

  return { tenantId, userId };
}

export async function createTenant(input: RegisterInput, actorUserId: string) {
  const { tenantId } = await provisionWorkspace(input, actorUserId);
  return getTenant(tenantId);
}

export async function getCurrentTenant(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)),
  });
  if (!tenant) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace not found.', 404);
  }
  return { id: tenant.id, name: tenant.name, status: tenant.status };
}

export async function updateCurrentTenant(tenantId: string, input: { name?: string }, actorUserId: string) {
  await getCurrentTenant(tenantId);
  await db
    .update(tenants)
    .set({ ...(input.name !== undefined ? { name: input.name } : {}), updatedBy: actorUserId, ...updateStamp() })
    .where(eq(tenants.id, tenantId));
  return getCurrentTenant(tenantId);
}

export async function getTenant(id: string) {
  const tenant = await requireTenant(id);
  const [business, locationRows, userRows, typeItems] = await Promise.all([
    db.query.businesses.findFirst({
      where: and(eq(businesses.tenantId, id), isNull(businesses.deletedAt)),
    }),
    db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, id), isNull(locations.deletedAt)))
      .orderBy(asc(locations.name)),
    db.query.users.findMany({
      where: and(eq(users.tenantId, id), isNull(users.deletedAt)),
      with: { userRoles: { with: { role: true } } },
      orderBy: asc(users.firstName),
    }),
    listActiveMetadataItems(METADATA_KEYS.BUSINESS_TYPE),
  ]);
  const typeByCode = new Map(typeItems.map((item) => [item.code, item]));

  const addresses = [
    ...(business
      ? [
          {
            source: 'business' as const,
            name: business.name,
            phone: business.phone,
            address: asAddress(business.address),
          },
        ]
      : []),
    ...locationRows.map((location) => ({
      source: 'address' as const,
      name: location.name,
      phone: location.phone,
      address: asAddress(location.address),
    })),
  ].filter((row) => row.address || row.phone);

  const entitlement = evaluateAppointmentsEntitlement(tenant);
  return {
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    subcriptionEnabled: entitlement.subcriptionEnabled,
    subcriptionUntil: entitlement.subcriptionUntil,
    appointmentsAccess: entitlement,
    business: business
      ? {
          id: business.id,
          name: business.name,
          legalName: business.legalName,
          email: business.email,
          phone: business.phone,
          website: business.website,
          timezone: business.timezone,
          currency: business.currency,
          country: business.country,
          address: asAddress(business.address),
          status: business.status,
          businessType: (() => {
            const item = typeByCode.get(business.businessType);
            return {
              id: business.businessType,
              code: business.businessType,
              name: item?.name ?? business.businessType,
            };
          })(),
        }
      : null,
    addresses,
    employees: userRows.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name, code: ur.role.code })),
    })),
  };
}

export async function setTenantActive(id: string, active: boolean, actorUserId: string) {
  await requireTenant(id);
  const status = active ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  await db.transaction(async (tx) => {
    await tx.update(tenants).set({ status, updatedBy: actorUserId, ...updateStamp() }).where(eq(tenants.id, id));
    await tx
      .update(businesses)
      .set({ status, updatedBy: actorUserId, ...updateStamp() })
      .where(and(eq(businesses.tenantId, id), isNull(businesses.deletedAt)));
  });
  if (!active) {
    const tenantUsers = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, id));
    if (tenantUsers.length) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(inArray(refreshTokens.userId, tenantUsers.map((user) => user.id)), isNull(refreshTokens.revokedAt)));
    }
  }
  return getTenant(id);
}

export async function patchTenantSubscription(
  id: string,
  input: {
    subcriptionEnabled?: boolean;
    subcriptionUntil?: number | null;
  },
  actorUserId: string,
) {
  await requireTenant(id);
  await updateTenantSubscription(id, input, actorUserId);
  return getTenant(id);
}

async function requireTenant(id: string) {
  const tenant = await db.query.tenants.findFirst({ where: and(eq(tenants.id, id), isNull(tenants.deletedAt)) });
  if (!tenant) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace not found.', 404);
  }
  return tenant;
}

function asAddress(value: unknown): Address | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const address: Address = {
    line1: str(row.line1),
    line2: str(row.line2),
    city: str(row.city),
    state: str(row.state),
    postalCode: str(row.postalCode),
    country: str(row.country),
  };
  return Object.values(address).some(Boolean) ? address : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
