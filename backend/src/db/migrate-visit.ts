import { pool } from '@/db/client';

async function columnExists(table: string, column: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

async function addColumn(table: string, column: string, ddl: string) {
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function dropColumn(table: string, column: string) {
  if (await columnExists(table, column)) {
    await pool.query(`ALTER TABLE ${table} DROP COLUMN \`${column}\``);
  }
}

export async function migrateVisitSchema() {
  await addColumn('patients', 'emergencyContactName', 'emergencyContactName VARCHAR(255) NULL');
  await addColumn('patients', 'emergencyContactPhone', 'emergencyContactPhone VARCHAR(32) NULL');
  await addColumn('patients', 'allergies', 'allergies TEXT NULL');
  await addColumn('patients', 'chronicConditions', 'chronicConditions TEXT NULL');
  await addColumn('patients', 'currentMedicines', 'currentMedicines TEXT NULL');

  await addColumn('appointments', 'reasonForVisit', 'reasonForVisit TEXT NULL');
  await addColumn('appointments', 'pastHistory', 'pastHistory TEXT NULL');
  await addColumn('appointments', 'habits', 'habits TEXT NULL');
  await addColumn('appointments', 'internalNote', 'internalNote TEXT NULL');
  await addColumn('appointments', 'cancelReason', 'cancelReason VARCHAR(512) NULL');
  await addColumn('appointments', 'checkedInAt', 'checkedInAt BIGINT NULL');
  await addColumn('appointments', 'startedAt', 'startedAt BIGINT NULL');
  await addColumn('appointments', 'completedAt', 'completedAt BIGINT NULL');
  await addColumn('appointments', 'taxPercent', 'taxPercent INT NOT NULL DEFAULT 0');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_vitals (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      appointmentId CHAR(36) NOT NULL,
      bpSystolic INT NULL,
      bpDiastolic INT NULL,
      pulse INT NULL,
      temperature DECIMAL(4,1) NULL,
      spo2 INT NULL,
      weightKg DECIMAL(6,2) NULL,
      heightCm DECIMAL(6,1) NULL,
      bmi DECIMAL(5,1) NULL,
      recordedAt BIGINT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY appointment_vitals_appointmentId_key (appointmentId),
      KEY appointment_vitals_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_procedures (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      appointmentId CHAR(36) NOT NULL,
      examination TEXT NULL,
      treatment TEXT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY appointment_procedures_appointmentId_key (appointmentId),
      KEY appointment_procedures_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_medicines (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      appointmentId CHAR(36) NOT NULL,
      medicine VARCHAR(255) NOT NULL,
      dose VARCHAR(128) NULL,
      frequency VARCHAR(128) NULL,
      duration VARCHAR(128) NULL,
      instructions VARCHAR(512) NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      KEY appointment_medicines_appointmentId_idx (appointmentId),
      KEY appointment_medicines_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_documents (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      appointmentId CHAR(36) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      kind VARCHAR(32) NOT NULL,
      url VARCHAR(1024) NOT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      KEY appointment_documents_appointmentId_idx (appointmentId),
      KEY appointment_documents_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_charges (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      appointmentId CHAR(36) NOT NULL,
      charge_for VARCHAR(255) NOT NULL,
      amount INT NOT NULL DEFAULT 0,
      tax INT NOT NULL DEFAULT 0,
      amount_with_tax INT NOT NULL DEFAULT 0,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      KEY appointment_charges_appointmentId_idx (appointmentId),
      KEY appointment_charges_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dropColumn('appointment_charges', 'payment_status');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointment_links (
      id CHAR(36) NOT NULL,
      tenantId CHAR(36) NOT NULL,
      mainAppointmentId CHAR(36) NOT NULL,
      followUpAppointmentId CHAR(36) NOT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      createdBy CHAR(36) NULL,
      updatedBy CHAR(36) NULL,
      deletedAt DATETIME(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY appointment_links_followUpAppointmentId_key (followUpAppointmentId),
      KEY appointment_links_mainAppointmentId_idx (mainAppointmentId),
      KEY appointment_links_tenantId_idx (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
