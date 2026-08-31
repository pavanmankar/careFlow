import { ERROR_CODES } from '@/shared/types';
import { AppError } from '@/lib/errors';
import { METADATA_KEYS } from '@/db/masters';
import {
  getMetadataItems,
  listActiveMetadataItems,
  serializeMetadataItem,
  upsertMetadata,
} from '@/modules/metadata/metadata.service';

export async function listActiveBusinessTypes() {
  const items = await listActiveMetadataItems(METADATA_KEYS.BUSINESS_TYPE);
  return { items: items.map(serializeMetadataItem) };
}

export async function createBusinessType(input: {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const items = await getMetadataItems(METADATA_KEYS.BUSINESS_TYPE);
  if (items.some((item) => item.code === input.code)) {
    throw new AppError(ERROR_CODES.CONFLICT, 'A business type with this code already exists.', 409);
  }
  const next = [
    ...items,
    {
      code: input.code,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? items.length + 1,
    },
  ];
  await upsertMetadata(METADATA_KEYS.BUSINESS_TYPE, next);
  return serializeMetadataItem(next[next.length - 1]);
}

export async function updateBusinessType(
  code: string,
  input: {
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const items = await getMetadataItems(METADATA_KEYS.BUSINESS_TYPE);
  const index = items.findIndex((item) => item.code === code);
  if (index < 0) {
    throw new AppError(ERROR_CODES.BUSINESS_TYPE_NOT_FOUND, 'Business type not found.', 404);
  }
  const nextCode = input.code ?? items[index].code;
  if (nextCode !== code && items.some((item) => item.code === nextCode)) {
    throw new AppError(ERROR_CODES.CONFLICT, 'A business type with this code already exists.', 409);
  }
  items[index] = {
    ...items[index],
    ...input,
    code: nextCode,
  };
  await upsertMetadata(METADATA_KEYS.BUSINESS_TYPE, items);
  return serializeMetadataItem(items[index]);
}
