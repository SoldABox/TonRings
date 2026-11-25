import { loadEnv } from '../src/config/env.js';
import { PostgresStore } from '../src/persistence/postgres.js';

const env = loadEnv();
const retentionSeconds = Number(process.env.AUTH_RETENTION_SECONDS ?? '86400');
const batchSize = Number(process.env.AUTH_CLEANUP_BATCH_SIZE ?? '1000');
const store = new PostgresStore(env.DATABASE_URL);

try {
  let totalNonces = 0;
  let totalSessions = 0;
  for (;;) {
    const result = await store.cleanupExpiredAuth(retentionSeconds, batchSize);
    totalNonces += result.noncesDeleted;
    totalSessions += result.sessionsDeleted;
    if (result.noncesDeleted < batchSize && result.sessionsDeleted < batchSize) break;
  }
  console.log(JSON.stringify({
    noncesDeleted: totalNonces,
    sessionsDeleted: totalSessions,
    retentionSeconds,
    batchSize,
  }));
} finally {
  await store.close();
}
