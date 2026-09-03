import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const id = (name = 'id') => char(name, { length: 36 });
const ms = (name: string) => bigint(name, { mode: 'bigint' });
const stamp = () => datetime({ fsp: 3, mode: 'date' });

export const metadata = mysqlTable(
  'metadata',
  {
    id: id().primaryKey(),
    key: varchar('key', { length: 64 }).notNull(),
    value: json('value').notNull(),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
  },
  (table) => [uniqueIndex('uk_metadata_key').on(table.key)],
);

export const appModules = mysqlTable(
  'modules',
  {
    id: id().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    sortOrder: int('sortOrder').notNull().default(0),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
  },
  (table) => [uniqueIndex('uk_modules_code').on(table.code)],
);

export const permissions = mysqlTable(
  'permissions',
  {
    id: id().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    action: varchar('action', { length: 32 }).notNull(),
    moduleId: id('moduleId').notNull(),
    sortOrder: int('sortOrder').notNull().default(0),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
  },
  (table) => [uniqueIndex('uk_permissions_code').on(table.code), index('idx_permissions_moduleId').on(table.moduleId)],
);

export const tenants = mysqlTable(
  'tenants',
  {
    id: id().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
    settings: json('settings'),
    subcriptionEnabled: boolean('subcriptionEnabled').notNull().default(true),
    subcriptionUntil: ms('subcriptionUntil'),
    subcriptionTrialDays: int('subcriptionTrialDays'),
    mfaAuthenticationEnabled: boolean('mfaAuthenticationEnabled'),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [index('idx_tenants_status').on(table.status)],
);

export const platformSettings = mysqlTable(
  'platform_settings',
  {
    id: id().primaryKey(),
    key: varchar('key', { length: 64 }).notNull(),
    value: json('value').notNull(),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
  },
  (table) => [uniqueIndex('uk_platform_settings_key').on(table.key)],
);

export const businesses = mysqlTable(
  'businesses',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    businessType: varchar('businessType', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legalName', { length: 255 }),
    description: text('description'),
    industry: varchar('industry', { length: 128 }),
    category: varchar('category', { length: 128 }),
    logo: varchar('logo', { length: 512 }),
    website: varchar('website', { length: 512 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    country: varchar('country', { length: 8 }),
    currency: varchar('currency', { length: 8 }).notNull().default('INR'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    address: json('address'),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
    settings: json('settings'),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    index('idx_businesses_tenantId').on(table.tenantId),
    index('idx_businesses_businessType').on(table.businessType),
    index('idx_businesses_tenantId_status').on(table.tenantId, table.status),
  ],
);

export const locations = mysqlTable(
  'locations',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    businessId: id('businessId').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    address: json('address'),
    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 255 }),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    latitude: decimal('latitude', { precision: 10, scale: 7, mode: 'number' }),
    longitude: decimal('longitude', { precision: 10, scale: 7, mode: 'number' }),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
    settings: json('settings'),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('uk_locations_businessId_code').on(table.businessId, table.code),
    index('idx_locations_tenantId').on(table.tenantId),
    index('idx_locations_tenantId_businessId').on(table.tenantId, table.businessId),
    index('idx_locations_tenantId_status').on(table.tenantId, table.status),
  ],
);

export const users = mysqlTable(
  'users',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId'),
    firstName: varchar('firstName', { length: 128 }).notNull(),
    lastName: varchar('lastName', { length: 128 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    passwordHash: varchar('passwordHash', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
    mfaEnabled: boolean('mfaEnabled').notNull().default(false),
    mfaSecretEnc: varchar('mfaSecretEnc', { length: 512 }),
    mfaBackupCodesHash: json('mfaBackupCodesHash'),
    lastLoginAt: stamp(),
    avatar: varchar('avatar', { length: 512 }),
    timezone: varchar('timezone', { length: 64 }),
    address: json('address'),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('uk_users_email').on(table.email),
    index('idx_users_tenantId').on(table.tenantId),
    index('idx_users_tenantId_status').on(table.tenantId, table.status),
    index('idx_users_email').on(table.email),
  ],
);

export const roles = mysqlTable(
  'roles',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId'),
    locationId: id('locationId'),
    name: varchar('name', { length: 128 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    description: varchar('description', { length: 512 }),
    isSystem: boolean('isSystem').notNull().default(false),
    templateCode: varchar('templateCode', { length: 64 }),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('uk_roles_tenantId_locationId_code').on(table.tenantId, table.locationId, table.code),
    index('idx_roles_tenantId').on(table.tenantId),
    index('idx_roles_tenantId_locationId').on(table.tenantId, table.locationId),
    index('idx_roles_code').on(table.code),
  ],
);

export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    roleId: id('roleId').notNull(),
    permissionId: id('permissionId').notNull(),
    createdAt: ms('createdAt').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('idx_role_permissions_permissionId').on(table.permissionId),
  ],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: id('userId').notNull(),
    roleId: id('roleId').notNull(),
    tenantId: id('tenantId').notNull(),
    locationId: id('locationId'),
    createdAt: ms('createdAt').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('idx_user_roles_tenantId').on(table.tenantId),
    index('idx_user_roles_tenantId_locationId').on(table.tenantId, table.locationId),
    index('idx_user_roles_roleId').on(table.roleId),
  ],
);

export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: id().primaryKey(),
    userId: id('userId').notNull(),
    tokenHash: varchar('tokenHash', { length: 255 }).notNull(),
    expiresAt: stamp().notNull(),
    revokedAt: stamp(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('userAgent', { length: 512 }),
    createdAt: ms('createdAt').notNull(),
  },
  (table) => [
    index('idx_refresh_tokens_userId').on(table.userId),
    index('idx_refresh_tokens_tokenHash').on(table.tokenHash),
  ],
);

export const patients = mysqlTable(
  'patients',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    locationId: id('locationId'),
    firstName: varchar('firstName', { length: 128 }).notNull(),
    lastName: varchar('lastName', { length: 128 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    gender: varchar('gender', { length: 32 }),
    bloodGroup: varchar('bloodGroup', { length: 16 }),
    dateOfBirth: stamp(),
    lastVisitAt: ms('lastVisitAt'),
    emergencyContactName: varchar('emergencyContactName', { length: 255 }),
    emergencyContactPhone: varchar('emergencyContactPhone', { length: 32 }),
    allergies: text('allergies'),
    chronicConditions: text('chronicConditions'),
    currentMedicines: text('currentMedicines'),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('patients_tenantId_locationId_phone_key').on(table.tenantId, table.locationId, table.phone),
    index('patients_tenantId_idx').on(table.tenantId),
    index('patients_tenantId_locationId_idx').on(table.tenantId, table.locationId),
  ],
);

export const doctorProfiles = mysqlTable(
  'doctor_profiles',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    locationId: id('locationId'),
    userId: id('userId').notNull(),
    specialty: varchar('specialty', { length: 128 }).notNull().default(''),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
  },
  (table) => [
    uniqueIndex('doctor_profiles_userId_key').on(table.userId),
    index('doctor_profiles_tenantId_idx').on(table.tenantId),
    index('doctor_profiles_tenantId_locationId_idx').on(table.tenantId, table.locationId),
  ],
);

export const appointments = mysqlTable(
  'appointments',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    locationId: id('locationId'),
    patientId: id('patientId').notNull(),
    doctorUserId: id('doctorUserId').notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    startsAt: ms('startsAt').notNull(),
    endsAt: ms('endsAt').notNull(),
    reasonForVisit: text('reasonForVisit'),
    pastHistory: text('pastHistory'),
    habits: text('habits'),
    internalNote: text('internalNote'),
    cancelReason: varchar('cancelReason', { length: 512 }),
    checkedInAt: ms('checkedInAt'),
    startedAt: ms('startedAt'),
    completedAt: ms('completedAt'),
    taxPercent: int('taxPercent').notNull().default(0),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    index('appointments_tenantId_idx').on(table.tenantId),
    index('appointments_tenantId_doctorUserId_startsAt_idx').on(table.tenantId, table.doctorUserId, table.startsAt),
    index('appointments_tenantId_patientId_idx').on(table.tenantId, table.patientId),
    index('appointments_tenantId_startsAt_idx').on(table.tenantId, table.startsAt),
    index('appointments_tenantId_locationId_startsAt_idx').on(table.tenantId, table.locationId, table.startsAt),
  ],
);

export const inventoryItems = mysqlTable(
  'inventory_items',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    locationId: id('locationId'),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 64 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    unit: varchar('unit', { length: 32 }).notNull(),
    quantity: int('quantity').notNull().default(0),
    maxQuantity: int('maxQuantity').notNull(),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('inventory_items_tenantId_locationId_sku_key').on(table.tenantId, table.locationId, table.sku),
    index('inventory_items_tenantId_idx').on(table.tenantId),
    index('inventory_items_tenantId_locationId_idx').on(table.tenantId, table.locationId),
  ],
);

const visitChild = () => ({
  id: id().primaryKey(),
  tenantId: id('tenantId').notNull(),
  appointmentId: id('appointmentId').notNull(),
  createdAt: ms('createdAt').notNull(),
  updatedAt: ms('updatedAt').notNull(),
  createdBy: id('createdBy'),
  updatedBy: id('updatedBy'),
  deletedAt: stamp(),
});

export const appointmentVitals = mysqlTable(
  'appointment_vitals',
  {
    ...visitChild(),
    bpSystolic: int('bpSystolic'),
    bpDiastolic: int('bpDiastolic'),
    pulse: int('pulse'),
    temperature: decimal('temperature', { precision: 4, scale: 1, mode: 'number' }),
    spo2: int('spo2'),
    weightKg: decimal('weightKg', { precision: 6, scale: 2, mode: 'number' }),
    heightCm: decimal('heightCm', { precision: 6, scale: 1, mode: 'number' }),
    bmi: decimal('bmi', { precision: 5, scale: 1, mode: 'number' }),
    recordedAt: ms('recordedAt'),
  },
  (table) => [
    uniqueIndex('appointment_vitals_appointmentId_key').on(table.appointmentId),
    index('appointment_vitals_tenantId_idx').on(table.tenantId),
  ],
);

export const appointmentProcedures = mysqlTable(
  'appointment_procedures',
  {
    ...visitChild(),
    examination: text('examination'),
    treatment: text('treatment'),
  },
  (table) => [
    uniqueIndex('appointment_procedures_appointmentId_key').on(table.appointmentId),
    index('appointment_procedures_tenantId_idx').on(table.tenantId),
  ],
);

export const appointmentMedicines = mysqlTable(
  'appointment_medicines',
  {
    ...visitChild(),
    medicine: varchar('medicine', { length: 255 }).notNull(),
    dose: varchar('dose', { length: 128 }),
    frequency: varchar('frequency', { length: 128 }),
    duration: varchar('duration', { length: 128 }),
    instructions: varchar('instructions', { length: 512 }),
  },
  (table) => [index('appointment_medicines_appointmentId_idx').on(table.appointmentId), index('appointment_medicines_tenantId_idx').on(table.tenantId)],
);

export const appointmentDocuments = mysqlTable(
  'appointment_documents',
  {
    ...visitChild(),
    fileName: varchar('fileName', { length: 255 }).notNull(),
    kind: varchar('kind', { length: 32 }).notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
  },
  (table) => [index('appointment_documents_appointmentId_idx').on(table.appointmentId), index('appointment_documents_tenantId_idx').on(table.tenantId)],
);

export const appointmentCharges = mysqlTable(
  'appointment_charges',
  {
    ...visitChild(),
    chargeFor: varchar('charge_for', { length: 255 }).notNull(),
    amount: int('amount').notNull().default(0),
    tax: int('tax').notNull().default(0),
    amountWithTax: int('amount_with_tax').notNull().default(0),
  },
  (table) => [index('appointment_charges_appointmentId_idx').on(table.appointmentId), index('appointment_charges_tenantId_idx').on(table.tenantId)],
);

export const appointmentLinks = mysqlTable(
  'appointment_links',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId').notNull(),
    mainAppointmentId: id('mainAppointmentId').notNull(),
    followUpAppointmentId: id('followUpAppointmentId').notNull(),
    createdAt: ms('createdAt').notNull(),
    updatedAt: ms('updatedAt').notNull(),
    createdBy: id('createdBy'),
    updatedBy: id('updatedBy'),
    deletedAt: stamp(),
  },
  (table) => [
    uniqueIndex('appointment_links_followUpAppointmentId_key').on(table.followUpAppointmentId),
    index('appointment_links_mainAppointmentId_idx').on(table.mainAppointmentId),
    index('appointment_links_tenantId_idx').on(table.tenantId),
  ],
);

export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId'),
    actorId: id('actorId'),
    action: varchar('action', { length: 64 }).notNull(),
    resource: varchar('resource', { length: 64 }).notNull(),
    resourceId: id('resourceId'),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('userAgent', { length: 512 }),
    createdAt: ms('createdAt').notNull(),
  },
  (table) => [
    index('audit_logs_tenantId_createdAt_idx').on(table.tenantId, table.createdAt),
    index('audit_logs_actorId_idx').on(table.actorId),
  ],
);

export const userConsentRecords = mysqlTable(
  'user_consent_records',
  {
    id: id().primaryKey(),
    userId: id('userId').notNull(),
    tenantId: id('tenantId'),
    documentType: varchar('documentType', { length: 32 }).notNull(),
    documentVersion: varchar('documentVersion', { length: 32 }).notNull(),
    acceptedAt: ms('acceptedAt').notNull(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('userAgent', { length: 512 }),
  },
  (table) => [
    index('user_consent_records_userId_documentType_idx').on(table.userId, table.documentType),
    index('user_consent_records_tenantId_idx').on(table.tenantId),
  ],
);

export const idempotencyKeys = mysqlTable(
  'idempotency_keys',
  {
    id: id().primaryKey(),
    tenantId: id('tenantId'),
    key: varchar('key', { length: 128 }).notNull(),
    method: varchar('method', { length: 16 }).notNull(),
    path: varchar('path', { length: 255 }).notNull(),
    requestHash: varchar('requestHash', { length: 64 }).notNull(),
    statusCode: int('statusCode').notNull(),
    responseBody: json('responseBody').notNull(),
    createdAt: ms('createdAt').notNull(),
    expiresAt: stamp().notNull(),
  },
  (table) => [
    uniqueIndex('uk_idempotency_keys_lookup').on(table.tenantId, table.key, table.method, table.path),
    index('idx_idempotency_keys_expiresAt').on(table.expiresAt),
  ],
);

export const appModulesRelations = relations(appModules, ({ many }) => ({
  permissions: many(permissions),
}));

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  module: one(appModules, { fields: [permissions.moduleId], references: [appModules.id] }),
  rolePermissions: many(rolePermissions),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  businesses: many(businesses),
  locations: many(locations),
  users: many(users),
  roles: many(roles),
  userRoles: many(userRoles),
  patients: many(patients),
  doctorProfiles: many(doctorProfiles),
  appointments: many(appointments),
  inventoryItems: many(inventoryItems),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  tenant: one(tenants, { fields: [businesses.tenantId], references: [tenants.id] }),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  tenant: one(tenants, { fields: [locations.tenantId], references: [tenants.id] }),
  business: one(businesses, { fields: [locations.businessId], references: [businesses.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  userRoles: many(userRoles),
  refreshTokens: many(refreshTokens),
  doctorProfile: one(doctorProfiles, { fields: [users.id], references: [doctorProfiles.userId] }),
  appointmentsAsDoctor: many(appointments, { relationName: 'AppointmentDoctor' }),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [roles.locationId], references: [locations.id] }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  tenant: one(tenants, { fields: [userRoles.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [userRoles.locationId], references: [locations.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [patients.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [patients.locationId], references: [locations.id] }),
  appointments: many(appointments),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  tenant: one(tenants, { fields: [inventoryItems.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [inventoryItems.locationId], references: [locations.id] }),
}));

export const doctorProfilesRelations = relations(doctorProfiles, ({ one }) => ({
  tenant: one(tenants, { fields: [doctorProfiles.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [doctorProfiles.locationId], references: [locations.id] }),
  user: one(users, { fields: [doctorProfiles.userId], references: [users.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [appointments.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [appointments.locationId], references: [locations.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(users, {
    fields: [appointments.doctorUserId],
    references: [users.id],
    relationName: 'AppointmentDoctor',
  }),
  vitals: one(appointmentVitals, { fields: [appointments.id], references: [appointmentVitals.appointmentId] }),
  procedures: one(appointmentProcedures, { fields: [appointments.id], references: [appointmentProcedures.appointmentId] }),
  medicines: many(appointmentMedicines),
  documents: many(appointmentDocuments),
  charges: many(appointmentCharges),
  followUpLinks: many(appointmentLinks, { relationName: 'LinkMain' }),
  asFollowUp: one(appointmentLinks, {
    fields: [appointments.id],
    references: [appointmentLinks.followUpAppointmentId],
    relationName: 'LinkFollowUp',
  }),
}));

export const appointmentVitalsRelations = relations(appointmentVitals, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentVitals.appointmentId], references: [appointments.id] }),
}));

export const appointmentProceduresRelations = relations(appointmentProcedures, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentProcedures.appointmentId], references: [appointments.id] }),
}));

export const appointmentMedicinesRelations = relations(appointmentMedicines, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentMedicines.appointmentId], references: [appointments.id] }),
}));

export const appointmentDocumentsRelations = relations(appointmentDocuments, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentDocuments.appointmentId], references: [appointments.id] }),
}));

export const appointmentChargesRelations = relations(appointmentCharges, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentCharges.appointmentId], references: [appointments.id] }),
}));

export const appointmentLinksRelations = relations(appointmentLinks, ({ one }) => ({
  main: one(appointments, {
    fields: [appointmentLinks.mainAppointmentId],
    references: [appointments.id],
    relationName: 'LinkMain',
  }),
  followUp: one(appointments, {
    fields: [appointmentLinks.followUpAppointmentId],
    references: [appointments.id],
    relationName: 'LinkFollowUp',
  }),
}));
