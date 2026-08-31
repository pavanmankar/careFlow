import { closeDb } from './client';
import { migrateVisitSchema } from './migrate-visit';

async function main() {
  await migrateVisitSchema();
  console.log('Visit schema is up to date.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
