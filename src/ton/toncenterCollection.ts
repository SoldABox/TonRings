import { Address } from '@ton/core';

interface TonCenterCollectionOptions {
  baseUrl?: string;
  apiKey?: string | undefined;
  fetchImpl?: typeof fetch;
}

interface RunMethodResponse {
  ok?: boolean;
  result?: {
    exit_code?: number;
    stack?: unknown[];
  };
  exit_code?: number;
  stack?: unknown[];
}

function stackNumber(entry: unknown): bigint | null {
  if (Array.isArray(entry) && entry.length >= 2 && entry[0] === 'num') {
    const value = entry[1];
    if (typeof value === 'string') return BigInt(value);
  }
  if (entry && typeof entry === 'object') {
    const object = entry as Record<string, unknown>;
    if (object.type === 'num' && typeof object.value === 'string') {
      return BigInt(object.value);
    }
  }
  return null;
}

export class TonCenterCollectionReader {
  private readonly origin: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TonCenterCollectionOptions = {}) {
    this.origin = new URL(options.baseUrl ?? 'https://toncenter.com').origin;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getNextItemIndex(collectionAddress: string): Promise<bigint> {
    const address = Address.parse(collectionAddress).toRawString();
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const response = await this.fetchImpl(`${this.origin}/api/v2/runGetMethod`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        address,
        method: 'get_collection_data',
        stack: [],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`TON Center collection request failed with status ${response.status}`);
    }

    const body = (await response.json()) as RunMethodResponse;
    const result = body.result ?? body;
    if (typeof result.exit_code === 'number' && result.exit_code !== 0) {
      throw new Error(`get_collection_data failed with exit code ${result.exit_code}`);
    }

    const nextIndex = stackNumber(result.stack?.[0]);
    if (nextIndex === null) throw new Error('TON Center returned no collection next index');
    if (nextIndex < 0n) throw new Error('Collection uses non-sequential NFT indexes');
    if (nextIndex > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Collection next index exceeds supported safe integer range');
    }
    return nextIndex;
  }
}
