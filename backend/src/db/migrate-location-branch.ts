import { pool } from '@/db/client';

async function columnExists(table: string, column: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

async function indexExists(table: string, indexName: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

async function addColumn(table: string, column: string, ddl: string) {
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function addIndex(table: string, indexName: string, ddl: string) {
  if (!(await indexExists(table, indexName))) {
    await pool.query(`ALTER TABLE ${table} ADD ${ddl}`);
  }
}

async function dropIndex(table: string, indexName: string) {
  if (await indexExists(table, indexName)) {
    await pool.query(`ALTER TABLE ${table} DROP INDEX \`${indexName}\``);
  }
}

/**
 * Adds nullable locationId to appointments + inventory.
 * Backfills only when the tenant already has a location — never creates a default location.
 */
export async function migrateLocationBranchSchema() {
  await addColumn('appointments', 'locationId', 'locationId CHAR(36) NULL AFTER tenantId');
  await addColumn('inventory_items', 'locationId', 'locationId CHAR(36) NULL AFTER tenantId');

  await addIndex(
    'appointments',
    'appointments_tenantId_locationId_startsAt_idx',
    'INDEX appointments_tenantId_locationId_startsAt_idx (tenantId, locationId, startsAt)',
  );
  await addIndex(
    'inventory_items',
    'inventory_items_tenantId_locationId_idx',
    'INDEX inventory_items_tenantId_locationId_idx (tenantId, locationId)',
  );

  // Backfill appointments from first active location per tenant (never invent locations).
  await pool.query(`
    UPDATE appointments a
    INNER JOIN (
      SELECT l.tenantId, MIN(l.id) AS locationId
      FROM locations l
      INNER JOIN (
        SELECT tenantId, MIN(createdAt) AS minCreated
        FROM locations
        WHERE deletedAt IS NULL AND status = 'ACTIVE'
        GROUP BY tenantId
      ) first_loc ON first_loc.tenantId = l.tenantId AND first_loc.minCreated = l.createdAt
      WHERE l.deletedAt IS NULL AND l.status = 'ACTIVE'
      GROUP BY l.tenantId
    ) pick ON pick.tenantId = a.tenantId
    SET a.locationId = pick.locationId
    WHERE a.locationId IS NULL AND a.deletedAt IS NULL
  `);

  await pool.query(`
    UPDATE inventory_items i
    INNER JOIN (
      SELECT l.tenantId, MIN(l.id) AS locationId
      FROM locations l
      INNER JOIN (
        SELECT tenantId, MIN(createdAt) AS minCreated
        FROM locations
        WHERE deletedAt IS NULL AND status = 'ACTIVE'
        GROUP BY tenantId
      ) first_loc ON first_loc.tenantId = l.tenantId AND first_loc.minCreated = l.createdAt
      WHERE l.deletedAt IS NULL AND l.status = 'ACTIVE'
      GROUP BY l.tenantId
    ) pick ON pick.tenantId = i.tenantId
    SET i.locationId = pick.locationId
    WHERE i.locationId IS NULL AND i.deletedAt IS NULL
  `);

  // Prefer (tenantId, locationId, sku) uniqueness; keep old key if drop fails on some envs.
  await dropIndex('inventory_items', 'inventory_items_tenantId_sku_key');
  await addIndex(
    'inventory_items',
    'inventory_items_tenantId_locationId_sku_key',
    'UNIQUE INDEX inventory_items_tenantId_locationId_sku_key (tenantId, locationId, sku)',
  );
}
