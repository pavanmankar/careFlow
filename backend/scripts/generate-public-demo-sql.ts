/**
 * One-off helper to emit drizzle/0002_seed_public_demo.sql.
 * Requires PHI_ENCRYPTION_KEY from .env.local.example (local dev default).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hash } from 'argon2';
import { hourSlotsForDate, zonedLocalToUtcMs } from '../src/lib/clinic-hours';
import { LOCAL_DEV_PHI_ENCRYPTION_KEY } from '../src/lib/dev-secrets';
import { encryptSecret } from '../src/lib/secret-crypto';
import { PUBLIC_DEMO_MFA_SECRET } from '../src/lib/public-demo';

process.env.PHI_ENCRYPTION_KEY = LOCAL_DEV_PHI_ENCRYPTION_KEY;

const EPOCH = 1_704_067_200_000;
const SUBCRIPTION_UNTIL = Date.parse('2099-12-31T23:59:59.999Z');
const TIMEZONE = 'Asia/Kolkata';
const ANCHOR_FROM = '2026-08-30';
const ANCHOR_TO = '2026-08-31';

const IDS = {
  tenant: '01HQCFPUB0000000000000001',
  business: '01HQCFPUB0000000000000002',
  location: '01HQCFPUB0000000000000003',
  ownerUser: '01HQCFPUB0000000000000004',
  demoUser: '01HQCFPUB0000000000000005',
  doctorUser1: '01HQCFPUB0000000000000006',
  doctorUser2: '01HQCFPUB0000000000000007',
  ownerRole: '01HQCFPUB0000000000000008',
  doctorRole: '01HQCFPUB0000000000000009',
  viewerRole: '01HQCFPUB0000000000000010',
  doctorProfile1: '01HQCFPUB0000000000000011',
  doctorProfile2: '01HQCFPUB0000000000000012',
  patients: [
    '01HQCFPUB0000000000000020',
    '01HQCFPUB0000000000000021',
    '01HQCFPUB0000000000000022',
    '01HQCFPUB0000000000000023',
    '01HQCFPUB0000000000000024',
  ],
  appointments: [
    '01HQCFPUB0000000000000035',
    '01HQCFPUB0000000000000036',
    '01HQCFPUB0000000000000037',
    '01HQCFPUB0000000000000030',
    '01HQCFPUB0000000000000031',
    '01HQCFPUB0000000000000032',
    '01HQCFPUB0000000000000033',
    '01HQCFPUB0000000000000034',
  ],
  vitals: [
    '01HQCFPUB0000000000000044',
    '01HQCFPUB0000000000000045',
    '01HQCFPUB0000000000000046',
    '01HQCFPUB0000000000000040',
    '01HQCFPUB0000000000000041',
    '01HQCFPUB0000000000000042',
    '01HQCFPUB0000000000000043',
  ],
  procedures: [
    '01HQCFPUB0000000000000054',
    '01HQCFPUB0000000000000055',
    '01HQCFPUB0000000000000056',
    '01HQCFPUB0000000000000050',
    '01HQCFPUB0000000000000051',
    '01HQCFPUB0000000000000052',
    '01HQCFPUB0000000000000053',
  ],
  charges: [
    '01HQCFPUB0000000000000062',
    '01HQCFPUB0000000000000063',
    '01HQCFPUB0000000000000060',
  ],
  medicines: [
    '01HQCFPUB0000000000000064',
    '01HQCFPUB0000000000000061',
  ],
  inventory: [
    '01HQCFPUB0000000000000070',
    '01HQCFPUB0000000000000071',
    '01HQCFPUB0000000000000072',
    '01HQCFPUB0000000000000073',
    '01HQCFPUB0000000000000074',
  ],
} as const;

const PERM = {
  DASHBOARD_READ: '01HQCFPRM0000000000000028',
  BUSINESS_READ: '01HQCFPRM0000000000000001',
  LOCATION_READ: '01HQCFPRM0000000000000003',
  PATIENT_READ: '01HQCFPRM0000000000000017',
  DOCTOR_READ: '01HQCFPRM0000000000000018',
  DOCTOR_UPDATE: '01HQCFPRM0000000000000020',
  APPOINTMENT_READ: '01HQCFPRM0000000000000022',
  APPOINTMENT_CREATE: '01HQCFPRM0000000000000023',
  APPOINTMENT_UPDATE: '01HQCFPRM0000000000000024',
  INVENTORY_READ: '01HQCFPRM0000000000000025',
} as const;

const ALL_PERMISSION_IDS = [
  '01HQCFPRM0000000000000001',
  '01HQCFPRM0000000000000002',
  '01HQCFPRM0000000000000003',
  '01HQCFPRM0000000000000004',
  '01HQCFPRM0000000000000005',
  '01HQCFPRM0000000000000006',
  '01HQCFPRM0000000000000007',
  '01HQCFPRM0000000000000008',
  '01HQCFPRM0000000000000009',
  '01HQCFPRM0000000000000010',
  '01HQCFPRM0000000000000011',
  '01HQCFPRM0000000000000012',
  '01HQCFPRM0000000000000013',
  '01HQCFPRM0000000000000014',
  '01HQCFPRM0000000000000015',
  '01HQCFPRM0000000000000016',
  '01HQCFPRM0000000000000017',
  '01HQCFPRM0000000000000018',
  '01HQCFPRM0000000000000019',
  '01HQCFPRM0000000000000020',
  '01HQCFPRM0000000000000021',
  '01HQCFPRM0000000000000022',
  '01HQCFPRM0000000000000023',
  '01HQCFPRM0000000000000024',
  '01HQCFPRM0000000000000025',
  '01HQCFPRM0000000000000026',
  '01HQCFPRM0000000000000027',
  '01HQCFPRM0000000000000028',
];

function sql(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown) {
  return sql(JSON.stringify(value));
}

async function main() {
  const demoPasswordHash = await hash('DemoViewer!234');
  const ownerPasswordHash = await hash('OwnerDemo!234');
  const mfaSecretEnc = encryptSecret(PUBLIC_DEMO_MFA_SECRET);
  const slotsByDay = {
    from: hourSlotsForDate(ANCHOR_FROM, TIMEZONE, '09:00', '21:00'),
    to: hourSlotsForDate(ANCHOR_TO, TIMEZONE, '09:00', '21:00'),
  };
  const createdAtForDay = (ymd: string, hour = 8) => zonedLocalToUtcMs(ymd, hour, 0, TIMEZONE);
  const address = {
    line1: '42 CareFlow Lane',
    line2: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    country: 'IN',
  };
  const settings = { openTime: '09:00', closeTime: '21:00' };

  const lines: string[] = [
    '-- Public demo clinic (CareFlow Demo Clinic). Regenerated with scripts/generate-public-demo-sql.ts',
    '-- Requires LOCAL_DEV_PHI_ENCRYPTION_KEY from .env.local.example for demo MFA secret.',
  ];

  lines.push(
    `INSERT INTO \`tenants\` (\`id\`, \`name\`, \`status\`, \`subcriptionEnabled\`, \`subcriptionUntil\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`) VALUES`,
    `  (${sql(IDS.tenant)}, 'CareFlow Demo Clinic', 'ACTIVE', true, ${SUBCRIPTION_UNTIL}, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`,
    'ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `subcriptionEnabled` = VALUES(`subcriptionEnabled`), `subcriptionUntil` = VALUES(`subcriptionUntil`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  lines.push(
    `INSERT INTO \`businesses\` (\`id\`, \`tenantId\`, \`businessType\`, \`name\`, \`legalName\`, \`email\`, \`phone\`, \`country\`, \`currency\`, \`timezone\`, \`address\`, \`status\`, \`settings\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`) VALUES`,
    `  (${sql(IDS.business)}, ${sql(IDS.tenant)}, 'DENTAL', 'CareFlow Demo Clinic', 'CareFlow Demo Clinic Pvt Ltd', 'hello@careflow-demo.in', '022-4000-9000', 'IN', 'INR', 'Asia/Kolkata', ${sqlJson(address)}, 'ACTIVE', ${sqlJson(settings)}, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`,
    'ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `settings` = VALUES(`settings`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  lines.push(
    `INSERT INTO \`locations\` (\`id\`, \`tenantId\`, \`businessId\`, \`name\`, \`code\`, \`phone\`, \`email\`, \`timezone\`, \`address\`, \`status\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`) VALUES`,
    `  (${sql(IDS.location)}, ${sql(IDS.tenant)}, ${sql(IDS.business)}, 'Demo Clinic — Bandra', 'DEMO', '022-4000-9001', 'bandra@careflow-demo.in', 'Asia/Kolkata', ${sqlJson(address)}, 'ACTIVE', ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`,
    'ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  lines.push(
    `INSERT INTO \`users\` (\`id\`, \`tenantId\`, \`firstName\`, \`lastName\`, \`email\`, \`passwordHash\`, \`status\`, \`mfaEnabled\`, \`mfaSecretEnc\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`) VALUES`,
    `  (${sql(IDS.ownerUser)}, ${sql(IDS.tenant)}, 'Demo', 'Owner', 'owner@careflow-demo.in', ${sql(ownerPasswordHash)}, 'ACTIVE', false, NULL, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)}),`,
    `  (${sql(IDS.demoUser)}, ${sql(IDS.tenant)}, 'Demo', 'Viewer', 'demo@careflow.in', ${sql(demoPasswordHash)}, 'ACTIVE', true, ${sql(mfaSecretEnc)}, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)}),`,
    `  (${sql(IDS.doctorUser1)}, ${sql(IDS.tenant)}, 'Neha', 'Desai', 'neha.desai@careflow-demo.in', ${sql(ownerPasswordHash)}, 'ACTIVE', false, NULL, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)}),`,
    `  (${sql(IDS.doctorUser2)}, ${sql(IDS.tenant)}, 'Arjun', 'Kapoor', 'arjun.kapoor@careflow-demo.in', ${sql(ownerPasswordHash)}, 'ACTIVE', false, NULL, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`,
    'ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = VALUES(`status`), `mfaEnabled` = VALUES(`mfaEnabled`), `mfaSecretEnc` = VALUES(`mfaSecretEnc`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  lines.push(
    `INSERT INTO \`roles\` (\`id\`, \`tenantId\`, \`locationId\`, \`name\`, \`code\`, \`description\`, \`isSystem\`, \`templateCode\`, \`createdAt\`, \`updatedAt\`, \`createdBy\`, \`updatedBy\`) VALUES`,
    `  (${sql(IDS.ownerRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, 'Owner', 'TENANT_OWNER', 'Full access to the clinic', true, 'TENANT_OWNER', ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)}),`,
    `  (${sql(IDS.doctorRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, 'Doctor', 'DOCTOR', 'See patients and book appointments', true, 'DOCTOR', ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)}),`,
    `  (${sql(IDS.viewerRole)}, ${sql(IDS.tenant)}, NULL, 'Demo Viewer', 'DEMO_VIEWER', 'Read-only access for public demo', false, NULL, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`,
    'ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `locationId` = VALUES(`locationId`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  lines.push('INSERT INTO `user_roles` (`userId`, `roleId`, `tenantId`, `locationId`, `createdAt`) VALUES');
  lines.push(
    `  (${sql(IDS.ownerUser)}, ${sql(IDS.ownerRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${EPOCH}),`,
    `  (${sql(IDS.demoUser)}, ${sql(IDS.viewerRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${EPOCH}),`,
    `  (${sql(IDS.doctorUser1)}, ${sql(IDS.doctorRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${EPOCH}),`,
    `  (${sql(IDS.doctorUser2)}, ${sql(IDS.doctorRole)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${EPOCH})`,
    'ON DUPLICATE KEY UPDATE `locationId` = VALUES(`locationId`);',
    '--> statement-breakpoint',
  );

  lines.push('INSERT INTO `role_permissions` (`roleId`, `permissionId`, `createdAt`) VALUES');
  const ownerPermRows = ALL_PERMISSION_IDS.map((id) => `  (${sql(IDS.ownerRole)}, ${sql(id)}, ${EPOCH})`);
  lines.push(ownerPermRows.join(',\n'));
  lines.push('ON DUPLICATE KEY UPDATE `createdAt` = VALUES(`createdAt`);');
  lines.push('--> statement-breakpoint');

  const doctorPermIds = [
    PERM.DASHBOARD_READ,
    PERM.PATIENT_READ,
    PERM.DOCTOR_READ,
    PERM.DOCTOR_UPDATE,
    PERM.APPOINTMENT_READ,
    PERM.APPOINTMENT_CREATE,
    PERM.APPOINTMENT_UPDATE,
  ];
  lines.push('INSERT INTO `role_permissions` (`roleId`, `permissionId`, `createdAt`) VALUES');
  lines.push(doctorPermIds.map((id) => `  (${sql(IDS.doctorRole)}, ${sql(id)}, ${EPOCH})`).join(',\n'));
  lines.push('ON DUPLICATE KEY UPDATE `createdAt` = VALUES(`createdAt`);');
  lines.push('--> statement-breakpoint');

  const viewerPermIds = [
    PERM.DASHBOARD_READ,
    PERM.BUSINESS_READ,
    PERM.LOCATION_READ,
    PERM.PATIENT_READ,
    PERM.DOCTOR_READ,
    PERM.APPOINTMENT_READ,
    PERM.INVENTORY_READ,
  ];
  lines.push('INSERT INTO `role_permissions` (`roleId`, `permissionId`, `createdAt`) VALUES');
  lines.push(viewerPermIds.map((id) => `  (${sql(IDS.viewerRole)}, ${sql(id)}, ${EPOCH})`).join(',\n'));
  lines.push('ON DUPLICATE KEY UPDATE `createdAt` = VALUES(`createdAt`);');
  lines.push('--> statement-breakpoint');

  lines.push(
    `INSERT INTO \`doctor_profiles\` (\`id\`, \`tenantId\`, \`locationId\`, \`userId\`, \`specialty\`, \`createdAt\`, \`updatedAt\`) VALUES`,
    `  (${sql(IDS.doctorProfile1)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${sql(IDS.doctorUser1)}, 'General Dentistry', ${EPOCH}, ${EPOCH}),`,
    `  (${sql(IDS.doctorProfile2)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${sql(IDS.doctorUser2)}, 'Orthodontics', ${EPOCH}, ${EPOCH})`,
    'ON DUPLICATE KEY UPDATE `specialty` = VALUES(`specialty`), `updatedAt` = VALUES(`updatedAt`);',
    '--> statement-breakpoint',
  );

  const patients = [
    { firstName: 'Rahul', lastName: 'Mehta', phone: '9876500001', gender: 'Male', bloodGroup: 'O+', dob: '1985-01-15', allergies: 'Penicillin', chronic: 'None', createdDay: ANCHOR_FROM },
    { firstName: 'Priya', lastName: 'Sharma', phone: '9876500002', gender: 'Female', bloodGroup: 'A+', dob: '1986-02-15', allergies: 'None known', chronic: 'None', createdDay: ANCHOR_FROM },
    { firstName: 'Vikram', lastName: 'Nair', phone: '9876500003', gender: 'Male', bloodGroup: 'B+', dob: '1987-03-15', allergies: 'None known', chronic: 'Hypertension', createdDay: ANCHOR_FROM },
    { firstName: 'Ananya', lastName: 'Patel', phone: '9876500004', gender: 'Female', bloodGroup: 'AB+', dob: '1988-04-15', allergies: 'None known', chronic: 'None', createdDay: ANCHOR_TO },
    { firstName: 'Rohan', lastName: 'Iyer', phone: '9876500005', gender: 'Male', bloodGroup: 'O-', dob: '1989-05-15', allergies: 'None known', chronic: 'None', createdDay: ANCHOR_TO },
  ];
  lines.push(
    'INSERT INTO `patients` (`id`, `tenantId`, `locationId`, `firstName`, `lastName`, `phone`, `gender`, `bloodGroup`, `dateOfBirth`, `emergencyContactName`, `emergencyContactPhone`, `allergies`, `chronicConditions`, `currentMedicines`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    patients
      .map((p, i) => {
        const id = IDS.patients[i];
        const createdAt = createdAtForDay(p.createdDay);
        return `  (${sql(id)}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${sql(p.firstName)}, ${sql(p.lastName)}, ${sql(p.phone)}, ${sql(p.gender)}, ${sql(p.bloodGroup)}, ${sql(`${p.dob} 00:00:00.000`)}, ${sql(`${p.firstName} Contact`)}, ${sql(String(9800000001 + i))}, ${sql(p.allergies)}, ${sql(p.chronic)}, 'None', ${createdAt}, ${createdAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  type AppointmentSpec = {
    day: 'from' | 'to';
    slotIndex: number;
    patientIndex: number;
    doctorUserId: string;
    status: string;
    type: string;
    reason: string;
  };

  const specs: AppointmentSpec[] = [
    { day: 'from', slotIndex: 9, patientIndex: 0, doctorUserId: IDS.doctorUser1, status: 'Completed', type: 'Consultation', reason: 'Routine cleaning and oral exam' },
    { day: 'from', slotIndex: 10, patientIndex: 1, doctorUserId: IDS.doctorUser2, status: 'Completed', type: 'Procedure', reason: 'Composite filling on lower molar' },
    { day: 'from', slotIndex: 11, patientIndex: 2, doctorUserId: IDS.doctorUser1, status: 'Confirmed', type: 'Follow-up', reason: 'Post-treatment review' },
    { day: 'to', slotIndex: 0, patientIndex: 0, doctorUserId: IDS.doctorUser1, status: 'Completed', type: 'Consultation', reason: 'Routine dental check-up' },
    { day: 'to', slotIndex: 1, patientIndex: 1, doctorUserId: IDS.doctorUser2, status: 'In progress', type: 'Consultation', reason: 'Follow-up for sensitivity' },
    { day: 'to', slotIndex: 2, patientIndex: 2, doctorUserId: IDS.doctorUser1, status: 'Confirmed', type: 'Follow-up', reason: 'Braces adjustment review' },
    { day: 'to', slotIndex: 3, patientIndex: 3, doctorUserId: IDS.doctorUser2, status: 'Cancelled', type: 'Consultation', reason: 'Tooth pain consultation' },
    { day: 'to', slotIndex: 4, patientIndex: 4, doctorUserId: IDS.doctorUser1, status: 'Confirmed', type: 'Check-up', reason: 'Annual dental screening' },
  ];

  lines.push(
    'INSERT INTO `appointments` (`id`, `tenantId`, `locationId`, `patientId`, `doctorUserId`, `type`, `status`, `startsAt`, `endsAt`, `reasonForVisit`, `pastHistory`, `habits`, `cancelReason`, `checkedInAt`, `startedAt`, `completedAt`, `taxPercent`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    specs
      .map((spec, index) => {
        const slot = slotsByDay[spec.day][spec.slotIndex];
        const isCompleted = spec.status === 'Completed';
        const isInProgress = spec.status === 'In progress';
        const checkedIn = isCompleted || isInProgress ? slot.startsAt : null;
        const completedAt = isCompleted ? slot.endsAt : null;
        const cancelReason = spec.status === 'Cancelled' ? 'Patient rescheduled' : null;
        const createdAt = createdAtForDay(spec.day === 'from' ? ANCHOR_FROM : ANCHOR_TO);
        return `  (${sql(IDS.appointments[index])}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${sql(IDS.patients[spec.patientIndex])}, ${sql(spec.doctorUserId)}, ${sql(spec.type)}, ${sql(spec.status)}, ${slot.startsAt}, ${slot.endsAt}, ${sql(spec.reason)}, 'No major surgical history.', 'Non-smoker. Brushes twice daily.', ${cancelReason ? sql(cancelReason) : 'NULL'}, ${checkedIn ?? 'NULL'}, ${checkedIn ?? 'NULL'}, ${completedAt ?? 'NULL'}, ${isCompleted ? 5 : 0}, ${createdAt}, ${createdAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `startsAt` = VALUES(`startsAt`), `endsAt` = VALUES(`endsAt`), `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  const activeSpecs = specs.map((spec, index) => ({ ...spec, index })).filter((spec) => spec.status !== 'Cancelled');
  lines.push(
    'INSERT INTO `appointment_vitals` (`id`, `tenantId`, `appointmentId`, `bpSystolic`, `bpDiastolic`, `pulse`, `temperature`, `spo2`, `weightKg`, `heightCm`, `bmi`, `recordedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    activeSpecs
      .map((spec, vi) => {
        const recordedAt = createdAtForDay(spec.day === 'from' ? ANCHOR_FROM : ANCHOR_TO, 10);
        return `  (${sql(IDS.vitals[vi])}, ${sql(IDS.tenant)}, ${sql(IDS.appointments[spec.index])}, ${118 + spec.patientIndex * 2}, ${76 + spec.patientIndex}, ${72 + spec.patientIndex}, 36.8, 98, ${68 + spec.patientIndex}, 168, 24.1, ${recordedAt}, ${recordedAt}, ${recordedAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  lines.push(
    'INSERT INTO `appointment_procedures` (`id`, `tenantId`, `appointmentId`, `examination`, `treatment`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    activeSpecs
      .map((spec, pi) => {
        const isCompleted = spec.status === 'Completed';
        const createdAt = createdAtForDay(spec.day === 'from' ? ANCHOR_FROM : ANCHOR_TO, 10);
        return `  (${sql(IDS.procedures[pi])}, ${sql(IDS.tenant)}, ${sql(IDS.appointments[spec.index])}, 'Oral cavity examined. No acute concerns.', ${sql(isCompleted ? 'Cleaning completed. Home care reviewed.' : 'Assessment in progress.')}, ${createdAt}, ${createdAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  const completedSpecs = specs
    .map((spec, index) => ({ ...spec, index }))
    .filter((spec) => spec.status === 'Completed');
  lines.push(
    'INSERT INTO `appointment_charges` (`id`, `tenantId`, `appointmentId`, `charge_for`, `amount`, `tax`, `amount_with_tax`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    completedSpecs
      .map((spec, ci) => {
        const amount = ci === 0 ? 500 : ci === 1 ? 1200 : 500;
        const tax = Math.round(amount * 0.05);
        const createdAt = createdAtForDay(spec.day === 'from' ? ANCHOR_FROM : ANCHOR_TO, 11);
        return `  (${sql(IDS.charges[ci])}, ${sql(IDS.tenant)}, ${sql(IDS.appointments[spec.index])}, ${sql(ci === 1 ? 'Filling procedure' : 'Consultation fee')}, ${amount}, ${tax}, ${amount + tax}, ${createdAt}, ${createdAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  lines.push(
    'INSERT INTO `appointment_medicines` (`id`, `tenantId`, `appointmentId`, `medicine`, `dose`, `frequency`, `duration`, `instructions`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    completedSpecs
      .slice(0, 2)
      .map((spec, mi) => {
        const createdAt = createdAtForDay(spec.day === 'from' ? ANCHOR_FROM : ANCHOR_TO, 11);
        return `  (${sql(IDS.medicines[mi])}, ${sql(IDS.tenant)}, ${sql(IDS.appointments[spec.index])}, 'Paracetamol 500mg', '1 tablet', 'Twice daily', '3 days', 'After food', ${createdAt}, ${createdAt}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  const inventory = [
    { name: 'Surgical gloves', sku: 'DEMO-101', category: 'PPE', unit: 'boxes', quantity: 120, maxQuantity: 200 },
    { name: 'N95 masks', sku: 'DEMO-102', category: 'PPE', unit: 'boxes', quantity: 45, maxQuantity: 100 },
    { name: 'Digital thermometer', sku: 'DEMO-103', category: 'Devices', unit: 'pcs', quantity: 12, maxQuantity: 20 },
    { name: 'Composite filling A2', sku: 'DEMO-104', category: 'Pharmacy', unit: 'packs', quantity: 80, maxQuantity: 120 },
    { name: 'Alcohol swabs', sku: 'DEMO-105', category: 'Consumables', unit: 'boxes', quantity: 60, maxQuantity: 100 },
  ];
  lines.push(
    'INSERT INTO `inventory_items` (`id`, `tenantId`, `locationId`, `name`, `sku`, `category`, `unit`, `quantity`, `maxQuantity`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`) VALUES',
  );
  lines.push(
    inventory
      .map((item, i) => {
        return `  (${sql(IDS.inventory[i])}, ${sql(IDS.tenant)}, ${sql(IDS.location)}, ${sql(item.name)}, ${sql(item.sku)}, ${sql(item.category)}, ${sql(item.unit)}, ${item.quantity}, ${item.maxQuantity}, ${EPOCH}, ${EPOCH}, ${sql(IDS.ownerUser)}, ${sql(IDS.ownerUser)})`;
      })
      .join(',\n'),
  );
  lines.push('ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`), `updatedAt` = VALUES(`updatedAt`);');
  lines.push('--> statement-breakpoint');

  lines.push(`UPDATE patients p
INNER JOIN (
  SELECT patientId, MAX(startsAt) AS lastVisitAt
  FROM appointments
  WHERE tenantId = ${sql(IDS.tenant)} AND deletedAt IS NULL
  GROUP BY patientId
) a ON a.patientId = p.id
SET p.lastVisitAt = a.lastVisitAt, p.updatedAt = ${EPOCH}, p.updatedBy = ${sql(IDS.ownerUser)}
WHERE p.tenantId = ${sql(IDS.tenant)} AND p.deletedAt IS NULL;`);

  const outPath = resolve(__dirname, '../drizzle/0002_seed_public_demo.sql');
  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
