import { hash } from 'argon2';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { closeDb, db, nowMs } from './client';
import {
  appointmentCharges,
  appointmentMedicines,
  appointmentProcedures,
  appointments,
  appointmentVitals,
  businesses,
  doctorProfiles,
  inventoryItems,
  locations,
  patients,
  permissions,
  rolePermissions,
  roles,
  tenants,
  userRoles,
  users,
} from './schema';
import { METADATA_KEYS } from './masters';
import { ULID } from '@/lib/id';
import { hourSlotsForDate, ymdInTimeZone } from '@/lib/clinic-hours';
import { provisionWorkspace } from '@/modules/tenants/tenants.service';
import { listActiveMetadataItems } from '@/modules/metadata/metadata.service';
import { migrateInventorySchema } from './migrate-inventory';
import { ENTITY_STATUS, PERMISSION_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';

export const PUBLIC_DEMO_EMAIL = 'demo@careflow.in';
export const PUBLIC_DEMO_PASSWORD = 'DemoViewer!234';
export const PUBLIC_DEMO_CLINIC = 'CareFlow Demo Clinic';

const OWNER_EMAIL = 'owner@careflow-demo.in';
const OWNER_PASSWORD = 'OwnerDemo!234';
const DEMO_VIEWER_ROLE = 'DEMO_VIEWER';
const TIMEZONE = 'Asia/Kolkata';

const VIEWER_PERMISSIONS = [
  PERMISSION_CODES.BUSINESS_READ,
  PERMISSION_CODES.LOCATION_READ,
  PERMISSION_CODES.PATIENT_READ,
  PERMISSION_CODES.DOCTOR_READ,
  PERMISSION_CODES.APPOINTMENT_READ,
  PERMISSION_CODES.INVENTORY_READ,
] as const;

const DOCTORS = [
  { firstName: 'Neha', lastName: 'Desai', email: 'neha.desai@careflow-demo.in', specialty: 'General Dentistry', phone: '9810001001' },
  { firstName: 'Arjun', lastName: 'Kapoor', email: 'arjun.kapoor@careflow-demo.in', specialty: 'Orthodontics', phone: '9810001002' },
] as const;

const PATIENTS = [
  { firstName: 'Rahul', lastName: 'Mehta', phone: '9876500001', gender: 'Male', bloodGroup: 'O+' },
  { firstName: 'Priya', lastName: 'Sharma', phone: '9876500002', gender: 'Female', bloodGroup: 'A+' },
  { firstName: 'Vikram', lastName: 'Nair', phone: '9876500003', gender: 'Male', bloodGroup: 'B+' },
  { firstName: 'Ananya', lastName: 'Patel', phone: '9876500004', gender: 'Female', bloodGroup: 'AB+' },
  { firstName: 'Rohan', lastName: 'Iyer', phone: '9876500005', gender: 'Male', bloodGroup: 'O-' },
] as const;

const INVENTORY = [
  { name: 'Surgical gloves', sku: 'DEMO-101', category: 'PPE', unit: 'boxes', quantity: 120, maxQuantity: 200 },
  { name: 'N95 masks', sku: 'DEMO-102', category: 'PPE', unit: 'boxes', quantity: 45, maxQuantity: 100 },
  { name: 'Digital thermometer', sku: 'DEMO-103', category: 'Devices', unit: 'pcs', quantity: 12, maxQuantity: 20 },
  { name: 'Composite filling A2', sku: 'DEMO-104', category: 'Pharmacy', unit: 'packs', quantity: 80, maxQuantity: 120 },
  { name: 'Alcohol swabs', sku: 'DEMO-105', category: 'Consumables', unit: 'boxes', quantity: 60, maxQuantity: 100 },
] as const;

const CLINIC_ADDRESS = {
  line1: '42 CareFlow Lane',
  line2: 'Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400050',
  country: 'IN',
};

async function requireMasters() {
  await migrateInventorySchema();
  const [permissionRows, appointmentTypes] = await Promise.all([
    db.select({ id: permissions.id }).from(permissions).limit(1),
    listActiveMetadataItems(METADATA_KEYS.APPOINTMENT_TYPE),
  ]);
  if (!permissionRows.length || !appointmentTypes.length) {
    throw new Error('Run `pnpm db:seed` first (metadata, modules, permissions).');
  }
}

async function rebrandClinic(tenantId: string) {
  const now = nowMs();
  await db.update(tenants).set({ name: PUBLIC_DEMO_CLINIC, updatedAt: now }).where(eq(tenants.id, tenantId));
  await db
    .update(businesses)
    .set({
      name: PUBLIC_DEMO_CLINIC,
      legalName: 'CareFlow Demo Clinic Pvt Ltd',
      businessType: 'DENTAL',
      email: 'hello@careflow-demo.in',
      phone: '022-4000-9000',
      country: 'IN',
      currency: 'INR',
      timezone: TIMEZONE,
      address: CLINIC_ADDRESS,
      settings: { openTime: '09:00', closeTime: '21:00' },
      updatedAt: now,
    })
    .where(eq(businesses.tenantId, tenantId));
}

async function ensureWorkspace() {
  const existing = await db.query.users.findFirst({ where: eq(users.email, OWNER_EMAIL) });
  if (existing?.tenantId) {
    await rebrandClinic(existing.tenantId);
    return { tenantId: existing.tenantId, ownerId: existing.id };
  }

  const created = await provisionWorkspace({
    firstName: 'Demo',
    lastName: 'Owner',
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    businessTypeId: 'DENTAL',
    businessName: PUBLIC_DEMO_CLINIC,
  });

  await rebrandClinic(created.tenantId);
  return { tenantId: created.tenantId, ownerId: created.userId };
}

async function ensureDemoViewerRole(tenantId: string, ownerId: string) {
  const existing = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, DEMO_VIEWER_ROLE), isNull(roles.deletedAt)),
  });
  const now = nowMs();
  let roleId = existing?.id;
  if (!roleId) {
    roleId = ULID.random();
    await db.insert(roles).values({
      id: roleId,
      tenantId,
      name: 'Demo Viewer',
      code: DEMO_VIEWER_ROLE,
      description: 'Read-only access for public demo',
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
  }

  const permissionRows = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions)
    .where(inArray(permissions.code, [...VIEWER_PERMISSIONS]));
  for (const row of permissionRows) {
    await db
      .insert(rolePermissions)
      .values({ roleId, permissionId: row.id, createdAt: now })
      .onDuplicateKeyUpdate({ set: { createdAt: sql`createdAt` } });
  }
  return roleId;
}

async function ensureDemoViewerUser(tenantId: string, ownerId: string, roleId: string, passwordHash: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, PUBLIC_DEMO_EMAIL) });
  const now = nowMs();
  let userId = existing?.id;
  if (!userId) {
    userId = ULID.random();
    await db.insert(users).values({
      id: userId,
      tenantId,
      firstName: 'Demo',
      lastName: 'Viewer',
      email: PUBLIC_DEMO_EMAIL,
      passwordHash,
      status: USER_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
  } else {
    await db
      .update(users)
      .set({ passwordHash, status: USER_STATUS.ACTIVE, updatedAt: now, updatedBy: ownerId })
      .where(eq(users.id, userId));
  }

  await db
    .insert(userRoles)
    .values({ userId, roleId, tenantId, createdAt: now })
    .onDuplicateKeyUpdate({ set: { createdAt: sql`createdAt` } });
}

async function wipeClinicOperations(tenantId: string) {
  await db.delete(appointmentCharges).where(eq(appointmentCharges.tenantId, tenantId));
  await db.delete(appointmentMedicines).where(eq(appointmentMedicines.tenantId, tenantId));
  await db.delete(appointmentProcedures).where(eq(appointmentProcedures.tenantId, tenantId));
  await db.delete(appointmentVitals).where(eq(appointmentVitals.tenantId, tenantId));
  await db.delete(appointments).where(eq(appointments.tenantId, tenantId));
  await db.delete(patients).where(eq(patients.tenantId, tenantId));
  await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
}

async function ensureLocation(tenantId: string, ownerId: string, businessId: string) {
  const existing = await db.query.locations.findFirst({
    where: and(eq(locations.tenantId, tenantId), eq(locations.code, 'DEMO'), isNull(locations.deletedAt)),
  });
  if (existing) {
    return existing.id;
  }
  const now = nowMs();
  const id = ULID.random();
  await db.insert(locations).values({
    id,
    tenantId,
    businessId,
    name: 'Demo Clinic — Bandra',
    code: 'DEMO',
    phone: '022-4000-9001',
    email: 'bandra@careflow-demo.in',
    timezone: TIMEZONE,
    address: CLINIC_ADDRESS,
    status: ENTITY_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId,
    updatedBy: ownerId,
  });
  return id;
}

async function ensureDoctors(tenantId: string, ownerId: string, passwordHash: string) {
  const doctorRole = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, ROLE_CODES.DOCTOR), isNull(roles.deletedAt)),
  });
  if (!doctorRole) {
    throw new Error('Doctor role is missing. Run `pnpm db:seed` first.');
  }

  const doctorUsers: Array<{ id: string; name: string }> = [];
  const now = nowMs();

  for (const doctor of DOCTORS) {
    let user = await db.query.users.findFirst({ where: eq(users.email, doctor.email) });
    if (!user) {
      const userId = ULID.random();
      await db.insert(users).values({
        id: userId,
        tenantId,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        phone: doctor.phone,
        passwordHash,
        status: USER_STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId,
      });
      await db.insert(doctorProfiles).values({
        id: ULID.random(),
        tenantId,
        userId,
        specialty: doctor.specialty,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(userRoles).values({ userId, roleId: doctorRole.id, tenantId, createdAt: now });
      user = { id: userId, firstName: doctor.firstName, lastName: doctor.lastName } as typeof user;
    }
    doctorUsers.push({ id: user!.id, name: `${doctor.firstName} ${doctor.lastName}` });
  }

  return doctorUsers;
}

async function seedPatients(tenantId: string, ownerId: string) {
  const now = nowMs();
  const rows = PATIENTS.map((person, index) => ({
    id: ULID.random(),
    tenantId,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: person.phone,
    gender: person.gender,
    bloodGroup: person.bloodGroup,
    dateOfBirth: new Date(`${1985 + index}-0${(index % 9) + 1}-15T00:00:00.000Z`),
    emergencyContactName: `${person.firstName} Contact`,
    emergencyContactPhone: String(9800000001 + index),
    allergies: index === 0 ? 'Penicillin' : 'None known',
    chronicConditions: index === 2 ? 'Hypertension' : 'None',
    currentMedicines: 'None',
    lastVisitAt: null as bigint | null,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId,
    updatedBy: ownerId,
  }));
  await db.insert(patients).values(rows);
  return rows.map((row) => row.id);
}

async function seedAppointments(
  tenantId: string,
  ownerId: string,
  doctorIds: string[],
  patientIds: string[],
  timezone: string,
) {
  const todayYmd = ymdInTimeZone(Date.now(), timezone);
  const slots = hourSlotsForDate(todayYmd, timezone, '09:00', '21:00');
  if (slots.length < 5) {
    throw new Error('Not enough clinic slots to seed demo appointments.');
  }

  const now = nowMs();
  const specs = [
    { status: 'Completed' as const, slotIndex: 0, type: 'Consultation', reason: 'Routine dental check-up' },
    { status: 'In progress' as const, slotIndex: 1, type: 'Consultation', reason: 'Follow-up for sensitivity' },
    { status: 'Confirmed' as const, slotIndex: 2, type: 'Follow-up', reason: 'Braces adjustment review' },
    { status: 'Cancelled' as const, slotIndex: 3, type: 'Consultation', reason: 'Tooth pain consultation' },
    { status: 'Confirmed' as const, slotIndex: 4, type: 'Check-up', reason: 'Annual dental screening' },
  ];

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const slot = slots[spec.slotIndex];
    const patientId = patientIds[index % patientIds.length];
    const doctorUserId = doctorIds[index % doctorIds.length];
    const appointmentId = ULID.random();
    const isCompleted = spec.status === 'Completed';
    const isInProgress = spec.status === 'In progress';

    await db.insert(appointments).values({
      id: appointmentId,
      tenantId,
      patientId,
      doctorUserId,
      type: spec.type,
      status: spec.status,
      startsAt: BigInt(slot.startsAt),
      endsAt: BigInt(slot.endsAt),
      reasonForVisit: spec.reason,
      pastHistory: 'No major surgical history.',
      habits: 'Non-smoker. Brushes twice daily.',
      cancelReason: spec.status === 'Cancelled' ? 'Patient rescheduled' : null,
      checkedInAt: isCompleted || isInProgress ? BigInt(slot.startsAt) : null,
      startedAt: isCompleted || isInProgress ? BigInt(slot.startsAt) : null,
      completedAt: isCompleted ? BigInt(slot.endsAt) : null,
      taxPercent: isCompleted ? 5 : 0,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    if (spec.status === 'Cancelled' || spec.status === 'Expired') {
      continue;
    }

    await db.insert(appointmentVitals).values({
      id: ULID.random(),
      tenantId,
      appointmentId,
      bpSystolic: 118 + index * 2,
      bpDiastolic: 76 + index,
      pulse: 72 + index,
      temperature: 36.8,
      spo2: 98,
      weightKg: 68 + index,
      heightCm: 168,
      bmi: 24.1,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    await db.insert(appointmentProcedures).values({
      id: ULID.random(),
      tenantId,
      appointmentId,
      examination: 'Oral cavity examined. No acute concerns.',
      treatment: isCompleted ? 'Cleaning completed. Home care reviewed.' : 'Assessment in progress.',
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    if (isCompleted) {
      await db.insert(appointmentCharges).values({
        id: ULID.random(),
        tenantId,
        appointmentId,
        chargeFor: 'Consultation fee',
        amount: 500,
        tax: 25,
        amountWithTax: 525,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId,
      });
      await db.insert(appointmentMedicines).values({
        id: ULID.random(),
        tenantId,
        appointmentId,
        medicine: 'Paracetamol 500mg',
        dose: '1 tablet',
        frequency: 'Twice daily',
        duration: '3 days',
        instructions: 'After food',
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId,
      });
    }
  }

  await db.execute(sql`
    UPDATE patients p
    INNER JOIN (
      SELECT patientId, MAX(startsAt) AS lastVisitAt
      FROM appointments
      WHERE tenantId = ${tenantId} AND deletedAt IS NULL
      GROUP BY patientId
    ) a ON a.patientId = p.id
    SET p.lastVisitAt = a.lastVisitAt, p.updatedAt = ${nowMs()}, p.updatedBy = ${ownerId}
    WHERE p.tenantId = ${tenantId} AND p.deletedAt IS NULL
  `);
}

async function seedInventory(tenantId: string, ownerId: string) {
  const now = nowMs();
  await db.insert(inventoryItems).values(
    INVENTORY.map((item) => ({
      id: ULID.random(),
      tenantId,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      maxQuantity: item.maxQuantity,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    })),
  );
}

async function countForTenant(
  table: typeof patients | typeof appointments | typeof locations | typeof inventoryItems,
  tenantId: string,
) {
  const [row] = await db
    .select({ total: count() })
    .from(table)
    .where(and(eq(table.tenantId, tenantId), isNull(table.deletedAt)));
  return Number(row?.total ?? 0);
}

async function main() {
  await requireMasters();
  const { tenantId, ownerId } = await ensureWorkspace();
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new Error('Public demo clinic business was not found.');
  }

  const passwordHash = await hash(PUBLIC_DEMO_PASSWORD);
  const roleId = await ensureDemoViewerRole(tenantId, ownerId);
  await ensureDemoViewerUser(tenantId, ownerId, roleId, passwordHash);

  await wipeClinicOperations(tenantId);

  const ownerPasswordHash = await hash(OWNER_PASSWORD);
  await ensureLocation(tenantId, ownerId, business.id);
  const doctorUsers = await ensureDoctors(tenantId, ownerId, ownerPasswordHash);
  const patientIds = await seedPatients(tenantId, ownerId);
  await seedAppointments(
    tenantId,
    ownerId,
    doctorUsers.map((doctor) => doctor.id),
    patientIds,
    business.timezone || TIMEZONE,
  );
  await seedInventory(tenantId, ownerId);

  const [patientTotal, appointmentTotal, locationTotal, inventoryTotal] = await Promise.all([
    countForTenant(patients, tenantId),
    countForTenant(appointments, tenantId),
    countForTenant(locations, tenantId),
    countForTenant(inventoryItems, tenantId),
  ]);

  console.log('Public demo clinic seeded:', PUBLIC_DEMO_CLINIC);
  console.log('Login:', PUBLIC_DEMO_EMAIL, '/', PUBLIC_DEMO_PASSWORD);
  console.log('Counts:', { patients: patientTotal, appointments: appointmentTotal, locations: locationTotal, inventory: inventoryTotal, doctors: doctorUsers.length });
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
