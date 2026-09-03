import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { createStamps, db, nowMs } from '@/db/client';
import { doctorProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureDoctorProfile(userId: string, tenantId: string, locationId?: string | null) {
  const existing = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) });
  if (existing) {
    if (locationId && !existing.locationId) {
      await db
        .update(doctorProfiles)
        .set({ locationId, updatedAt: BigInt(utcNowMs()) })
        .where(eq(doctorProfiles.userId, userId));
      return { ...existing, locationId };
    }
    return existing;
  }
  const id = ULID.random();
  await db.insert(doctorProfiles).values({
    id,
    tenantId,
    locationId: locationId ?? null,
    userId,
    specialty: '',
    createdAt: nowMs(),
    updatedAt: BigInt(utcNowMs()),
  });
  return (
    (await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) })) ?? {
      id,
      tenantId,
      locationId: locationId ?? null,
      userId,
      specialty: '',
      ...createStamps(),
    }
  );
}
