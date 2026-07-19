import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EnchantmentService } from '../src/enchantment/service.js';
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

  async hasNonce(nonce: string) {
    return this.records.some((record) => record.nonce === nonce);
  }

  async hasActiveRingBinding(address: string) {
    return this.records.some(
      (record) => record.ringAddress === address && record.status === 'active',
    );
  }

  async hasActiveDiamondBinding(address: string) {
    return this.records.some(
      (record) => record.diamondAddress === address && record.status === 'active',
    );
  }

  async save(record: EnchantmentRecord) {
    this.records.push(record);
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

describe('EnchantmentService', () => {
  it('binds a verified ring and TON Diamond', async () => {
    const repository = new Repository();
    const service = new EnchantmentService(
      ownership(),
      { verify: async () => true },
      repository,
      ringCollection,
    );

    const result = await service.bind({ request: request(), signature: 'x'.repeat(64) });

    expect(result.status).toBe('active');
    expect(result.collectionAddress).toBe(TON_DIAMONDS_COLLECTION);
    expect(repository.records).toHaveLength(1);
  });

  it('rejects invalid signatures', async () => {
    const service = new EnchantmentService(
      ownership(),
      { verify: async () => false },
      new Repository(),
      ringCollection,
    );

    await expect(
      service.bind({ request: request(), signature: 'x'.repeat(64) }),
    ).rejects.toThrow('signature verification failed');
  });

  it('rejects when wallet does not own both NFTs', async () => {
    const service = new EnchantmentService(
      ownership(otherOwner),
      { verify: async () => true },
      new Repository(),
      ringCollection,
    );

    await expect(
      service.bind({ request: request(), signature: 'x'.repeat(64) }),
    ).rejects.toThrow('ring ownership verification failed');
  });

  it('prevents replaying the same nonce', async () => {
    const repository = new Repository();
    const service = new EnchantmentService(
      ownership(),
      { verify: async () => true },
      repository,
      ringCollection,
    );
    const input = { request: request(), signature: 'x'.repeat(64) };

    await service.bind(input);

    await expect(service.bind(input)).rejects.toThrow('nonce already used');
  });

  it('rejects a ring that is already enchanted', async () => {
    const repository = new Repository();
    const service = new EnchantmentService(
      ownership(),
      { verify: async () => true },
      repository,
      ringCollection,
    );

    await service.bind({ request: request(), signature: 'x'.repeat(64) });
    const second = request();
    second.diamondAddress = `0:${'66'.repeat(32)}`;

    await expect(
      service.bind({ request: second, signature: 'x'.repeat(64) }),
    ).rejects.toThrow('ring already enchanted');
  });

  it('rejects a Diamond that is already bound', async () => {
    const repository = new Repository();
    const service = new EnchantmentService(
      ownership(),
      { verify: async () => true },
      repository,
      ringCollection,
    );

    await service.bind({ request: request(), signature: 'x'.repeat(64) });
    const second = request();
    second.ringAddress = `0:${'77'.repeat(32)}`;

    await expect(
      service.bind({ request: second, signature: 'x'.repeat(64) }),
    ).rejects.toThrow('diamond already bound');
  });
});