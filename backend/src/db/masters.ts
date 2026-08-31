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

export const BUSINESS_TYPE_ITEMS: MetadataItem[] = [
  { code: 'HEALTHCARE', name: 'General clinic', description: 'Family and general practice', sortOrder: 1, isActive: true },
  { code: 'DENTAL', name: 'Dental clinic', description: 'Dental and oral care', sortOrder: 2, isActive: true },
  { code: 'DERMATOLOGY', name: 'Dermatology clinic', description: 'Skin and cosmetic dermatology', sortOrder: 3, isActive: true },
  { code: 'PEDIATRIC', name: 'Pediatric clinic', description: 'Child and adolescent care', sortOrder: 4, isActive: true },
  { code: 'ORTHOPEDIC', name: 'Orthopedic clinic', description: 'Bone, joint, and sports injury', sortOrder: 5, isActive: true },
  { code: 'PHYSIOTHERAPY', name: 'Physiotherapy clinic', description: 'Rehab and physical therapy', sortOrder: 6, isActive: true },
  { code: 'GYNECOLOGY', name: 'Gynecology clinic', description: 'Women’s health', sortOrder: 7, isActive: true },
  { code: 'OPHTHALMOLOGY', name: 'Eye clinic', description: 'Vision and eye care', sortOrder: 8, isActive: true },
  { code: 'ENT', name: 'ENT clinic', description: 'Ear, nose, and throat', sortOrder: 9, isActive: true },
  { code: 'OTHER_CLINIC', name: 'Other clinic', description: 'Other clinic specialties', sortOrder: 10, isActive: true },
];

export const APPOINTMENT_TYPE_ITEMS: MetadataItem[] = [
  { code: 'CONSULTATION', name: 'Consultation', sortOrder: 1, isActive: true },
  { code: 'FOLLOW_UP', name: 'Follow-up', sortOrder: 2, isActive: true },
  { code: 'CHECK_UP', name: 'Check-up', sortOrder: 3, isActive: true },
  { code: 'PROCEDURE', name: 'Procedure', sortOrder: 4, isActive: true },
];

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
