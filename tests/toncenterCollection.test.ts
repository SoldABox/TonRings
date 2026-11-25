import { describe, expect, it } from 'vitest';
import { TonCenterCollectionReader } from '../src/ton/toncenterCollection.js';

const collection = `0:${'33'.repeat(32)}`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function staticFetch(response: Response): typeof fetch {
  return async (_input: RequestInfo | URL, _init?: RequestInit) => response;
}

describe('TonCenterCollectionReader', () => {
  it('reads next_item_index from tuple stack format', async () => {
    let capturedBody: BodyInit | null | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      capturedBody = init?.body;
      return jsonResponse({
        ok: true,
        result: { exit_code: 0, stack: [['num', '0x2a']] },
      });
    };
    const reader = new TonCenterCollectionReader({ fetchImpl });

    await expect(reader.getNextItemIndex(collection)).resolves.toBe(42n);
    const requestBody: unknown = JSON.parse(String(capturedBody));
    expect(requestBody).toMatchObject({
      address: collection,
      method: 'get_collection_data',
      stack: [],
    });
  });

  it('reads object stack format', async () => {
    const reader = new TonCenterCollectionReader({
      fetchImpl: staticFetch(jsonResponse({
        exit_code: 0,
        stack: [{ type: 'num', value: '7' }],
      })),
    });
    await expect(reader.getNextItemIndex(collection)).resolves.toBe(7n);
  });

  it('rejects non-sequential collections', async () => {
    const reader = new TonCenterCollectionReader({
      fetchImpl: staticFetch(jsonResponse({
        result: { exit_code: 0, stack: [['num', '-1']] },
      })),
    });
    await expect(reader.getNextItemIndex(collection)).rejects.toThrow(
      'Collection uses non-sequential NFT indexes',
    );
  });

  it('fails closed on upstream and contract errors', async () => {
    const unavailable = new TonCenterCollectionReader({
      fetchImpl: staticFetch(jsonResponse({}, 429)),
    });
    await expect(unavailable.getNextItemIndex(collection)).rejects.toThrow('status 429');

    const failedGetter = new TonCenterCollectionReader({
      fetchImpl: staticFetch(jsonResponse({
        result: { exit_code: 9, stack: [] },
      })),
    });
    await expect(failedGetter.getNextItemIndex(collection)).rejects.toThrow('exit code 9');
  });
});
