import { Address } from '@ton/core';
import type { NftOwnershipProvider, NftSnapshot } from '../enchantment/ownership.js';

interface TonCenterNftItem {
  address: string;
  index: string;
  owner_address: string;
  collection_address: string;
}

interface TonCenterNftResponse {
  nft_items?: TonCenterNftItem[];
}

export interface TonCenterNftProviderOptions {
  baseUrl?: string;
  apiKey?: string | undefined;
  fetchImpl?: typeof fetch;
}

function normalizeAddress(value: string): string {
  return Address.parse(value).toRawString();
}

export class TonCenterNftProvider implements NftOwnershipProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TonCenterNftProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://toncenter.com/api/v3').replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getNft(address: string): Promise<NftSnapshot | null> {
    const parsedAddress = Address.parse(address);
    const url = new URL(`${this.baseUrl}/nft/items`);
    url.searchParams.set('address', parsedAddress.toRawString());
    url.searchParams.set('limit', '1');

    const requestInit: RequestInit = {
      signal: AbortSignal.timeout(10_000),
    };
    if (this.apiKey) {
      requestInit.headers = { 'X-API-Key': this.apiKey };
    }

    const response = await this.fetchImpl(url, requestInit);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`TON Center request failed with status ${response.status}`);
    }

    const body = (await response.json()) as TonCenterNftResponse;
    const item = body.nft_items?.[0];
    if (!item) return null;

    const index = Number(item.index);
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error('TON Center returned an invalid NFT index');
    }

    return {
      address: normalizeAddress(item.address),
      index,
      ownerAddress: normalizeAddress(item.owner_address),
      collectionAddress: normalizeAddress(item.collection_address),
    };
  }
}
