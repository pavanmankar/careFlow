CREATE TABLE `user_consent_records` (
	`id` char(36) NOT NULL,
	`userId` char(36) NOT NULL,
	`tenantId` char(36),
	`documentType` varchar(32) NOT NULL,
	`documentVersion` varchar(32) NOT NULL,
	`acceptedAt` bigint NOT NULL,
	`ip` varchar(64),
	`userAgent` varchar(512),
	CONSTRAINT `user_consent_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_consent_records_userId_documentType_idx` ON `user_consent_records` (`userId`,`documentType`);--> statement-breakpoint
CREATE INDEX `user_consent_records_tenantId_idx` ON `user_consent_records` (`tenantId`);