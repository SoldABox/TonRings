import { z } from 'zod';

export const TON_DIAMONDS_COLLECTION =
  'EQAG2BH0JlmFkbMrLEnyn2bIITaOSssd4WdisE4BdFMkZbir' as const;

export const EnchantmentRequestSchema = z.object({
  ringAddress: z.string().min(10),
  ringIndex: z.number().int().nonnegative(),
  diamondAddress: z.string().min(10),
  diamondIndex: z.number().int().nonnegative(),
  ownerAddress: z.string().min(10),
  nonce: z.string().uuid(),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type EnchantmentRequest = z.infer<typeof EnchantmentRequestSchema>;

export const EnchantmentRecordSchema = EnchantmentRequestSchema.extend({
  id: z.string().uuid(),
  collectionAddress: z.literal(TON_DIAMONDS_COLLECTION),
  signature: z.string().min(32),
  createdAt: z.string().datetime(),
  status: z.enum(['active', 'revoked']),
});

export type EnchantmentRecord = z.infer<typeof EnchantmentRecordSchema>;
