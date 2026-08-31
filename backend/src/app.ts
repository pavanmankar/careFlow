import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import Redis from 'ioredis';
import { config } from '@/lib/config';
import { pingDb } from '@/db/client';
import { contextMiddleware } from '@/lib/context';
import { errorHandler, wrap } from '@/middleware/error-handler';
import { authRouter } from '@/modules/auth/auth.routes';
import { businessTypesRouter } from '@/modules/business-types/business-types.routes';
import { tenantsRouter, businessRouter, locationsRouter } from '@/modules/business/business.routes';
import { usersRouter } from '@/modules/users/users.routes';
import { rolesRouter, permissionsRouter } from '@/modules/roles/roles.routes';
import { doctorsRouter } from '@/modules/doctors/doctors.routes';
import { patientsRouter } from '@/modules/patients/patients.routes';
import { appointmentsRouter } from '@/modules/appointments/appointments.routes';
import { dashboardRouter } from '@/modules/dashboard/dashboard.routes';
import { inventoryRouter } from '@/modules/inventory/inventory.routes';
import { metadataRouter } from '@/modules/metadata/metadata.routes';
import { platformSettingsRouter } from '@/modules/platform-settings/platform-settings.routes';
import { openApiDocument } from '@/openapi';
import { toJsonUtcMillis } from '@/lib/time';

export function createApp() {
  const app = express();
  app.use(
    helmet({
      hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  const allowedOrigins = new Set([
    config.webUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...config.corsOrigins,
  ]);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(contextMiddleware);
  app.use((_req, res, next) => {
    const sendJson = res.json.bind(res);
    res.json = ((body: unknown) => sendJson(toJsonUtcMillis(body))) as typeof res.json;
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    message: { code: 'RATE_LIMIT', message: 'Too many requests.' },
  });
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    message: { code: 'RATE_LIMIT', message: 'Too many requests.' },
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get(
    '/health/ready',
    wrap(async (_req, res) => {
      await pingDb();
      const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
      try {
        const pong = await redis.ping();
        if (pong !== 'PONG') {
          throw new Error('Redis not ready');
        }
      } finally {
        redis.disconnect();
      }
      res.json({ status: 'ok' });
    }),
  );

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/business-types', businessTypesRouter);
  app.use('/api/v1/tenants', tenantsRouter);
  app.use('/api/v1/business', businessRouter);
  app.use('/api/v1/locations', locationsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/roles', rolesRouter);
  app.use('/api/v1/doctors', doctorsRouter);
  app.use('/api/v1/patients', patientsRouter);
  app.use('/api/v1/appointments', appointmentsRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/metadata', metadataRouter);
  app.use('/api/v1/platform-settings', platformSettingsRouter);
  app.use('/api/v1', permissionsRouter);

  app.use((_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
  });
  app.use(errorHandler);
  return app;
}
