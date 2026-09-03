import { hash } from 'argon2';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { closeDb, db, nowMs } from './client';
import {
  appointmentCharges,
  appointmentDocuments,
  appointmentLinks,
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
import { ENTITY_STATUS, PERMISSION_CODES, ROLE_CODES, USER_STATUS } from '@/shared/types';

const OWNER_EMAIL = 'anita.desai@sunriseclinic.in';
const CLINIC_PASSWORD = 'SunriseClinic!234';
const CLINIC_NAME = 'Sunrise Dental Clinic';
const TIMEZONE = 'Asia/Kolkata';
const PATIENT_TARGET = 500;
const BATCH_SIZE = 100;
const DAY_MS = 86_400_000;
const PAST_MONTHS = 12;
const FUTURE_DAYS = 14;

const FIRST_NAMES = [
  'Aarav',
  'Aditi',
  'Ananya',
  'Arjun',
  'Diya',
  'Ishaan',
  'Kavya',
  'Meera',
  'Neha',
  'Priya',
  'Rahul',
  'Riya',
  'Rohan',
  'Sneha',
  'Vikram',
  'Anika',
  'Kabir',
  'Isha',
  'Dev',
  'Pooja',
  'Karan',
  'Tanvi',
  'Ayaan',
  'Sana',
  'Nikhil',
] as const;

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Reddy',
  'Nair',
  'Khan',
  'Iyer',
  'Joshi',
  'Kapoor',
  'Desai',
  'Mehta',
  'Rao',
  'Singh',
  'Gupta',
  'Banerjee',
  'Menon',
  'Pillai',
  'Chawla',
  'Malhotra',
  'Bhat',
  'Kulkarni',
] as const;

const FEMALE_FIRST_NAMES = new Set([
  'Aditi',
  'Ananya',
  'Diya',
  'Kavya',
  'Meera',
  'Neha',
  'Priya',
  'Riya',
  'Sneha',
  'Anika',
  'Isha',
  'Pooja',
  'Tanvi',
  'Sana',
]);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

const SERVICES = [
  { reason: 'Scaling and polishing', type: 'Procedure', chargeFor: 'Scaling', amount: 2500 },
  { reason: 'Tooth filling', type: 'Procedure', chargeFor: 'Composite filling', amount: 1800 },
  { reason: 'Root canal treatment', type: 'Procedure', chargeFor: 'Root canal', amount: 8000 },
  { reason: 'Tooth extraction', type: 'Procedure', chargeFor: 'Extraction', amount: 1500 },
  { reason: 'Braces review', type: 'Follow-up', chargeFor: 'Orthodontic review', amount: 800 },
  { reason: 'Crown cementation', type: 'Procedure', chargeFor: 'Crown', amount: 6000 },
  { reason: 'Teeth whitening', type: 'Procedure', chargeFor: 'Whitening', amount: 4500 },
  { reason: 'Dental consultation', type: 'Consultation', chargeFor: 'Consultation fee', amount: 500 },
  { reason: 'Routine dental check-up', type: 'Check-up', chargeFor: 'Check-up', amount: 600 },
  { reason: 'Wisdom tooth review', type: 'Consultation', chargeFor: 'Consultation fee', amount: 700 },
] as const;

const MEDICINES = [
  { medicine: 'Amoxicillin', dose: '500 mg', frequency: 'Thrice daily', duration: '5 days', instructions: 'After food' },
  { medicine: 'Ibuprofen', dose: '400 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'After food' },
  { medicine: 'Chlorhexidine mouthwash', dose: '10 ml', frequency: 'Twice daily', duration: '7 days', instructions: 'Do not swallow' },
  { medicine: 'Metronidazole', dose: '400 mg', frequency: 'Thrice daily', duration: '5 days', instructions: 'After food' },
  { medicine: 'Paracetamol', dose: '500 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'If pain persists' },
] as const;

const ALLERGIES = ['None known', 'Penicillin', 'Lidocaine', 'Latex gloves', 'NSAIDs', 'None known', 'Pollen'] as const;
const CONDITIONS = ['None', 'Diabetes', 'Hypertension', 'Asthma', 'Thyroid disorder', 'None', 'None'] as const;
const CURRENT_MEDS = ['None', 'Metformin 500 mg', 'Amlodipine 5 mg', 'Thyroxine 50 mcg', 'None', 'Inhaler as needed', 'None'] as const;
const HABITS = [
  'No tobacco. Brushes twice daily.',
  'Occasional paan. Brushes once daily.',
  'Does not smoke. Uses mouthwash at night.',
  'Smokes 4–5 cigarettes/day. Irregular flossing.',
  'No alcohol. Night grinding reported.',
] as const;
const PAST_HISTORIES = [
  'Previous scaling 8 months ago. No surgical history.',
  'Root canal on 36 in 2024. Otherwise healthy.',
  'Extraction of 18 last year. No bleeding disorders.',
  'Braces placed in 2023. Regular orthodontic reviews.',
  'Composite filling on 46. Sensitive to cold drinks.',
  'Crown on 11. No known drug allergies beyond chart.',
  'Wisdom tooth review last year. Healing was uneventful.',
] as const;

const DOCTORS = [
  { firstName: 'Vikram', lastName: 'Shah', email: 'vikram.shah@sunriseclinic.in', specialty: 'Orthodontics', phone: '9820001101' },
  { firstName: 'Meera', lastName: 'Nair', email: 'meera.nair@sunriseclinic.in', specialty: 'Endodontics', phone: '9820001102' },
  { firstName: 'Arjun', lastName: 'Kapoor', email: 'arjun.kapoor@sunriseclinic.in', specialty: 'Periodontics', phone: '9820001103' },
  { firstName: 'Priya', lastName: 'Reddy', email: 'priya.reddy@sunriseclinic.in', specialty: 'Oral Surgery', phone: '9820001104' },
  { firstName: 'Sameer', lastName: 'Khan', email: 'sameer.khan@sunriseclinic.in', specialty: 'Pediatric Dentistry', phone: '9820001105' },
  { firstName: 'Nisha', lastName: 'Patel', email: 'nisha.patel@sunriseclinic.in', specialty: 'Prosthodontics', phone: '9820001106' },
  { firstName: 'Rahul', lastName: 'Joshi', email: 'rahul.joshi@sunriseclinic.in', specialty: 'Conservative Dentistry', phone: '9820001107' },
  { firstName: 'Ananya', lastName: 'Rao', email: 'ananya.rao@sunriseclinic.in', specialty: 'Implantology', phone: '9820001108' },
] as const;

const STAFF = [
  { firstName: 'Kavita', lastName: 'Iyer', email: 'kavita.iyer@sunriseclinic.in', phone: '9820001201' },
  { firstName: 'Rohan', lastName: 'Mehta', email: 'rohan.mehta@sunriseclinic.in', phone: '9820001202' },
] as const;

const LOCATIONS = [
  {
    name: 'Andheri West',
    code: 'ANDHERI',
    phone: '022-4001-2201',
    address: {
      line1: '12 SV Road',
      line2: 'Near Metro Station',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400058',
      country: 'IN',
    },
  },
  {
    name: 'Bandra',
    code: 'BANDRA',
    phone: '022-4001-2202',
    address: {
      line1: '48 Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'IN',
    },
  },
  {
    name: 'Powai',
    code: 'POWAI',
    phone: '022-4001-2203',
    address: {
      line1: '7 Hiranandani Gardens',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400076',
      country: 'IN',
    },
  },
] as const;

const RECEPTION_PERMISSIONS = [
  PERMISSION_CODES.DASHBOARD_READ,
  PERMISSION_CODES.BUSINESS_READ,
  PERMISSION_CODES.LOCATION_READ,
  PERMISSION_CODES.STAFF_READ,
  PERMISSION_CODES.PATIENT_READ,
  PERMISSION_CODES.DOCTOR_READ,
  PERMISSION_CODES.APPOINTMENT_READ,
  PERMISSION_CODES.APPOINTMENT_CREATE,
  PERMISSION_CODES.APPOINTMENT_UPDATE,
  PERMISSION_CODES.INVENTORY_READ,
  PERMISSION_CODES.INVENTORY_CREATE,
  PERMISSION_CODES.INVENTORY_UPDATE,
] as const;

const CLINIC_ADDRESS = {
  line1: '12 SV Road',
  line2: 'Near Metro Station',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400058',
  country: 'IN',
};

async function insertBatches(table: typeof patients, rows: Array<typeof patients.$inferInsert>): Promise<void>;
async function insertBatches(table: typeof appointments, rows: Array<typeof appointments.$inferInsert>): Promise<void>;
async function insertBatches(table: typeof appointmentVitals, rows: Array<typeof appointmentVitals.$inferInsert>): Promise<void>;
async function insertBatches(table: typeof appointmentProcedures, rows: Array<typeof appointmentProcedures.$inferInsert>): Promise<void>;
async function insertBatches(table: typeof appointmentMedicines, rows: Array<typeof appointmentMedicines.$inferInsert>): Promise<void>;
async function insertBatches(table: typeof appointmentCharges, rows: Array<typeof appointmentCharges.$inferInsert>): Promise<void>;
async function insertBatches(table: { $inferInsert: unknown }, rows: unknown[]) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    await db.insert(table as typeof patients).values(rows.slice(index, index + BATCH_SIZE) as never);
  }
}

async function countForTenant(
  table: typeof patients | typeof appointments | typeof appointmentVitals | typeof locations | typeof inventoryItems,
  tenantId: string,
) {
  const [row] = await db
    .select({ total: count() })
    .from(table)
    .where(and(eq(table.tenantId, tenantId), isNull(table.deletedAt)));
  return Number(row?.total ?? 0);
}

function shiftYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function weekdayOfYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function hashYmd(ymd: string) {
  let hash = 2166136261;
  for (let index = 0; index < ymd.length; index += 1) {
    hash ^= ymd.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function visitsForDay(ymd: string) {
  const weekday = weekdayOfYmd(ymd);
  const seed = hashYmd(ymd);
  if (weekday === 0) {
    return 0;
  }
  if (weekday === 6) {
    return 6 + (seed % 2);
  }
  return 10 + (seed % 2);
}

function shuffle<T>(items: T[], seed: number) {
  const next = [...items];
  let state = seed >>> 0 || 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 15), state | 1) >>> 0);
    const swap = state % (index + 1);
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

function patientAt(index: number) {
  const firstName = FIRST_NAMES[Math.floor(index / LAST_NAMES.length) % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 28) + 1).padStart(2, '0');
  const year = 1958 + (index % 50);
  return {
    firstName,
    lastName,
    phone: String(9000000001 + index),
    gender: FEMALE_FIRST_NAMES.has(firstName) ? 'Female' : 'Male',
    bloodGroup: BLOOD_GROUPS[index % BLOOD_GROUPS.length],
    dateOfBirth: new Date(`${year}-${month}-${day}T00:00:00.000Z`),
  };
}

function pastStatus(index: number) {
  const bucket = index % 10;
  if (bucket === 8) {
    return 'Cancelled';
  }
  if (bucket === 9) {
    return 'Expired';
  }
  return 'Completed';
}

function futureStatus(_index: number) {
  return 'Confirmed';
}

async function requireMasters() {
  const [permissionRows, appointmentTypes] = await Promise.all([
    db.select({ id: permissions.id }).from(permissions).limit(1),
    listActiveMetadataItems(METADATA_KEYS.APPOINTMENT_TYPE),
  ]);
  if (!permissionRows.length || !appointmentTypes.length) {
    throw new Error('Run `pnpm db:migrate` first (metadata, modules, permissions).');
  }
}

async function rebrandClinic(tenantId: string) {
  const now = nowMs();
  await db.update(tenants).set({ name: CLINIC_NAME, updatedAt: now }).where(eq(tenants.id, tenantId));
  await db
    .update(businesses)
    .set({
      name: CLINIC_NAME,
      legalName: 'Sunrise Dental Clinic Pvt Ltd',
      businessType: 'DENTAL',
      email: 'hello@sunriseclinic.in',
      phone: '022-4001-2200',
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
    firstName: 'Anita',
    lastName: 'Desai',
    email: OWNER_EMAIL,
    password: CLINIC_PASSWORD,
    businessTypeId: 'DENTAL',
    businessName: CLINIC_NAME,
  });

  await rebrandClinic(created.tenantId);
  return { tenantId: created.tenantId, ownerId: created.userId };
}

async function wipeClinicOperations(tenantId: string) {
  await db.delete(appointmentCharges).where(eq(appointmentCharges.tenantId, tenantId));
  await db.delete(appointmentMedicines).where(eq(appointmentMedicines.tenantId, tenantId));
  await db.delete(appointmentProcedures).where(eq(appointmentProcedures.tenantId, tenantId));
  await db.delete(appointmentVitals).where(eq(appointmentVitals.tenantId, tenantId));
  await db.delete(appointmentDocuments).where(eq(appointmentDocuments.tenantId, tenantId));
  await db.delete(appointmentLinks).where(eq(appointmentLinks.tenantId, tenantId));
  await db.delete(appointments).where(eq(appointments.tenantId, tenantId));
  await db.delete(patients).where(eq(patients.tenantId, tenantId));
  await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
}

async function resetDemoUserMfa(tenantId: string) {
  await db
    .update(users)
    .set({
      mfaEnabled: false,
      mfaSecretEnc: null,
      mfaBackupCodesHash: null,
    })
    .where(eq(users.tenantId, tenantId));
}

async function ensureLocations(tenantId: string, ownerId: string, businessId: string) {
  const existing = await db
    .select({ code: locations.code })
    .from(locations)
    .where(and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)));
  const have = new Set(existing.map((row) => row.code));
  const now = nowMs();
  const rows = LOCATIONS.filter((location) => !have.has(location.code)).map((location) => ({
    id: ULID.random(),
    tenantId,
    businessId,
    name: location.name,
    code: location.code,
    phone: location.phone,
    email: `${location.code.toLowerCase()}@sunriseclinic.in`,
    timezone: TIMEZONE,
    address: location.address,
    status: ENTITY_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId,
    updatedBy: ownerId,
  }));
  if (rows.length) {
    await db.insert(locations).values(rows);
  }
}

async function ensureReceptionRole(tenantId: string, ownerId: string) {
  const existing = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.code, 'RECEPTION'), isNull(roles.deletedAt)),
  });
  const now = nowMs();
  let roleId = existing?.id;
  if (!roleId) {
    roleId = ULID.random();
    await db.insert(roles).values({
      id: roleId,
      tenantId,
      name: 'Reception',
      code: 'RECEPTION',
      description: 'Front desk booking and patient support',
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
    .where(inArray(permissions.code, [...RECEPTION_PERMISSIONS]));
  for (const row of permissionRows) {
    await db
      .insert(rolePermissions)
      .values({ roleId, permissionId: row.id, createdAt: now })
      .onDuplicateKeyUpdate({ set: { createdAt: sql`createdAt` } });
  }
  return roleId;
}

async function ensureDoctorsAndStaff(tenantId: string, ownerId: string, passwordHash: string, locationId: string) {
  const doctorRole = await db.query.roles.findFirst({
    where: and(
      eq(roles.tenantId, tenantId),
      eq(roles.locationId, locationId),
      eq(roles.code, ROLE_CODES.DOCTOR),
      isNull(roles.deletedAt),
    ),
  });
  if (!doctorRole) {
    throw new Error('Doctor role is missing for this branch. Run `pnpm db:migrate` and create a location first.');
  }
  const receptionRoleId = await ensureReceptionRole(tenantId, ownerId);
  await db.update(roles).set({ locationId }).where(eq(roles.id, receptionRoleId));
  const now = nowMs();

  for (const doctor of DOCTORS) {
    const found = await db.query.users.findFirst({ where: eq(users.email, doctor.email) });
    if (found) {
      await db
        .update(doctorProfiles)
        .set({ specialty: doctor.specialty, locationId, updatedAt: now })
        .where(eq(doctorProfiles.userId, found.id));
      await db
        .update(userRoles)
        .set({ locationId })
        .where(and(eq(userRoles.userId, found.id), eq(userRoles.tenantId, tenantId)));
      continue;
    }
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
      timezone: TIMEZONE,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    await db.insert(userRoles).values({ userId, roleId: doctorRole.id, tenantId, locationId, createdAt: now });
    await db.insert(doctorProfiles).values({
      id: ULID.random(),
      tenantId,
      locationId,
      userId,
      specialty: doctor.specialty,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const member of STAFF) {
    const found = await db.query.users.findFirst({ where: eq(users.email, member.email) });
    if (found) {
      await db
        .update(userRoles)
        .set({ locationId })
        .where(and(eq(userRoles.userId, found.id), eq(userRoles.tenantId, tenantId)));
      continue;
    }
    const userId = ULID.random();
    await db.insert(users).values({
      id: userId,
      tenantId,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      passwordHash,
      status: USER_STATUS.ACTIVE,
      timezone: TIMEZONE,
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    await db.insert(userRoles).values({ userId, roleId: receptionRoleId, tenantId, locationId, createdAt: now });
  }

  const doctorUsers = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), isNull(users.deletedAt), inArray(users.email, DOCTORS.map((doctor) => doctor.email))),
  });
  const byEmail = new Map(doctorUsers.map((user) => [user.email, user]));
  return DOCTORS.map((doctor) => {
    const user = byEmail.get(doctor.email);
    if (!user) {
      throw new Error(`Doctor ${doctor.email} was not created.`);
    }
    return user;
  });
}

async function seedPatients(tenantId: string, ownerId: string, locationId: string) {
  const now = Number(nowMs());
  const rows = [];
  for (let index = 0; index < PATIENT_TARGET; index += 1) {
    const person = patientAt(index);
    const createdAt = BigInt(now - Math.floor((index / PATIENT_TARGET) * PAST_MONTHS * 30 * DAY_MS));
    rows.push({
      id: ULID.random(),
      tenantId,
      locationId,
      firstName: person.firstName,
      lastName: person.lastName,
      phone: person.phone,
      gender: person.gender,
      bloodGroup: person.bloodGroup,
      dateOfBirth: person.dateOfBirth,
      emergencyContactName: `${FIRST_NAMES[(index + 5) % FIRST_NAMES.length]} ${LAST_NAMES[(index + 3) % LAST_NAMES.length]}`,
      emergencyContactPhone: String(9800000001 + index),
      allergies: ALLERGIES[index % ALLERGIES.length],
      chronicConditions: CONDITIONS[index % CONDITIONS.length],
      currentMedicines: CURRENT_MEDS[index % CURRENT_MEDS.length],
      lastVisitAt: null as bigint | null,
      createdAt,
      updatedAt: createdAt,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
  }
  await insertBatches(patients, rows);
  return db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)));
}

async function seedAppointments(
  tenantId: string,
  ownerId: string,
  doctorIds: string[],
  patientIds: string[],
  timezone: string,
  openTime: string,
  closeTime: string,
  locationId: string,
) {
  const todayYmd = ymdInTimeZone(Date.now(), timezone);
  const startYmd = shiftYmd(todayYmd, -Math.round((PAST_MONTHS * 365) / 12));
  const endYmd = shiftYmd(todayYmd, FUTURE_DAYS);
  const now = nowMs();
  const nowMsNumber = Date.now();
  const appointmentRows: Array<typeof appointments.$inferInsert> = [];
  const chargeRows: Array<typeof appointmentCharges.$inferInsert> = [];
  const vitalsRows: Array<typeof appointmentVitals.$inferInsert> = [];
  const procedureRows: Array<typeof appointmentProcedures.$inferInsert> = [];
  const medicineRows: Array<typeof appointmentMedicines.$inferInsert> = [];
  let visitIndex = 0;

  for (let ymd = startYmd; ymd <= endYmd; ymd = shiftYmd(ymd, 1)) {
    const needed = visitsForDay(ymd);
    if (!needed) {
      continue;
    }
    const hours = hourSlotsForDate(ymd, timezone, openTime, closeTime);
    const pool = hours.flatMap((hour) =>
      doctorIds.map((doctorUserId) => ({ doctorUserId, startsAt: hour.startsAt, endsAt: hour.endsAt })),
    );
    const slots = shuffle(pool, hashYmd(ymd)).slice(0, needed);
    for (const slot of slots) {
      const service = SERVICES[visitIndex % SERVICES.length];
      const isPast = slot.startsAt <= nowMsNumber;
      const status = isPast ? pastStatus(visitIndex) : futureStatus(visitIndex);
      const patientId = patientIds[(visitIndex * 13 + weekdayOfYmd(ymd) * 7) % patientIds.length];
      const appointmentId = ULID.random();
      appointmentRows.push({
        id: appointmentId,
        tenantId,
        locationId,
        patientId,
        doctorUserId: slot.doctorUserId,
        type: service.type,
        status,
        startsAt: BigInt(slot.startsAt),
        endsAt: BigInt(slot.endsAt),
        reasonForVisit: service.reason,
        pastHistory: PAST_HISTORIES[visitIndex % PAST_HISTORIES.length],
        habits: HABITS[visitIndex % HABITS.length],
        cancelReason: status === 'Cancelled' ? 'Patient requested cancellation' : null,
        checkedInAt: status === 'Completed' ? BigInt(slot.startsAt) : null,
        startedAt: status === 'Completed' ? BigInt(slot.startsAt) : null,
        completedAt: status === 'Completed' ? BigInt(slot.endsAt) : null,
        taxPercent: status === 'Completed' ? 5 : 0,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerId,
        updatedBy: ownerId,
      });
      if (status === 'Completed') {
        chargeRows.push({
          id: ULID.random(),
          tenantId,
          appointmentId,
          chargeFor: service.chargeFor,
          amount: service.amount,
          tax: 0,
          amountWithTax: service.amount,
          createdAt: now,
          updatedAt: now,
          createdBy: ownerId,
          updatedBy: ownerId,
        });
      }
      if (status !== 'Cancelled' && status !== 'Expired') {
        const weightKg = 55 + (visitIndex % 30);
        const heightCm = 150 + (visitIndex % 30);
        const bmi = Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
        vitalsRows.push({
          id: ULID.random(),
          tenantId,
          appointmentId,
          bpSystolic: 110 + (visitIndex % 25),
          bpDiastolic: 70 + (visitIndex % 15),
          pulse: 68 + (visitIndex % 20),
          temperature: 36.5 + (visitIndex % 8) / 10,
          spo2: 96 + (visitIndex % 4),
          weightKg,
          heightCm,
          bmi,
          recordedAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: ownerId,
          updatedBy: ownerId,
        });
        procedureRows.push({
          id: ULID.random(),
          tenantId,
          appointmentId,
          examination: `Chief complaint: ${service.reason}. Soft tissues, occlusion, and dentition examined.`,
          treatment:
            status === 'Completed'
              ? `${service.chargeFor} completed. Post-op and home-care instructions given.`
              : `${service.chargeFor} planned. Consent and next steps discussed.`,
          createdAt: now,
          updatedAt: now,
          createdBy: ownerId,
          updatedBy: ownerId,
        });
        const medicine = MEDICINES[visitIndex % MEDICINES.length];
        medicineRows.push({
          id: ULID.random(),
          tenantId,
          appointmentId,
          ...medicine,
          createdAt: now,
          updatedAt: now,
          createdBy: ownerId,
          updatedBy: ownerId,
        });
        if (visitIndex % 3 === 0) {
          const extra = MEDICINES[(visitIndex + 1) % MEDICINES.length];
          medicineRows.push({
            id: ULID.random(),
            tenantId,
            appointmentId,
            ...extra,
            createdAt: now,
            updatedAt: now,
            createdBy: ownerId,
            updatedBy: ownerId,
          });
        }
      }
      visitIndex += 1;
    }
  }

  await insertBatches(appointments, appointmentRows);
  await insertBatches(appointmentCharges, chargeRows);
  await insertBatches(appointmentVitals, vitalsRows);
  await insertBatches(appointmentProcedures, procedureRows);
  await insertBatches(appointmentMedicines, medicineRows);

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

const DEMO_STOCK = [
  { name: 'Surgical gloves', sku: 'INV-1024', category: 'PPE', unit: 'boxes', quantity: 420, maxQuantity: 500 },
  { name: 'Nitrile exam gloves', sku: 'INV-1025', category: 'PPE', unit: 'boxes', quantity: 48, maxQuantity: 200 },
  { name: 'IV saline 500ml', sku: 'INV-2041', category: 'Fluids', unit: 'packs', quantity: 70, maxQuantity: 200 },
  { name: 'Digital thermometer', sku: 'INV-3302', category: 'Devices', unit: 'pcs', quantity: 54, maxQuantity: 80 },
  { name: 'N95 masks', sku: 'INV-4410', category: 'PPE', unit: 'boxes', quantity: 12, maxQuantity: 180 },
  { name: 'Composite filling A2', sku: 'INV-5518', category: 'Pharmacy', unit: 'packs', quantity: 210, maxQuantity: 300 },
  { name: 'Alcohol swabs', sku: 'INV-6620', category: 'Consumables', unit: 'boxes', quantity: 38, maxQuantity: 120 },
  { name: 'Fluoride varnish', sku: 'INV-7701', category: 'Pharmacy', unit: 'bottles', quantity: 8, maxQuantity: 60 },
  { name: 'Local anesthetic cartridges', sku: 'INV-8804', category: 'Pharmacy', unit: 'vials', quantity: 96, maxQuantity: 150 },
  { name: 'Dental bibs', sku: 'INV-9902', category: 'Consumables', unit: 'packs', quantity: 240, maxQuantity: 250 },
] as const;

async function seedInventory(tenantId: string, ownerId: string, locationId: string) {
  const now = nowMs();
  await db.insert(inventoryItems).values(
    DEMO_STOCK.map((item) => ({
      id: ULID.random(),
      tenantId,
      locationId,
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

async function main() {
  await requireMasters();
  const { tenantId, ownerId } = await ensureWorkspace();
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) {
    throw new Error('Demo clinic business was not found.');
  }

  await wipeClinicOperations(tenantId);
  await resetDemoUserMfa(tenantId);

  const passwordHash = await hash(CLINIC_PASSWORD);
  await ensureLocations(tenantId, ownerId, business.id);
  const allLocations = await db
    .select()
    .from(locations)
    .where(and(eq(locations.tenantId, tenantId), isNull(locations.deletedAt)))
    .orderBy(locations.createdAt);
  const primaryLocation = allLocations[0];
  if (!primaryLocation) {
    throw new Error('Demo clinic location was not found.');
  }
  const { bindTenantToNewLocation } = await import('@/lib/location-bind');
  for (const loc of allLocations) {
    await bindTenantToNewLocation(tenantId, loc.id);
  }
  const doctorUsers = await ensureDoctorsAndStaff(tenantId, ownerId, passwordHash, primaryLocation.id);
  const patientRows = await seedPatients(tenantId, ownerId, primaryLocation.id);
  await seedAppointments(
    tenantId,
    ownerId,
    doctorUsers.map((doctor) => doctor.id),
    patientRows.map((row) => row.id),
    business.timezone || TIMEZONE,
    '09:00',
    '21:00',
    primaryLocation.id,
  );
  await seedInventory(tenantId, ownerId, primaryLocation.id);

  const [patientTotal, appointmentTotal, locationTotal, vitalTotal, inventoryTotal] = await Promise.all([
    countForTenant(patients, tenantId),
    countForTenant(appointments, tenantId),
    countForTenant(locations, tenantId),
    countForTenant(appointmentVitals, tenantId),
    countForTenant(inventoryItems, tenantId),
  ]);
  const doctorTotal = doctorUsers.length;

  console.log(`Demo seed complete for ${CLINIC_NAME} (one tenant).`);
  console.log('  Replaces previous demo visits, appointments, patients, and stock for this clinic only.');
  console.log(`  Locations: ${locationTotal}`);
  console.log(`  Doctors: ${doctorTotal}`);
  console.log(`  Patients: ${patientTotal}`);
  console.log(`  Appointments: ${appointmentTotal}`);
  console.log(`  Visit charts: ${vitalTotal}`);
  console.log(`  Inventory items: ${inventoryTotal}`);
  console.log(`  Owner login: ${OWNER_EMAIL} / ${CLINIC_PASSWORD}`);
  console.log(`  Doctor login: ${DOCTORS[0].email} / ${CLINIC_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
