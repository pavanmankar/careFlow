import { loadEnvFiles } from '@/lib/load-env';

loadEnvFiles();

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function parseOriginList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((origin) => stripTrailingSlash(origin.trim()))
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appEnv: process.env.APP_ENV ?? null,
  /** Render injects PORT; locally we use API_PORT. */
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 3001),
  webUrl: stripTrailingSlash(process.env.WEB_URL ?? 'http://localhost:3000'),
  corsOrigins: parseOriginList(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  phiEncryptionKey: process.env.PHI_ENCRYPTION_KEY ?? '',
  databaseSslCa: process.env.DATABASE_SSL_CA ?? '',
};
