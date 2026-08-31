import { pool } from '@/db/client';

async function columnExists(table: string, column: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

async function tableExists(table: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

export async function migrateBusinessTypesToMetadata() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS metadata (
      id CHAR(36) NOT NULL,
      \`key\` VARCHAR(64) NOT NULL,
      value JSON NOT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_metadata_key (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await tableExists('businesses'))) {
    return;
  }

  const hasTypeId = await columnExists('businesses', 'businessTypeId');
  const hasTypeCode = await columnExists('businesses', 'businessType');

  if (hasTypeId && !hasTypeCode) {
    await pool.query(`ALTER TABLE businesses ADD COLUMN businessType VARCHAR(64) NULL`);
  }

  if (hasTypeId && (await tableExists('business_types'))) {
    await pool.query(`
      UPDATE businesses b
      INNER JOIN business_types t ON t.id = b.businessTypeId
      SET b.businessType = t.code
      WHERE b.businessType IS NULL OR b.businessType = ''
    `);
  }

  if (await columnExists('businesses', 'businessType')) {
    await pool.query(`UPDATE businesses SET businessType = 'DENTAL' WHERE businessType IS NULL OR businessType = ''`);
    await pool.query(`ALTER TABLE businesses MODIFY COLUMN businessType VARCHAR(64) NOT NULL`);
  }

  if (hasTypeId) {
    await pool.query(`ALTER TABLE businesses DROP FOREIGN KEY fk_businesses_business_type`).catch(() => undefined);
    await pool.query(`ALTER TABLE businesses DROP INDEX idx_businesses_businessTypeId`).catch(() => undefined);
    await pool.query(`ALTER TABLE businesses DROP COLUMN businessTypeId`).catch(() => undefined);
  }

  if (!(await columnExists('businesses', 'businessType'))) {
    return;
  }
  await pool.query(`CREATE INDEX idx_businesses_businessType ON businesses (businessType)`).catch(() => undefined);

  if (await tableExists('business_types')) {
    await pool.query(`DROP TABLE business_types`);
  }

  if (await tableExists('_prisma_migrations')) {
    await pool.query(`DROP TABLE _prisma_migrations`);
  }
}
