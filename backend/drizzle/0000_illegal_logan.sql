CREATE TABLE `modules` (
	`id` char(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_modules_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `appointment_charges` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`appointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	`charge_for` varchar(255) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`tax` int NOT NULL DEFAULT 0,
	`amount_with_tax` int NOT NULL DEFAULT 0,
	CONSTRAINT `appointment_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_documents` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`appointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	`fileName` varchar(255) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`url` varchar(1024) NOT NULL,
	CONSTRAINT `appointment_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_links` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`mainAppointmentId` char(36) NOT NULL,
	`followUpAppointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `appointment_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_links_followUpAppointmentId_key` UNIQUE(`followUpAppointmentId`)
);
--> statement-breakpoint
CREATE TABLE `appointment_medicines` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`appointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	`medicine` varchar(255) NOT NULL,
	`dose` varchar(128),
	`frequency` varchar(128),
	`duration` varchar(128),
	`instructions` varchar(512),
	CONSTRAINT `appointment_medicines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_procedures` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`appointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	`examination` text,
	`treatment` text,
	CONSTRAINT `appointment_procedures_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_procedures_appointmentId_key` UNIQUE(`appointmentId`)
);
--> statement-breakpoint
CREATE TABLE `appointment_vitals` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`appointmentId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	`bpSystolic` int,
	`bpDiastolic` int,
	`pulse` int,
	`temperature` decimal(4,1),
	`spo2` int,
	`weightKg` decimal(6,2),
	`heightCm` decimal(6,1),
	`bmi` decimal(5,1),
	`recordedAt` bigint,
	CONSTRAINT `appointment_vitals_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_vitals_appointmentId_key` UNIQUE(`appointmentId`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`locationId` char(36),
	`patientId` char(36) NOT NULL,
	`doctorUserId` char(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL,
	`startsAt` bigint NOT NULL,
	`endsAt` bigint NOT NULL,
	`reasonForVisit` text,
	`pastHistory` text,
	`habits` text,
	`internalNote` text,
	`cancelReason` varchar(512),
	`checkedInAt` bigint,
	`startedAt` bigint,
	`completedAt` bigint,
	`taxPercent` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` char(36) NOT NULL,
	`tenantId` char(36),
	`actorId` char(36),
	`action` varchar(64) NOT NULL,
	`resource` varchar(64) NOT NULL,
	`resourceId` char(36),
	`ip` varchar(64),
	`userAgent` varchar(512),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`businessType` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`legalName` varchar(255),
	`description` text,
	`industry` varchar(128),
	`category` varchar(128),
	`logo` varchar(512),
	`website` varchar(512),
	`email` varchar(255),
	`phone` varchar(32),
	`country` varchar(8),
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`address` json,
	`status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
	`settings` json,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_profiles` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`locationId` char(36),
	`userId` char(36) NOT NULL,
	`specialty` varchar(128) NOT NULL DEFAULT '',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `doctor_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctor_profiles_userId_key` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` char(36) NOT NULL,
	`tenantId` char(36),
	`key` varchar(128) NOT NULL,
	`method` varchar(16) NOT NULL,
	`path` varchar(255) NOT NULL,
	`requestHash` varchar(64) NOT NULL,
	`statusCode` int NOT NULL,
	`responseBody` json NOT NULL,
	`createdAt` bigint NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	CONSTRAINT `idempotency_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_idempotency_keys_lookup` UNIQUE(`tenantId`,`key`,`method`,`path`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`locationId` char(36),
	`name` varchar(255) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`category` varchar(64) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`maxQuantity` int NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_tenantId_locationId_sku_key` UNIQUE(`tenantId`,`locationId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`businessId` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`address` json,
	`phone` varchar(32),
	`email` varchar(255),
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
	`settings` json,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_locations_businessId_code` UNIQUE(`businessId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `metadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_metadata_key` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`locationId` char(36),
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`gender` varchar(32),
	`bloodGroup` varchar(16),
	`dateOfBirth` datetime(3),
	`lastVisitAt` bigint,
	`emergencyContactName` varchar(255),
	`emergencyContactPhone` varchar(32),
	`allergies` text,
	`chronicConditions` text,
	`currentMedicines` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_tenantId_locationId_phone_key` UNIQUE(`tenantId`,`locationId`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` char(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`action` varchar(32) NOT NULL,
	`moduleId` char(36) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_permissions_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_platform_settings_key` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` char(36) NOT NULL,
	`userId` char(36) NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	`revokedAt` datetime(3),
	`ip` varchar(64),
	`userAgent` varchar(512),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`roleId` char(36) NOT NULL,
	`permissionId` char(36) NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `role_permissions_roleId_permissionId_pk` PRIMARY KEY(`roleId`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(36) NOT NULL,
	`tenantId` char(36),
	`locationId` char(36),
	`name` varchar(128) NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` varchar(512),
	`isSystem` boolean NOT NULL DEFAULT false,
	`templateCode` varchar(64),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_roles_tenantId_locationId_code` UNIQUE(`tenantId`,`locationId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
	`settings` json,
	`subcriptionEnabled` boolean NOT NULL DEFAULT true,
	`subcriptionUntil` bigint,
	`subcriptionTrialDays` int,
	`mfaAuthenticationEnabled` boolean,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`userId` char(36) NOT NULL,
	`roleId` char(36) NOT NULL,
	`tenantId` char(36) NOT NULL,
	`locationId` char(36),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `user_roles_userId_roleId_pk` PRIMARY KEY(`userId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`tenantId` char(36),
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(32),
	`passwordHash` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'ACTIVE',
	`mfaEnabled` boolean NOT NULL DEFAULT false,
	`mfaSecretEnc` varchar(512),
	`mfaBackupCodesHash` json,
	`lastLoginAt` datetime(3),
	`avatar` varchar(512),
	`timezone` varchar(64),
	`address` json,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`createdBy` char(36),
	`updatedBy` char(36),
	`deletedAt` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `appointment_charges_appointmentId_idx` ON `appointment_charges` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `appointment_charges_tenantId_idx` ON `appointment_charges` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointment_documents_appointmentId_idx` ON `appointment_documents` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `appointment_documents_tenantId_idx` ON `appointment_documents` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointment_links_mainAppointmentId_idx` ON `appointment_links` (`mainAppointmentId`);--> statement-breakpoint
CREATE INDEX `appointment_links_tenantId_idx` ON `appointment_links` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointment_medicines_appointmentId_idx` ON `appointment_medicines` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `appointment_medicines_tenantId_idx` ON `appointment_medicines` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointment_procedures_tenantId_idx` ON `appointment_procedures` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointment_vitals_tenantId_idx` ON `appointment_vitals` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointments_tenantId_idx` ON `appointments` (`tenantId`);--> statement-breakpoint
CREATE INDEX `appointments_tenantId_doctorUserId_startsAt_idx` ON `appointments` (`tenantId`,`doctorUserId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `appointments_tenantId_patientId_idx` ON `appointments` (`tenantId`,`patientId`);--> statement-breakpoint
CREATE INDEX `appointments_tenantId_startsAt_idx` ON `appointments` (`tenantId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `appointments_tenantId_locationId_startsAt_idx` ON `appointments` (`tenantId`,`locationId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_tenantId_createdAt_idx` ON `audit_logs` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_actorId_idx` ON `audit_logs` (`actorId`);--> statement-breakpoint
CREATE INDEX `idx_businesses_tenantId` ON `businesses` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_businesses_businessType` ON `businesses` (`businessType`);--> statement-breakpoint
CREATE INDEX `idx_businesses_tenantId_status` ON `businesses` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `doctor_profiles_tenantId_idx` ON `doctor_profiles` (`tenantId`);--> statement-breakpoint
CREATE INDEX `doctor_profiles_tenantId_locationId_idx` ON `doctor_profiles` (`tenantId`,`locationId`);--> statement-breakpoint
CREATE INDEX `idx_idempotency_keys_expiresAt` ON `idempotency_keys` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `inventory_items_tenantId_idx` ON `inventory_items` (`tenantId`);--> statement-breakpoint
CREATE INDEX `inventory_items_tenantId_locationId_idx` ON `inventory_items` (`tenantId`,`locationId`);--> statement-breakpoint
CREATE INDEX `idx_locations_tenantId` ON `locations` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_locations_tenantId_businessId` ON `locations` (`tenantId`,`businessId`);--> statement-breakpoint
CREATE INDEX `idx_locations_tenantId_status` ON `locations` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `patients_tenantId_idx` ON `patients` (`tenantId`);--> statement-breakpoint
CREATE INDEX `patients_tenantId_locationId_idx` ON `patients` (`tenantId`,`locationId`);--> statement-breakpoint
CREATE INDEX `idx_permissions_moduleId` ON `permissions` (`moduleId`);--> statement-breakpoint
CREATE INDEX `idx_refresh_tokens_userId` ON `refresh_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_refresh_tokens_tokenHash` ON `refresh_tokens` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_permissionId` ON `role_permissions` (`permissionId`);--> statement-breakpoint
CREATE INDEX `idx_roles_tenantId` ON `roles` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_roles_tenantId_locationId` ON `roles` (`tenantId`,`locationId`);--> statement-breakpoint
CREATE INDEX `idx_roles_code` ON `roles` (`code`);--> statement-breakpoint
CREATE INDEX `idx_tenants_status` ON `tenants` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_tenantId` ON `user_roles` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_tenantId_locationId` ON `user_roles` (`tenantId`,`locationId`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_roleId` ON `user_roles` (`roleId`);--> statement-breakpoint
CREATE INDEX `idx_users_tenantId` ON `users` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_users_tenantId_status` ON `users` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);