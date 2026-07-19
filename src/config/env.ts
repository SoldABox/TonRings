import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url(),
  TON_PROOF_DOMAIN: z.string().min(1),
  TONCENTER_BASE_URL: z.string().url().default('https://toncenter.com/api/v3'),
  TONCENTER_API_KEY: z.string().optional(),
  TON_DIAMONDS_COLLECTION: z.string().min(10),
  RING_COLLECTION_ADDRESS: z.string().min(10),
  DATABASE_URL: z.string().url(),
  PINATA_JWT: z.string().optional(),
  IPFS_GATEWAY: z.string().url().default('https://ipfs.io/ipfs/'),
  COLLECTION_SIZE: z.coerce.number().int().min(1).max(10000).default(256),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return EnvSchema.parse(source);
}
