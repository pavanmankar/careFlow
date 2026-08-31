import { config } from '@/lib/config';
import { createApp } from '@/app';
import { pingDb } from '@/db/client';
import { startAppointmentExpiryScheduler } from '@/jobs/expire-appointments';

async function main() {
  const app = createApp();
  await pingDb();
  startAppointmentExpiryScheduler();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
    console.log(`Swagger: http://localhost:${config.port}/api/docs`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
