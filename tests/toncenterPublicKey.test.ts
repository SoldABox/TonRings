import { describe, expect, it, vi } from 'vitest';
import { TonCenterPublicKeyResolver } from '../src/ton/toncenterPublicKey.js';

const wallet = `0:${'11'.repeat(32)}`;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TonCenterPublicKeyResolver', () => {
  it('parses a v2 get_public_key result and preserves leading zeroes', async () => {
    const fetchImpl = vi.fn(async () =>
      response({
        ok: true,
        result: {
          exit_code: 0,
          stack: [['num', '0x1234']],
        },
      }),
    );
    const resolver = new TonCenterPublicKeyResolver({
      baseUrl: 'https://toncenter.example/api/v3',
      apiKey: 'test-key',
      fetchImpl,
    });

    const key = await resolver.resolve(wallet);
    expect(key).toHaveLength(32);
    expect(key?.subarray(30).toString('hex')).toBe('1234');
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://toncenter.example/api/v2/runGetMethod');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['X-API-Key']).toBe('test-key');
  });

  it('returns null when the wallet getter exits unsuccessfully', async () => {
    const resolver = new TonCenterPublicKeyResolver({
      fetchImpl: vi.fn(async () =>
        response({ ok: true, result: { exit_code: 11, stack: [] } }),
      ),
    });

    await expect(resolver.resolve(wallet)).resolves.toBeNull();
  });

  it('fails closed on upstream errors', async () => {
    const resolver = new TonCenterPublicKeyResolver({
      fetchImpl: vi.fn(async () => response({ error: 'rate limited' }, 429)),
    });

    await expect(resolver.resolve(wallet)).rejects.toThrow('status 429');
  });
});
