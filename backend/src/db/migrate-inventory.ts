import { pool } from '@/db/client';

export async function migrateInventorySchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(64) NOT NULL,
      category VARCHAR(64) NOT NULL,
      unit VARCHAR(32) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      maxQuantity INT NOT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY inventory_items_tenantId_sku_key (tenantId, sku),
      KEY inventory_items_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
