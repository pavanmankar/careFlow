import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { createStamps, db, nowMs } from '@/db/client';
import { doctorProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureDoctorProfile(userId: string, tenantId: string) {
  const existing = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) });
  if (existing) {
    return existing;
  }
  const id = ULID.random();
  await db.insert(doctorProfiles).values({
    id,
    tenantId,
    userId,
    specialty: '',
    createdAt: nowMs(),
    updatedAt: BigInt(utcNowMs()),
  });
  return (
    (await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) })) ?? {
      id,
      tenantId,
      userId,
      specialty: '',
      ...createStamps(),
    }
  );
}
