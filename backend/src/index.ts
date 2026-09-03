import { config } from '@/lib/config';
import { validateConfig } from '@/lib/validate-config';
import { createApp } from '@/app';
import { mysqlDatabaseName, pingDb } from '@/db/client';
import { startAppointmentExpiryScheduler } from '@/jobs/expire-appointments';
import { logger } from '@/lib/logger';

async function main() {
  validateConfig();
  const app = createApp();
  await pingDb();
  const database = mysqlDatabaseName();
  if (database === 'defaultdb') {
    logger.warn(
      'MySQL is connected to defaultdb, which is empty. Set DATABASE_URL to .../careflow-dev and restart.',
    );
  }
  startAppointmentExpiryScheduler();
  app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} (MySQL database: ${database})`);
    if (config.nodeEnv !== 'production') {
      logger.info(`Swagger: http://localhost:${config.port}/api/docs`);
    }
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start API');
  process.exit(1);
});
