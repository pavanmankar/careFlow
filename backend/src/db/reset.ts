import mysql from 'mysql2/promise';
import { config } from '@/lib/config';

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url.replace('@localhost:', '@127.0.0.1:'));
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }
  const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    isLocal,
  };
}

async function main() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  const { host, port, user, password, database } = parseDatabaseUrl(config.databaseUrl);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Database reset: ${database}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
