import { closeDb } from '@/db/client';
import { migrateLocationBranchSchema } from '@/db/migrate-location-branch';

async function main() {
  await migrateLocationBranchSchema();
  console.log('Location branch migration complete.');
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
