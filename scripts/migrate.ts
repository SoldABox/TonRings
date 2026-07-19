import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });

try {
  await sql`SELECT set_config('app.ton_diamonds_collection', ${env.TON_DIAMONDS_COLLECTION}, false)`;

  const migrationsDirectory = new URL('../migrations/', import.meta.url);
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right));

  if (migrationFiles.length === 0) throw new Error('No database migrations found');

  for (const file of migrationFiles) {
    const migration = await readFile(new URL(file, migrationsDirectory), 'utf8');
    await sql.unsafe(migration);
    console.log(`Applied migration: ${file}`);
  }

  console.log('Database migrations completed.');
} finally {
  await sql.end();
}
