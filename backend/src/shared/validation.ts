import { z } from 'zod';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from '@/shared/types';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(255)
  .refine((value) => /^[^\s@]+@[^\s@]+$/.test(value), 'Enter a valid email');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(2000).default(10),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const DASHBOARD_PERIODS = ['current', 'last', '3m', '6m', '1y', 'custom'] as const;

export const dashboardQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).default('current'),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
});

export const addressSchema = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional(),
  city: z.string().max(128).optional(),
  state: z.string().max(128).optional(),
  postalCode: z.string().max(32).optional(),
  country: z.string().max(128).optional(),
});

export const registerSchema = z.object({
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  email: emailSchema,
  password: z.string().min(8).max(128),
  businessTypeId: z.string().min(1),
  businessName: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(32).optional().nullable(),
  country: z.string().max(8).optional().nullable(),
  currency: z.string().max(8).optional(),
  timezone: z.string().max(64).optional(),
  address: addressSchema.optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const createLocationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(64),
  phone: z.string().max(32).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  timezone: z.string().max(64).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: addressSchema.optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  email: emailSchema,
  phone: z.string().max(32).optional().nullable(),
  roleIds: z.array(z.string().min(1)).min(1),
  timezone: z.string().max(64).optional().nullable(),
  address: addressSchema.optional().nullable(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(128).optional(),
  lastName: z.string().min(1).max(128).optional(),
  phone: z.string().max(32).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  address: addressSchema.optional().nullable(),
});

export const updateMeSchema = z.object({
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  phone: z.string().min(1).max(32),
  timezone: z.string().max(64).optional().nullable(),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1),
});

export const updateMeRolesSchema = z.object({
  extraRoleIds: z.array(z.string().min(1)).optional(),
});

export const updateDoctorSchema = z.object({
  firstName: z.string().min(1).max(128).optional(),
  lastName: z.string().min(1).max(128).optional(),
  phone: z.string().max(32).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  specialty: z.string().max(128).optional(),
  address: addressSchema.optional().nullable(),
});

export const createDoctorSchema = z.object({
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  email: emailSchema,
  phone: z.string().min(1).max(32),
  specialty: z.string().min(1).max(128),
  timezone: z.string().max(64).optional().nullable(),
  address: z.object({
    line1: z.string().min(1).max(255),
    line2: z.string().min(1).max(255),
    city: z.string().min(1).max(128),
    state: z.string().min(1).max(128),
    postalCode: z.string().min(1).max(32),
    country: z.string().min(1).max(128),
  }),
});

export const createAppointmentSchema = z.object({
  doctorUserId: z.string().min(1),
  type: z.string().min(1).max(64),
  startsAt: z.number().int().positive(),
  reasonForVisit: z.string().max(4000).optional().nullable(),
  patient: z.object({
    firstName: z.string().min(1).max(128),
    lastName: z.string().min(1).max(128),
    phone: z.string().min(5).max(32),
    gender: z.string().min(1).max(32),
    bloodGroup: z.string().min(1).max(16),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required.'),
  }),
});

export const appointmentQuerySchema = paginationQuerySchema.extend({
  type: z.string().optional(),
  status: z.string().optional(),
  doctorUserId: z.string().optional(),
  patientId: z.string().optional(),
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
});

const optionalInt = z.union([z.number().int(), z.null()]).optional();
const optionalNum = z.union([z.number(), z.null()]).optional();
const optionalText = z.union([z.string(), z.null()]).optional();

export const updateVisitSchema = z.object({
  reasonForVisit: optionalText,
  pastHistory: optionalText,
  habits: optionalText,
  internalNote: optionalText,
  taxPercent: z.number().int().min(0).max(100).optional(),
  patient: z
    .object({
      emergencyContactName: optionalText,
      emergencyContactPhone: optionalText,
      allergies: optionalText,
      chronicConditions: optionalText,
      currentMedicines: optionalText,
    })
    .optional(),
  vitals: z
    .object({
      bpSystolic: optionalInt,
      bpDiastolic: optionalInt,
      pulse: optionalInt,
      temperature: optionalNum,
      spo2: optionalInt,
      weightKg: optionalNum,
      heightCm: optionalNum,
      bmi: optionalNum,
      recordedAt: optionalInt,
    })
    .nullable()
    .optional(),
  procedures: z
    .object({
      examination: optionalText,
      treatment: optionalText,
    })
    .nullable()
    .optional(),
  medicines: z
    .array(
      z.object({
        id: z.string().optional(),
        medicine: z.string().min(1).max(255),
        dose: optionalText,
        frequency: optionalText,
        duration: optionalText,
        instructions: optionalText,
      }),
    )
    .optional(),
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        fileName: z.string().min(1).max(255),
        kind: z.enum(['Consent', 'X-ray', 'Photo']),
        url: z.string().min(1).max(1024),
      }),
    )
    .optional(),
  charges: z
    .array(
      z.object({
        id: z.string().optional(),
        chargeFor: z.string().min(1).max(255),
        amount: z.number().int().min(0),
      }),
    )
    .optional(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().max(512).optional().nullable(),
});

export const rescheduleAppointmentSchema = z.object({
  startsAt: z.number().int().positive(),
});

export const doctorSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  excludeAppointmentId: z.string().min(1).optional(),
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(128),
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Use uppercase letters, numbers, and underscores'),
  description: z.string().max(512).optional().nullable(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional().nullable(),
});

export const replacePermissionsSchema = z.object({
  permissionCodes: z.array(z.string().min(1)),
});

export const createBusinessTypeSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateBusinessTypeSchema = createBusinessTypeSchema.partial();

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  sku: z.string().trim().max(64).optional().nullable(),
  category: z.enum(INVENTORY_CATEGORIES),
  unit: z.enum(INVENTORY_UNITS),
  quantity: z.coerce.number().int().min(0),
  maxQuantity: z.coerce.number().int().min(1),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  sku: z.string().trim().max(64).optional(),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  unit: z.enum(INVENTORY_UNITS).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  maxQuantity: z.coerce.number().int().min(1).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UpdateMeRolesInput = z.infer<typeof updateMeRolesSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
