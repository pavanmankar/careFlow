import { eq } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';
import { createStamps, db, updateStamp } from '@/db/client';
import { metadata } from '@/db/schema';
import {
  APPOINTMENT_TYPE_ITEMS,
  BUSINESS_TYPE_ITEMS,
  METADATA_KEYS,
  asMetadataItems,
  toPublicItem,
  type MetadataItem,
  type MetadataKey,
} from '@/db/masters';

export async function getMetadataItems(key: MetadataKey) {
  const row = await db.query.metadata.findFirst({ where: eq(metadata.key, key) });
  return asMetadataItems(row?.value);
}

export async function listActiveMetadataItems(key: MetadataKey) {
  return getMetadataItems(key)
    .then((items) => items.filter((item) => item.isActive))
    .then((items) => [...items].sort((a, b) => a.sortOrder - b.sortOrder));
}

export async function findActiveMetadataItem(key: MetadataKey, codeOrName: string) {
  const items = await listActiveMetadataItems(key);
  const needle = codeOrName.trim().toLowerCase();
  return items.find((item) => item.code.toLowerCase() === needle || item.name.toLowerCase() === needle) ?? null;
}

export async function requireAppointmentType(type: string) {
  const item = await findActiveMetadataItem(METADATA_KEYS.APPOINTMENT_TYPE, type);
  if (!item) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Choose a valid appointment type.', 400);
  }
  return item;
}

export async function requireBusinessType(code: string) {
  const item = await findActiveMetadataItem(METADATA_KEYS.BUSINESS_TYPE, code);
  if (!item) {
    throw new AppError(ERROR_CODES.BUSINESS_TYPE_NOT_FOUND, 'Type of business was not found.', 404);
  }
  return item;
}

export async function upsertMetadata(key: MetadataKey, items: MetadataItem[]) {
  const existing = await db.query.metadata.findFirst({ where: eq(metadata.key, key) });
  if (existing) {
    await db
      .update(metadata)
      .set({ value: items, ...updateStamp() })
      .where(eq(metadata.id, existing.id));
    return;
  }
  await db.insert(metadata).values({
    id: ULID.random(),
    key,
    value: items,
    ...createStamps(),
  });
}

export async function seedMetadataMasters() {
  await upsertMetadata(METADATA_KEYS.BUSINESS_TYPE, BUSINESS_TYPE_ITEMS);
  await upsertMetadata(METADATA_KEYS.APPOINTMENT_TYPE, APPOINTMENT_TYPE_ITEMS);
}

export function serializeMetadataItem(item: MetadataItem) {
  return toPublicItem(item);
}
