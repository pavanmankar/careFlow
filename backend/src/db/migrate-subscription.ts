import { pool } from '@/db/client';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';

const DAY_MS = 86_400_000;
const DEFAULT_TRIAL_DAYS = 30;

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

async function addColumn(table: string, column: string, ddl: string) {
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export async function migrateSubscriptionSchema() {
  await addColumn('tenants', 'subcriptionEnabled', 'subcriptionEnabled BOOLEAN NOT NULL DEFAULT TRUE');
  await addColumn('tenants', 'subcriptionUntil', 'subcriptionUntil BIGINT NULL');
  await addColumn('tenants', 'subcriptionTrialDays', 'subcriptionTrialDays INT NULL');

  if (!(await tableExists('platform_settings'))) {
    await pool.query(`
      CREATE TABLE platform_settings (
        id CHAR(36) NOT NULL,
        \`key\` VARCHAR(64) NOT NULL,
        value JSON NOT NULL,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_platform_settings_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  const now = utcNowMs();
  const [existing] = await pool.query(
    `SELECT id FROM platform_settings WHERE \`key\` = 'subcription_trial_days' LIMIT 1`,
  );
  if (!(existing as Array<{ id: string }>).length) {
    await pool.query(
      `INSERT INTO platform_settings (id, \`key\`, value, createdAt, updatedAt) VALUES (?, 'subcription_trial_days', ?, ?, ?)`,
      [ULID.random(), JSON.stringify({ days: DEFAULT_TRIAL_DAYS }), now, now],
    );
  }

  const until = now + DEFAULT_TRIAL_DAYS * DAY_MS;
  await pool.query(
    `UPDATE tenants
     SET subcriptionEnabled = TRUE,
         subcriptionUntil = COALESCE(subcriptionUntil, ?),
         updatedAt = ?
     WHERE deletedAt IS NULL AND subcriptionUntil IS NULL`,
    [until, now],
  );
}
