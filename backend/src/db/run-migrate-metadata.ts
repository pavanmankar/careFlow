import { closeDb } from './client';
import { migrateBusinessTypesToMetadata } from './migrate-metadata';

async function main() {
  await migrateBusinessTypesToMetadata();
  console.log('Migrated business types into metadata.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
