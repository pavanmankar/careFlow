-- Master data: platform settings, metadata, modules, permissions, super admin
INSERT INTO `platform_settings` (`id`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFPLAT0000000000000001', 'subcription_trial_days', '{"days":30}', 1704067200000, 1704067200000),
  ('01HQCFPLAT0000000000000002', 'mfa_authentication_enabled', '{"enabled":false}', 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `metadata` (`id`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFMETA0000000000000001', 'BUSINESS_TYPE', '[{"code":"HEALTHCARE","name":"General clinic","description":"Family and general practice","sortOrder":1,"isActive":true},{"code":"DENTAL","name":"Dental clinic","description":"Dental and oral care","sortOrder":2,"isActive":true},{"code":"DERMATOLOGY","name":"Dermatology clinic","description":"Skin and cosmetic dermatology","sortOrder":3,"isActive":true},{"code":"PEDIATRIC","name":"Pediatric clinic","description":"Child and adolescent care","sortOrder":4,"isActive":true},{"code":"ORTHOPEDIC","name":"Orthopedic clinic","description":"Bone, joint, and sports injury","sortOrder":5,"isActive":true},{"code":"PHYSIOTHERAPY","name":"Physiotherapy clinic","description":"Rehab and physical therapy","sortOrder":6,"isActive":true},{"code":"GYNECOLOGY","name":"Gynecology clinic","description":"Women’s health","sortOrder":7,"isActive":true},{"code":"OPHTHALMOLOGY","name":"Eye clinic","description":"Vision and eye care","sortOrder":8,"isActive":true},{"code":"ENT","name":"ENT clinic","description":"Ear, nose, and throat","sortOrder":9,"isActive":true},{"code":"OTHER_CLINIC","name":"Other clinic","description":"Other clinic specialties","sortOrder":10,"isActive":true}]', 1704067200000, 1704067200000),
  ('01HQCFMETA0000000000000002', 'APPOINTMENT_TYPE', '[{"code":"CONSULTATION","name":"Consultation","sortOrder":1,"isActive":true},{"code":"FOLLOW_UP","name":"Follow-up","sortOrder":2,"isActive":true},{"code":"CHECK_UP","name":"Check-up","sortOrder":3,"isActive":true},{"code":"PROCEDURE","name":"Procedure","sortOrder":4,"isActive":true}]', 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `modules` (`id`, `code`, `name`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFMOD0000000000000009', 'DASHBOARD', 'Dashboard', 0, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000001', 'BUSINESS', 'Business', 1, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000002', 'LOCATIONS', 'Locations', 2, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000003', 'STAFF', 'Staff', 3, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000004', 'ROLES', 'Roles', 4, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000005', 'PATIENTS', 'Patients', 5, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000006', 'DOCTORS', 'Doctors', 6, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000007', 'APPOINTMENTS', 'Appointments', 7, 1704067200000, 1704067200000),
  ('01HQCFMOD0000000000000008', 'INVENTORY', 'Inventory', 8, 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sortOrder` = VALUES(`sortOrder`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `permissions` (`id`, `code`, `name`, `action`, `moduleId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFPRM0000000000000028', 'DASHBOARD_READ', 'View dashboard', 'view', '01HQCFMOD0000000000000009', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000001', 'BUSINESS_READ', 'View business', 'view', '01HQCFMOD0000000000000001', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000002', 'BUSINESS_UPDATE', 'Update business', 'update', '01HQCFMOD0000000000000001', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000003', 'LOCATION_READ', 'View locations', 'view', '01HQCFMOD0000000000000002', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000004', 'LOCATION_CREATE', 'Add location', 'create', '01HQCFMOD0000000000000002', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000005', 'LOCATION_UPDATE', 'Update location', 'update', '01HQCFMOD0000000000000002', 3, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000006', 'LOCATION_DELETE', 'Delete location', 'delete', '01HQCFMOD0000000000000002', 4, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000007', 'STAFF_READ', 'View staff', 'view', '01HQCFMOD0000000000000003', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000008', 'STAFF_CREATE', 'Add staff', 'create', '01HQCFMOD0000000000000003', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000009', 'STAFF_UPDATE', 'Update staff', 'update', '01HQCFMOD0000000000000003', 3, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000010', 'STAFF_ACTIVATE', 'Activate / deactivate staff', 'activate', '01HQCFMOD0000000000000003', 4, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000011', 'ROLE_READ', 'View roles', 'view', '01HQCFMOD0000000000000004', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000012', 'ROLE_CREATE', 'Create role', 'create', '01HQCFMOD0000000000000004', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000013', 'ROLE_UPDATE', 'Update role', 'update', '01HQCFMOD0000000000000004', 3, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000014', 'ROLE_DELETE', 'Delete role', 'delete', '01HQCFMOD0000000000000004', 4, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000015', 'ROLE_ASSIGN_PERMISSIONS', 'Assign permissions', 'assign', '01HQCFMOD0000000000000004', 5, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000016', 'USER_ASSIGN_ROLE', 'Assign role to user', 'assign_role', '01HQCFMOD0000000000000004', 6, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000017', 'PATIENT_READ', 'View patients', 'view', '01HQCFMOD0000000000000005', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000018', 'DOCTOR_READ', 'View doctors', 'view', '01HQCFMOD0000000000000006', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000019', 'DOCTOR_CREATE', 'Add doctor', 'create', '01HQCFMOD0000000000000006', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000020', 'DOCTOR_UPDATE', 'Update doctor', 'update', '01HQCFMOD0000000000000006', 3, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000021', 'DOCTOR_ACTIVATE', 'Activate / deactivate doctor', 'activate', '01HQCFMOD0000000000000006', 4, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000022', 'APPOINTMENT_READ', 'View appointments', 'view', '01HQCFMOD0000000000000007', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000023', 'APPOINTMENT_CREATE', 'Book appointments', 'create', '01HQCFMOD0000000000000007', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000024', 'APPOINTMENT_UPDATE', 'Update visit chart', 'update', '01HQCFMOD0000000000000007', 3, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000025', 'INVENTORY_READ', 'View inventory', 'view', '01HQCFMOD0000000000000008', 1, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000026', 'INVENTORY_CREATE', 'Add stock', 'create', '01HQCFMOD0000000000000008', 2, 1704067200000, 1704067200000),
  ('01HQCFPRM0000000000000027', 'INVENTORY_UPDATE', 'Update stock', 'update', '01HQCFMOD0000000000000008', 3, 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `action` = VALUES(`action`), `moduleId` = VALUES(`moduleId`), `sortOrder` = VALUES(`sortOrder`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `roles` (`id`, `tenantId`, `locationId`, `name`, `code`, `description`, `isSystem`, `templateCode`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFSADM000000000000001', NULL, NULL, 'Super Admin', 'SUPER_ADMIN', 'Platform administrator', true, 'SUPER_ADMIN', 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `isSystem` = VALUES(`isSystem`), `templateCode` = VALUES(`templateCode`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `users` (`id`, `tenantId`, `firstName`, `lastName`, `email`, `passwordHash`, `status`, `mfaEnabled`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFSUSR000000000000001', NULL, 'Platform', 'Admin', 'superadmin@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$2M4cocZIlwj2TLAi6mf/fw$NKgJQCbnSdK+jyt68qxPIlGAvlCZSoHH/ZRvCWGUtq4', 'ACTIVE', false, 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `firstName` = VALUES(`firstName`), `lastName` = VALUES(`lastName`), `passwordHash` = VALUES(`passwordHash`), `status` = VALUES(`status`), `updatedAt` = VALUES(`updatedAt`);
