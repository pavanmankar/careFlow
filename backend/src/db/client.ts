import { and, inArray, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '@/lib/config';
import { utcNowMs } from '@/lib/time';
import * as schema from './schema';
import { roles } from './schema';

function mysqlPoolOptions() {
  const raw = config.databaseUrl.replace('@localhost:', '@127.0.0.1:');
  const parsed = new URL(raw);
  const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    waitForConnections: true,
    connectionLimit: isLocal ? 10 : 4,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: isLocal ? 5000 : 20000,
    timezone: 'Z' as const,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}

export const pool = mysql.createPool(mysqlPoolOptions());

export const db = drizzle(pool, { schema, mode: 'default' });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function nowMs() {
  return BigInt(utcNowMs());
}

export function createStamps() {
  const now = nowMs();
  return { createdAt: now, updatedAt: now };
}

export function updateStamp() {
  return { updatedAt: nowMs() };
}

export function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined)) as Partial<T>;
}

export function contains(value: string) {
  return `%${value.trim().toLowerCase().replace(/[%_\\]/g, '\\$&')}%`;
}

/** Case-insensitive substring match for MySQL (works even with binary collations). */
export function likeContains(column: SQLWrapper, value: string) {
  return sql`LOWER(${column}) LIKE ${contains(value)}`;
}

export async function liveRoleIds(ids: string[]) {
  if (!ids.length) {
    return new Set<string>();
  }
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(isNull(roles.deletedAt), inArray(roles.id, ids)));
  return new Set(rows.map((row) => row.id));
}

export function mysqlDatabaseName() {
  return mysqlPoolOptions().database;
}

export async function pingDb() {
  await db.execute(sql`SELECT 1`);
}

export async function closeDb() {
  await pool.end();
}
