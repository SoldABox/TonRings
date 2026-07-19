import { describe, expect, it, vi } from 'vitest';
import { Address } from '@ton/core';
import { TonCenterNftProvider } from '../src/ton/toncenterNftProvider.js';

const item = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
const owner = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
const collection = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

describe('TonCenterNftProvider', () => {
  it('normalizes and returns NFT ownership data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      nft_items: [{
        address: item.toString(),
        index: '15',
        owner_address: owner.toString(),
        collection_address: collection.toString(),
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const provider = new TonCenterNftProvider({ fetchImpl });
    await expect(provider.getNft(item.toString())).resolves.toEqual({
      address: item.toRawString(),
      index: 15,
      ownerAddress: owner.toRawString(),
      collectionAddress: collection.toRawString(),
    });
  });

  it('returns null when the NFT is not indexed', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ nft_items: [] }), { status: 200 }));
    const provider = new TonCenterNftProvider({ fetchImpl });
    await expect(provider.getNft(item.toString())).resolves.toBeNull();
  });

  it('fails closed on upstream errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 429 }));
    const provider = new TonCenterNftProvider({ fetchImpl });
    await expect(provider.getNft(item.toString())).rejects.toThrow('status 429');
  });
});
