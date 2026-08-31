import { and, eq, isNull } from 'drizzle-orm';
import { closeDb, db, nowMs } from './src/db/client';
import { appointments, businesses, patients, users } from './src/db/schema';
import { clinicHoursFromSettings, formatSlotLabel, hourSlotsForDate, ymdInTimeZone } from './src/lib/clinic-hours';

const TIMEZONE = 'Asia/Kolkata';
const OWNER_EMAIL = 'anita.desai@sunriseclinic.in';
const DOCTOR_MATCH = "Neha";

async function main() {
  const now = Date.now();
  const ymd = ymdInTimeZone(now, TIMEZONE);
  const owner = await db.query.users.findFirst({ where: eq(users.email, OWNER_EMAIL) });
  if (!owner) throw new Error('Demo clinic owner not found');
  const tenantId = owner.tenantId;
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) throw new Error('Demo clinic business not found');
  const hours = clinicHoursFromSettings(business.settings);
  const slots = hourSlotsForDate(ymd, TIMEZONE, hours.openTime, hours.closeTime);
  const currentSlot = slots.find((slot) => now >= slot.startsAt && now < slot.endsAt);
  const bookSlot = slots.find((slot) => slot.startsAt > now) ?? currentSlot;
  if (!bookSlot) throw new Error('No future clinic slot available today');

  const doctors = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    with: { doctorProfile: true },
  });
  const doctor = doctors.find((d) => {
    const name = `${d.firstName} ${d.lastName}`.trim();
    return name.toLowerCase().includes(DOCTOR_MATCH.toLowerCase());
  }) ?? doctors.find((d) => d.doctorProfile);
  if (!doctor) throw new Error('No doctor found for demo');

  const active = await db.query.appointments.findMany({
    where: and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.doctorUserId, doctor.id),
      eq(appointments.startsAt, BigInt(bookSlot.startsAt)),
      isNull(appointments.deletedAt),
    ),
  });
  const stamp = nowMs();
  for (const apt of active) {
    if (apt.status !== 'Cancelled') {
      await db.update(appointments).set({
        status: 'Cancelled',
        cancelReason: 'Demo slot cleared',
        updatedAt: stamp,
      }).where(eq(appointments.id, apt.id));
    }
  }

  const demoPhone = '9876543210';
  const demoPatients = await db.query.patients.findMany({
    where: and(eq(patients.tenantId, tenantId), eq(patients.phone, demoPhone), isNull(patients.deletedAt)),
  });
  for (const patient of demoPatients) {
    const demoApts = await db.query.appointments.findMany({
      where: and(eq(appointments.tenantId, tenantId), eq(appointments.patientId, patient.id), isNull(appointments.deletedAt)),
    });
    for (const apt of demoApts) {
      if (apt.status !== 'Cancelled' && apt.status !== 'Completed') {
        await db.update(appointments).set({
          status: 'Cancelled',
          cancelReason: 'Demo reset',
          updatedAt: stamp,
        }).where(eq(appointments.id, apt.id));
      }
    }
  }

  const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();
  console.log(JSON.stringify({
    doctorUserId: doctor.id,
    doctorName,
    bookStartsAt: bookSlot.startsAt,
    bookEndsAt: bookSlot.endsAt,
    bookHour: bookSlot.hour,
    bookSlotLabel: formatSlotLabel(bookSlot.hour),
    currentStartsAt: currentSlot?.startsAt ?? bookSlot.startsAt,
    currentEndsAt: currentSlot?.endsAt ?? bookSlot.endsAt,
    currentHour: currentSlot?.hour ?? bookSlot.hour,
    currentSlotLabel: currentSlot ? formatSlotLabel(currentSlot.hour) : formatSlotLabel(bookSlot.hour),
  }));
  await closeDb();
}

main().catch((err) => { console.error(err); process.exit(1); });
