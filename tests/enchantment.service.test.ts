import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  EnchantmentService,
  type CreateEnchantmentResult,
} from '../src/enchantment/service.js';
import { TON_DIAMONDS_COLLECTION, type EnchantmentRecord } from '../src/enchantment/schema.js';
import type { NftOwnershipProvider, NftSnapshot } from '../src/enchantment/ownership.js';

const owner = `0:${'11'.repeat(32)}`;
const ring = `0:${'22'.repeat(32)}`;
const diamond = `0:${'33'.repeat(32)}`;
const ringCollection = `0:${'44'.repeat(32)}`;
const otherOwner = `0:${'55'.repeat(32)}`;

function request() {
  const now = Math.floor(Date.now() / 1000);
  return {
    ringAddress: ring,
    ringIndex: 1,
    diamondAddress: diamond,
    diamondIndex: 42,
    ownerAddress: owner,
    nonce: randomUUID(),
    issuedAt: now,
    expiresAt: now + 600,
  };
}

class Ownership implements NftOwnershipProvider {
  constructor(private readonly nfts: NftSnapshot[]) {}

  async getNft(address: string) {
    return this.nfts.find((nft) => nft.address === address) ?? null;
  }
}

class Repository {
  records: EnchantmentRecord[] = [];

  async create(record: EnchantmentRecord): Promise<CreateEnchantmentResult> {
    if (this.records.some((stored) => stored.nonce === record.nonce)) return 'nonce_exists';
    if (
      this.records.some(
        (stored) => stored.ringAddress === record.ringAddress && stored.status === 'active',
      )
    ) return 'ring_exists';
    if (
      this.records.some(
        (stored) =>
          stored.diamondAddress === record.diamondAddress && stored.status === 'active',
      )
    ) return 'diamond_exists';

    this.records.push(record);
    return 'created';
  }
}

class ConflictRepository {
  constructor(private readonly result: Exclude<CreateEnchantmentResult, 'created'>) {}

  async create(): Promise<CreateEnchantmentResult> {
    return this.result;
  }
}

function ownership(ownerAddress = owner) {
  return new Ownership([
    { address: ring, index: 1, ownerAddress, collectionAddress: ringCollection },
    {
      address: diamond,
      index: 42,
      ownerAddress,
      collectionAddress: TON_DIAMONDS_COLLECTION,
    },
  ]);
}

function service(repository: Repository | ConflictRepository, ownerAddress = owner) {
  return new EnchantmentService(
    ownership(ownerAddress),
    { verify: async () => true },
    repository,
    ringCollection,
  );
}

describe('EnchantmentService', () => {
  it('binds a verified ring and TON Diamond', async () => {
    const repository = new Repository();
    const result = await service(repository).bind({
      request: request(),
      signature: 'x'.repeat(64),
    });

    expect(result.status).toBe('active');
    expect(result.collectionAddress).toBe(TON_DIAMONDS_COLLECTION);
    expect(repository.records).toHaveLength(1);
  });

  it('rejects invalid signatures', async () => {
    const instance = new EnchantmentService(
      ownership(),
      { verify: async () => false },
      new Repository(),
      ringCollection,
    );

    await expect(
      instance.bind({ request: request(), signature: 'x'.repeat(64) }),
    ).rejects.toThrow('signature verification failed');
  });

  it('rejects when wallet does not own both NFTs', async () => {
    await expect(
      service(new Repository(), otherOwner).bind({
        request: request(),
        signature: 'x'.repeat(64),
      }),
    ).rejects.toThrow('ring ownership verification failed');
  });

  it('prevents replaying the same nonce atomically', async () => {
    const repository = new Repository();
    const instance = service(repository);
    const input = { request: request(), signature: 'x'.repeat(64) };

    await instance.bind(input);

    await expect(instance.bind(input)).rejects.toThrow('nonce already used');
  });

  it.each([
    ['ring_exists', 'ring already enchanted'],
    ['diamond_exists', 'diamond already bound'],
  ] as const)('maps %s to a stable domain error', async (result, expectedError) => {
    await expect(
      service(new ConflictRepository(result)).bind({
        request: request(),
        signature: 'x'.repeat(64),
      }),
    ).rejects.toThrow(expectedError);
  });
});