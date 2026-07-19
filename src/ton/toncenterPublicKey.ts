import { Address } from '@ton/core';

interface TonCenterPublicKeyOptions {
  baseUrl?: string;
  apiKey?: string;
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

function stackNumber(entry: unknown): string | null {
  if (Array.isArray(entry) && entry.length >= 2 && entry[0] === 'num') {
    return typeof entry[1] === 'string' ? entry[1] : null;
  }
  if (entry && typeof entry === 'object') {
    const object = entry as Record<string, unknown>;
    if (object.type === 'num' && typeof object.value === 'string') return object.value;
  }
  return null;
}

function publicKeyBuffer(value: string): Buffer {
  const numeric = BigInt(value);
  if (numeric < 0n) throw new Error('TON Center returned a negative public key');
  const hex = numeric.toString(16).padStart(64, '0');
  if (hex.length !== 64) throw new Error('TON Center returned an invalid public key');
  return Buffer.from(hex, 'hex');
}

export class TonCenterPublicKeyResolver {
  private readonly origin: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TonCenterPublicKeyOptions = {}) {
    this.origin = new URL(options.baseUrl ?? 'https://toncenter.com').origin;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async resolve(address: string): Promise<Buffer | null> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const response = await this.fetchImpl(`${this.origin}/api/v2/runGetMethod`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        address: Address.parse(address).toRawString(),
        method: 'get_public_key',
        stack: [],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`TON Center public-key request failed with status ${response.status}`);
    }

    const body = (await response.json()) as RunMethodResponse;
    const result = body.result ?? body;
    const exitCode = result.exit_code;
    if (typeof exitCode === 'number' && exitCode !== 0) return null;

    const value = stackNumber(result.stack?.[0]);
    return value ? publicKeyBuffer(value) : null;
  }
}
