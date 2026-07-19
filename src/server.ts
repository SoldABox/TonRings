import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { loadEnv } from './config/env.js';
import { PostgresStore } from './persistence/postgres.js';

const env = loadEnv();
const app = Fastify({ logger: true, bodyLimit: 64 * 1024, trustProxy: true });
const store = new PostgresStore(env.DATABASE_URL);

await app.register(cors, { origin: env.APP_ORIGIN, credentials: true });
await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

app.get('/health', async () => ({ ok: true, service: 'ton-rings', version: '0.3.0' }));
app.get('/ready', async (_request, reply) => {
  const missing = [
    env.TONCENTER_API_KEY ? null : 'TONCENTER_API_KEY',
    env.PINATA_JWT ? null : 'PINATA_JWT',
    env.TON_DIAMONDS_COLLECTION.startsWith('REPLACE') ? 'TON_DIAMONDS_COLLECTION' : null,
    env.RING_COLLECTION_ADDRESS.startsWith('REPLACE') ? 'RING_COLLECTION_ADDRESS' : null,
  ].filter(Boolean);
  return reply.code(missing.length ? 503 : 200).send({ ready: missing.length === 0, missing });
});

app.post('/api/auth/nonce', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async () => {
  return store.issueNonce(300);
});

app.get('/api/enchantments/ring/:address', async request => {
  const params = z.object({ address: z.string().min(10) }).parse(request.params);
  return { enchantment: await store.findActiveByRing(params.address) };
});

app.get('/api/enchantments/diamond/:address', async request => {
  const params = z.object({ address: z.string().min(10) }).parse(request.params);
  return { enchantment: await store.findActiveByDiamond(params.address) };
});

app.post('/api/enchantments/revoke', async (request, reply) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return reply.code(401).send({ error: 'missing bearer token' });
  const wallet = await store.sessionWallet(token);
  if (!wallet) return reply.code(401).send({ error: 'invalid session' });
  const body = z.object({ id: z.string().uuid() }).parse(request.body);
  const revoked = await store.revoke(body.id, wallet);
  return reply.code(revoked ? 200 : 404).send({ revoked });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const status = error instanceof z.ZodError ? 400 : 500;
  void reply.code(status).send({ error: status === 400 ? 'invalid request' : 'internal error' });
});

const shutdown = async () => {
  await app.close();
  await store.close();
};
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: env.HOST, port: env.PORT });
