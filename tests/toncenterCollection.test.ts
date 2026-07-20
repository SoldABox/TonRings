import { describe, expect, it, vi } from 'vitest';
import { TonCenterCollectionReader } from '../src/ton/toncenterCollection.js';

const collection = `0:${'33'.repeat(32)}`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TonCenterCollectionReader', () => {
  it('reads next_item_index from tuple stack format', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      ok: true,
      result: { exit_code: 0, stack: [['num', '0x2a']] },
    }));
    const reader = new TonCenterCollectionReader({ fetchImpl: fetchImpl as typeof fetch });

    await expect(reader.getNextItemIndex(collection)).resolves.toBe(42n);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const init = call?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      address: collection,
      method: 'get_collection_data',
      stack: [],
    });
  });

  it('reads object stack format', async () => {
    const reader = new TonCenterCollectionReader({
      fetchImpl: (async () => jsonResponse({
        exit_code: 0,
        stack: [{ type: 'num', value: '7' }],
      })) as typeof fetch,
    });
    await expect(reader.getNextItemIndex(collection)).resolves.toBe(7n);
  });

  it('rejects non-sequential collections', async () => {
    const reader = new TonCenterCollectionReader({
      fetchImpl: (async () => jsonResponse({
        result: { exit_code: 0, stack: [['num', '-1']] },
      })) as typeof fetch,
    });
    await expect(reader.getNextItemIndex(collection)).rejects.toThrow(
      'Collection uses non-sequential NFT indexes',
    );
  });

  it('fails closed on upstream and contract errors', async () => {
    const unavailable = new TonCenterCollectionReader({
      fetchImpl: (async () => jsonResponse({}, 429)) as typeof fetch,
    });
    await expect(unavailable.getNextItemIndex(collection)).rejects.toThrow('status 429');

    const failedGetter = new TonCenterCollectionReader({
      fetchImpl: (async () => jsonResponse({
        result: { exit_code: 9, stack: [] },
      })) as typeof fetch,
    });
    await expect(failedGetter.getNextItemIndex(collection)).rejects.toThrow('exit code 9');
  });
});
