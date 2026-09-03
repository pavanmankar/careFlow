import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is required');
  }
  const u = new URL(raw.replace('@localhost:', '@127.0.0.1:'));
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20_000,
  });
  await conn.query('CREATE DATABASE IF NOT EXISTS `careflow-dev`');
  const [rows] = await conn.query('SHOW DATABASES LIKE ?', ['careflow-dev']);
  const list = rows as unknown[];
  console.log(list.length ? 'careflow-dev database is ready' : 'careflow-dev was not created');
  await conn.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
