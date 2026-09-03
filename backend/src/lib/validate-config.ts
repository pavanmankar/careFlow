import { config } from '@/lib/config';
import { LOCAL_DEV_JWT_SECRET, WEAK_JWT_SECRETS } from '@/lib/dev-secrets';

export function validateConfigValues(values: {
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
}) {
  if (!values.databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const secret = values.jwtSecret;
  if (!secret || WEAK_JWT_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET must be set to a strong value (see .env.local.example for local dev).');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }
  if (values.nodeEnv === 'production' && secret === LOCAL_DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must not use the local development constant in production.');
  }
}

export function validateConfig() {
  validateConfigValues({
    nodeEnv: config.nodeEnv,
    databaseUrl: config.databaseUrl,
    jwtSecret: config.jwtSecret,
  });
}
