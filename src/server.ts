import { createHash, randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Address } from '@ton/core';
import { z } from 'zod';
import { verifyTonProof, type TonProof } from './auth/tonProof.js';
import { loadEnv } from './config/env.js';
import { EnchantmentRequestSchema } from './enchantment/schema.js';
import { EnchantmentService } from './enchantment/service.js';
import { sameAddress } from './enchantment/ownership.js';
import { PostgresStore } from './persistence/postgres.js';
import { TonCenterNftProvider } from './ton/toncenterNftProvider.js';
import { TonCenterPublicKeyResolver } from './ton/toncenterPublicKey.js';

const env = loadEnv();
const app = Fastify({ logger: true, bodyLimit: 64 * 1024, trustProxy: true });
const store = new PostgresStore(env.DATABASE_URL);
const ownership = new TonCenterNftProvider({
  baseUrl: env.TONCENTER_BASE_URL,
  apiKey: env.TONCENTER_API_KEY,
});
const publicKeys = new TonCenterPublicKeyResolver({
  baseUrl: env.TONCENTER_BASE_URL,
  apiKey: env.TONCENTER_API_KEY,
});

const TonProofSchema = z.object({
  timestamp: z.number().int().positive(),
  domain: z.object({
    lengthBytes: z.number().int().nonnegative(),
    value: z.string().min(1),
  }),
  payload: z.string().uuid(),
  signature: z.string().min(32),
});

const VerifyWalletSchema = z.object({
  address: z.string().min(10),
  walletStateInit: z.string().min(10),
  proof: TonProofSchema,
});

const BindSchema = z.object({ request: EnchantmentRequestSchema });

function bearerToken(authorization: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return match?.[1]?.trim() || null;
}

await app.register(cors, { origin: env.APP_ORIGIN, credentials: false });
await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

app.get('/health', async () => ({ ok: true, service: 'ton-rings', version: '0.3.0' }));

app.get('/ready', async (_request, reply) => {
  const missing = [
    env.TONCENTER_API_KEY ? null : 'TONCENTER_API_KEY',
    env.PINATA_JWT ? null : 'PINATA_JWT',
    env.TON_DIAMONDS_COLLECTION.startsWith('REPLACE') ? 'TON_DIAMONDS_COLLECTION' : null,
    env.RING_COLLECTION_ADDRESS.startsWith('REPLACE') ? 'RING_COLLECTION_ADDRESS' : null,
  ].filter((value): value is string => Boolean(value));

  let database = true;
  try {
    await store.sql`SELECT 1`;
  } catch {
    database = false;
  }

  if (!database) missing.push('DATABASE');
  return reply.code(missing.length ? 503 : 200).send({
    ready: missing.length === 0,
    missing,
  });
});

app.post(
  '/api/auth/nonce',
  { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
  async () => store.issueNonce(300),
);

app.post(
  '/api/auth/verify',
  { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
  async (request, reply) => {
    const input = VerifyWalletSchema.parse(request.body);
    const walletAddress = Address.parse(input.address).toRawString();

    await verifyTonProof(
      {
        address: walletAddress,
        walletStateInit: input.walletStateInit,
        proof: input.proof as TonProof,
        expectedDomain: env.TON_PROOF_DOMAIN,
        expectedPayload: input.proof.payload,
      },
      address => publicKeys.resolve(address),
    );

    const nonceConsumed = await store.consumeNonce(input.proof.payload, walletAddress);
    if (!nonceConsumed) return reply.code(401).send({ error: 'invalid or reused nonce' });

    const token = randomBytes(32).toString('base64url');
    await store.createSession(walletAddress, token);
    return reply.code(200).send({ token, walletAddress, expiresIn: 86_400 });
  },
);

app.post(
  '/api/enchantments/bind',
  { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
  async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (!token) return reply.code(401).send({ error: 'missing bearer token' });

    const wallet = await store.sessionWallet(token);
    if (!wallet) return reply.code(401).send({ error: 'invalid session' });

    const body = BindSchema.parse(request.body);
    if (!sameAddress(wallet, body.request.ownerAddress)) {
      return reply.code(403).send({ error: 'session wallet does not match owner' });
    }

    const evidence = `session:${createHash('sha256').update(token).digest('hex')}`;
    const service = new EnchantmentService(
      ownership,
      {
        verify: async input =>
          sameAddress(input.ownerAddress, wallet) && input.signature === evidence,
      },
      store,
      env.RING_COLLECTION_ADDRESS,
      env.TON_DIAMONDS_COLLECTION,
    );

    const enchantment = await service.bind({ request: body.request, signature: evidence });
    return reply.code(201).send({ enchantment });
  },
);

app.get('/api/enchantments/ring/:address', async request => {
  const params = z.object({ address: z.string().min(10) }).parse(request.params);
  return { enchantment: await store.findActiveByRing(Address.parse(params.address).toRawString()) };
});

app.get('/api/enchantments/diamond/:address', async request => {
  const params = z.object({ address: z.string().min(10) }).parse(request.params);
  return { enchantment: await store.findActiveByDiamond(Address.parse(params.address).toRawString()) };
});

app.post('/api/enchantments/revoke', async (request, reply) => {
  const token = bearerToken(request.headers.authorization);
  if (!token) return reply.code(401).send({ error: 'missing bearer token' });
  const wallet = await store.sessionWallet(token);
  if (!wallet) return reply.code(401).send({ error: 'invalid session' });
  const body = z.object({ id: z.string().uuid() }).parse(request.body);
  const revoked = await store.revoke(body.id, wallet);
  return reply.code(revoked ? 200 : 404).send({ revoked });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  if (error instanceof z.ZodError) {
    void reply.code(400).send({ error: 'invalid request' });
    return;
  }

  const conflicts = new Set([
    'nonce already used',
    'ring already enchanted',
    'diamond already bound',
  ]);
  if (conflicts.has(error.message)) {
    void reply.code(409).send({ error: error.message });
    return;
  }

  const forbidden = new Set([
    'ring ownership verification failed',
    'diamond ownership verification failed',
    'signature verification failed',
  ]);
  if (forbidden.has(error.message)) {
    void reply.code(403).send({ error: error.message });
    return;
  }

  const authenticationErrors = new Set([
    'wrong domain',
    'wrong payload',
    'proof expired',
    'bad signature',
    'walletStateInit does not match address',
    'could not resolve wallet public key',
  ]);
  if (authenticationErrors.has(error.message)) {
    void reply.code(401).send({ error: 'wallet proof verification failed' });
    return;
  }

  void reply.code(500).send({ error: 'internal error' });
});

const shutdown = async () => {
  await app.close();
  await store.close();
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: env.HOST, port: env.PORT });
