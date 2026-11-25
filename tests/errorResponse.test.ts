import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { classifyError, errorMessage } from '../src/http/errorResponse.js';

describe('HTTP error classification', () => {
  it('maps malformed and stale requests to 400', () => {
    for (const message of [
      'invalid TON address',
      'expiresAt must be later than issuedAt',
      'request issued in the future',
      'request expired',
      'request lifetime exceeds 15 minutes',
    ]) {
      expect(classifyError(new Error(message))).toEqual({
        statusCode: 400,
        body: { error: 'invalid request' },
      });
    }

    const result = z.object({ value: z.string() }).safeParse({ value: 12 });
    if (result.success) throw new Error('test setup failed');
    expect(classifyError(result.error).statusCode).toBe(400);
  });

  it('maps conflicts without hiding the actionable reason', () => {
    for (const message of [
      'nonce already used',
      'ring already enchanted',
      'diamond already bound',
    ]) {
      expect(classifyError(new Error(message))).toEqual({
        statusCode: 409,
        body: { error: message },
      });
    }
  });

  it('separates ownership failures from authentication failures', () => {
    expect(classifyError(new Error('ring ownership verification failed'))).toEqual({
      statusCode: 403,
      body: { error: 'ring ownership verification failed' },
    });
    expect(classifyError(new Error('bad signature'))).toEqual({
      statusCode: 401,
      body: { error: 'wallet proof verification failed' },
    });
  });

  it('maps TON Center and timeout failures to service unavailable', () => {
    expect(classifyError(new Error('TON Center NFT request failed with status 429'))).toEqual({
      statusCode: 503,
      body: { error: 'TON verification service unavailable' },
    });

    const timeout = new Error('operation timed out');
    timeout.name = 'AbortError';
    expect(classifyError(timeout)).toEqual({
      statusCode: 503,
      body: { error: 'upstream verification timed out' },
    });
  });

  it('does not expose unexpected internal errors', () => {
    expect(classifyError(new Error('database password leaked here'))).toEqual({
      statusCode: 500,
      body: { error: 'internal error' },
    });
    expect(errorMessage('plain failure')).toBe('plain failure');
  });
});
