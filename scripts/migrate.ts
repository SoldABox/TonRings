import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
const sql = postgres(env.DATABASE_URL, { max: 1 });
try {
  const migration = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8');
  await sql.unsafe(migration);
  console.log('Database migration completed.');
} finally {
  await sql.end();
}
