import { closeDb } from './client';
import { migrateSubscriptionSchema } from './migrate-subscription';

async function main() {
  await migrateSubscriptionSchema();
  console.log('Subscription schema is up to date.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
