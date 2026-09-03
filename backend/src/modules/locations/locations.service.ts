import { ULID } from '@/lib/id';
import { and, asc, count, desc, eq, isNull, or } from 'drizzle-orm';
import { ERROR_CODES } from '@/shared/types';
import { CreateLocationInput } from '@/shared/validation';
import { createStamps, db, likeContains, omitUndefined, updateStamp } from '@/db/client';
import { businesses, doctorProfiles, locations, patients } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { bindTenantToNewLocation } from '@/lib/location-bind';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export async function listLocations(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const tenantId = requireTenant();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection ?? 'asc';
  const filters = [
    eq(locations.tenantId, tenantId),
    isNull(locations.deletedAt),
    ...(query.search
      ? [or(likeContains(locations.name, query.search), likeContains(locations.code, query.search))!]
      : []),
  ];
  const where = and(...filters);
  const sortColumn = query.sortBy === 'code' ? locations.code : locations.name;
  const [items, totals] = await Promise.all([
    db
      .select()
      .from(locations)
      .where(where)
      .orderBy(sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(locations).where(where),
  ]);
  return { items, page, pageSize, total: Number(totals[0]?.total ?? 0) };
}

export async function getLocation(id: string) {
  return requireLocation(id);
}

export async function createLocation(input: CreateLocationInput, userId: string) {
  const tenantId = requireTenant();
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new AppError(ERROR_CODES.BUSINESS_NOT_FOUND, 'Business not found.', 404);
  }
  const duplicate = await db.query.locations.findFirst({
    where: and(eq(locations.businessId, business.id), eq(locations.code, input.code), isNull(locations.deletedAt)),
  });
  if (duplicate) {
    throw new AppError(ERROR_CODES.CONFLICT, 'A location with this code already exists.', 409);
  }
  const priorCount = await db
    .select({ total: count() })
    .from(locations)
    .where(and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)));
  const isFirstLocation = Number(priorCount[0]?.total ?? 0) === 0;

  const id = ULID.random();
  await db.insert(locations).values({
    id,
    tenantId,
    businessId: business.id,
    name: input.name,
    code: input.code,
    phone: input.phone ?? null,
    email: input.email || null,
    timezone: input.timezone ?? business.timezone,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    address: input.address ?? null,
    status: input.status ?? 'ACTIVE',
    createdBy: userId,
    updatedBy: userId,
    ...createStamps(),
  });

  await bindTenantToNewLocation(tenantId, id);

  if (isFirstLocation) {
    await db
      .update(patients)
      .set({ locationId: id })
      .where(and(eq(patients.tenantId, tenantId), isNull(patients.locationId), isNull(patients.deletedAt)));
    await db
      .update(doctorProfiles)
      .set({ locationId: id })
      .where(and(eq(doctorProfiles.tenantId, tenantId), isNull(doctorProfiles.locationId)));
  }

  return requireLocation(id);
}

export async function updateLocation(id: string, input: Partial<CreateLocationInput>, userId: string) {
  await requireLocation(id);
  const { email, ...rest } = input;
  await db
    .update(locations)
    .set({
      ...omitUndefined(rest as Record<string, unknown>),
      ...(email !== undefined ? { email: email === '' ? null : email } : {}),
      updatedBy: userId,
      ...updateStamp(),
    })
    .where(eq(locations.id, id));
  return requireLocation(id);
}

export async function removeLocation(id: string, userId: string) {
  await requireLocation(id);
  await db
    .update(locations)
    .set({ deletedAt: new Date(), status: 'INACTIVE', updatedBy: userId, ...updateStamp() })
    .where(eq(locations.id, id));
  return { deleted: true };
}

async function requireLocation(id: string) {
  const tenantId = requireTenant();
  const location = await db.query.locations.findFirst({
    where: and(eq(locations.id, id), eq(locations.tenantId, tenantId), isNull(locations.deletedAt)),
  });
  if (!location) {
    throw new AppError(ERROR_CODES.LOCATION_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return location;
}
