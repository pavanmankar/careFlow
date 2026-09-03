import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Load env files in order (later files override earlier ones):
 * 1. `.env` — base / shared defaults
 * 2. `.env.${APP_ENV}` — when APP_ENV is set (e.g. local, development, production)
 * 3. `.env.local` — machine-specific overrides (always wins when present)
 *
 * Examples:
 * - Local MySQL: put values in `.env.local` (or `APP_ENV=local` + `.env.local`)
 * - Shared careflow-dev: `APP_ENV=development` with `.env.development`
 * - Hosted (Render): inject env vars; files are optional
 */
export function loadEnvFiles(cwd = process.cwd()) {
  const files = ['.env'];
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv) {
    files.push(`.env.${appEnv}`);
  }
  files.push('.env.local');

  for (const file of files) {
    const path = resolve(cwd, file);
    if (existsSync(path)) {
      loadEnv({ path, override: true });
    }
  }
}
