import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import { db, nowMs } from '@/db/client';
import { appointments } from '@/db/schema';

const CONFIRMED = 'Confirmed';
const EXPIRED = 'Expired';
const DEFAULT_INTERVAL_MS = 60_000;

export async function expireOverdueConfirmedAppointments() {
  const now = nowMs();
  await db
    .update(appointments)
    .set({ status: CONFIRMED, updatedAt: now })
    .where(and(inArray(appointments.status, ['Waiting', 'Pending']), isNull(appointments.deletedAt)));
  await db
    .update(appointments)
    .set({ status: EXPIRED, updatedAt: now })
    .where(and(eq(appointments.status, CONFIRMED), lt(appointments.endsAt, now), isNull(appointments.deletedAt)));
}

export function startAppointmentExpiryScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  const tick = () => {
    expireOverdueConfirmedAppointments().catch((error) => {
      console.error('Failed to expire confirmed appointments', error);
    });
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  return () => clearInterval(timer);
}
