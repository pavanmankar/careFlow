import { and, desc, eq, isNull } from 'drizzle-orm';
import { closeDb, db, nowMs } from './src/db/client';
import { appointments, businesses, users } from './src/db/schema';
import { clinicHoursFromSettings, hourSlotsForDate, ymdInTimeZone } from './src/lib/clinic-hours';

const TIMEZONE = 'Asia/Kolkata';
const OWNER_EMAIL = 'anita.desai@sunriseclinic.in';

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
  if (!currentSlot) throw new Error('Outside clinic hours — record during 9 AM–9 PM IST');

  let apt = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.startsAt, BigInt(currentSlot.startsAt)),
      isNull(appointments.deletedAt),
    ),
  });
  if (!apt) {
    apt = await db.query.appointments.findFirst({
      where: and(eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
      orderBy: [desc(appointments.startsAt)],
    });
  }
  if (!apt) throw new Error('No appointments found — run pnpm db:seed:demo');

  const stamp = nowMs();
  await db
    .update(appointments)
    .set({
      status: 'Confirmed',
      startsAt: BigInt(currentSlot.startsAt),
      endsAt: BigInt(currentSlot.endsAt),
      checkedInAt: null,
      startedAt: null,
      completedAt: null,
      cancelReason: null,
      updatedAt: stamp,
    })
    .where(eq(appointments.id, apt.id));

  console.log(JSON.stringify({ id: apt.id }));
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
