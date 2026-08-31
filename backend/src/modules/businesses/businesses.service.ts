import { ERROR_CODES } from '@/shared/types';
import { and, eq, isNull } from 'drizzle-orm';
import { db, updateStamp } from '@/db/client';
import { businesses } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { findActiveMetadataItem } from '@/modules/metadata/metadata.service';
import { METADATA_KEYS } from '@/db/masters';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export async function getCurrentBusiness() {
  const tenantId = requireTenant();
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new AppError(ERROR_CODES.BUSINESS_NOT_FOUND, 'Business not found.', 404);
  }
  return serialize(business);
}

export async function updateCurrentBusiness(data: Record<string, unknown>, userId: string) {
  const current = await getCurrentBusiness();
  const website = data.website === '' ? null : data.website;
  const email = data.email === '' ? null : data.email;
  const patch: Record<string, unknown> = { updatedBy: userId, ...updateStamp() };
  for (const [key, value] of Object.entries({ ...data, website, email })) {
    if (value !== undefined && key !== 'updatedBy') {
      patch[key] = value;
    }
  }
  await db
    .update(businesses)
    .set(patch as Partial<typeof businesses.$inferInsert>)
    .where(eq(businesses.id, current.id));
  return getCurrentBusiness();
}

async function serialize(business: {
  id: string;
  tenantId: string;
  name: string;
  legalName: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  address: unknown;
  status: string;
  settings: unknown;
  businessType: string;
}) {
  const item = await findActiveMetadataItem(METADATA_KEYS.BUSINESS_TYPE, business.businessType);
  return {
    id: business.id,
    tenantId: business.tenantId,
    name: business.name,
    legalName: business.legalName,
    description: business.description,
    website: business.website,
    email: business.email,
    phone: business.phone,
    country: business.country,
    currency: business.currency,
    timezone: business.timezone,
    address: business.address,
    status: business.status,
    settings: business.settings,
    businessType: {
      id: business.businessType,
      code: business.businessType,
      name: item?.name ?? business.businessType,
    },
  };
}
