import { defineConfig } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

loadEnv();

const databaseUrl = process.env.DATABASE_URL ?? '';
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const isLocal =
  !parsed || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: parsed
    ? {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, '').split('?')[0],
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
      }
    : { url: '' },
});
