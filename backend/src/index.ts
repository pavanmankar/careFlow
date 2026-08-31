import { config } from '@/lib/config';
import { createApp } from '@/app';
import { mysqlDatabaseName, pingDb } from '@/db/client';
import { startAppointmentExpiryScheduler } from '@/jobs/expire-appointments';

async function main() {
  const app = createApp();
  await pingDb();
  const database = mysqlDatabaseName();
  if (database === 'defaultdb') {
    console.warn(
      'MySQL is connected to defaultdb, which is empty. Set DATABASE_URL to .../careflow-dev and restart.',
    );
  }
  startAppointmentExpiryScheduler();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port} (MySQL database: ${database})`);
    console.log(`Swagger: http://localhost:${config.port}/api/docs`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
