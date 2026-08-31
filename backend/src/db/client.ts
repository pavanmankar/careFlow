import { and, inArray, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '@/lib/config';
import { utcNowMs } from '@/lib/time';
import * as schema from './schema';
import { roles } from './schema';

function mysqlPoolOptions() {
  const url = config.databaseUrl.replace('@localhost:', '@127.0.0.1:');
  return {
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: 5000,
    timezone: 'Z' as const,
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

export async function pingDb() {
  await db.execute(sql`SELECT 1`);
}

export async function closeDb() {
  await pool.end();
}
