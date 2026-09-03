export const METADATA_KEYS = {
  BUSINESS_TYPE: 'BUSINESS_TYPE',
  APPOINTMENT_TYPE: 'APPOINTMENT_TYPE',
} as const;

export type MetadataKey = (typeof METADATA_KEYS)[keyof typeof METADATA_KEYS];

export interface MetadataItem {
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  requiresParent?: boolean;
}

export function asMetadataItems(value: unknown): MetadataItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is MetadataItem => {
    return Boolean(item && typeof item === 'object' && typeof (item as MetadataItem).code === 'string' && typeof (item as MetadataItem).name === 'string');
  });
}

export function toPublicItem(item: MetadataItem) {
  return {
    id: item.code,
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    requiresParent: item.requiresParent ?? false,
  };
}
