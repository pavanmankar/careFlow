import pino from 'pino';
import { config } from '@/lib/config';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'allergies',
      'chronicConditions',
      'currentMedicines',
      'reasonForVisit',
      'pastHistory',
      'habits',
      'internalNote',
      'examination',
      'treatment',
    ],
    remove: true,
  },
});
