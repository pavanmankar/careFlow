import { eq, like } from 'drizzle-orm';
import { closeDb, db } from '@/db/client';
import { users } from '@/db/schema';
import { resetUserMfa } from '@/modules/mfa/mfa.service';

async function main() {
  const target = (process.argv[2] ?? '').trim().toLowerCase();
  if (!target) {
    throw new Error('Usage: tsx scripts/reset-user-mfa.ts <email|--sunrise-demo>');
  }

  const where =
    target === '--sunrise-demo'
      ? like(users.email, '%@sunriseclinic.in')
      : eq(users.email, target);

  const rows = await db
    .select({ id: users.id, email: users.email, tenantId: users.tenantId })
    .from(users)
    .where(where);

  if (rows.length === 0) {
    throw new Error(`No users matched: ${target}`);
  }

  for (const user of rows) {
    const result = await resetUserMfa(user.id, {
      actorId: user.id,
      tenantId: user.tenantId,
    });
    console.log(`MFA reset for ${result.email}`);
    console.log(`  mfaEnabled: ${result.mfaEnabled}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
