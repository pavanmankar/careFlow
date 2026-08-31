import { and, eq, isNull } from 'drizzle-orm';
import { closeDb, db, nowMs } from './src/db/client';
import { appointments, businesses, users } from './src/db/schema';
import { clinicHoursFromSettings, hourSlotsForDate, ymdInTimeZone } from './src/lib/clinic-hours';

const TIMEZONE = 'Asia/Kolkata';
const VISIT_ID = "01M1BFGQQPM67SDRFF6MH366YH";

async function main() {
  const now = Date.now();
  const ymd = ymdInTimeZone(now, TIMEZONE);
  const apt = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, VISIT_ID), isNull(appointments.deletedAt)),
  });
  if (!apt) throw new Error('Visit not found');
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.tenantId, apt.tenantId), isNull(businesses.deletedAt)),
  });
  if (!business) throw new Error('Business not found');
  const hours = clinicHoursFromSettings(business.settings);
  const slots = hourSlotsForDate(ymd, TIMEZONE, hours.openTime, hours.closeTime);
  const currentSlot = slots.find((slot) => now >= slot.startsAt && now < slot.endsAt);
  if (!currentSlot) throw new Error('Outside current slot window');
  await db.update(appointments).set({
    status: 'Confirmed',
    startsAt: BigInt(currentSlot.startsAt),
    endsAt: BigInt(currentSlot.endsAt),
    checkedInAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: nowMs(),
  }).where(eq(appointments.id, VISIT_ID));
  console.log(JSON.stringify({ id: VISIT_ID, startsAt: currentSlot.startsAt }));
  await closeDb();
}

main().catch((err) => { console.error(err); process.exit(1); });
