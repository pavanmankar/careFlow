INSERT INTO `modules` (`id`, `code`, `name`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFMOD0000000000000009', 'DASHBOARD', 'Dashboard', 0, 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sortOrder` = VALUES(`sortOrder`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `permissions` (`id`, `code`, `name`, `action`, `moduleId`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
  ('01HQCFPRM0000000000000028', 'DASHBOARD_READ', 'View dashboard', 'view', '01HQCFMOD0000000000000009', 1, 1704067200000, 1704067200000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `action` = VALUES(`action`), `moduleId` = VALUES(`moduleId`), `sortOrder` = VALUES(`sortOrder`), `updatedAt` = VALUES(`updatedAt`);
--> statement-breakpoint
INSERT INTO `role_permissions` (`roleId`, `permissionId`, `createdAt`)
SELECT r.`id`, '01HQCFPRM0000000000000028', 1704067200000
FROM `roles` r
WHERE r.`deletedAt` IS NULL
  AND r.`code` IN ('TENANT_OWNER', 'DOCTOR', 'RECEPTION', 'DEMO_VIEWER')
ON DUPLICATE KEY UPDATE `createdAt` = VALUES(`createdAt`);
