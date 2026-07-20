import { z } from 'zod';

export interface ErrorResponse {
  statusCode: number;
  body: { error: string };
}

const clientRequestErrors = new Set([
  'invalid TON address',
  'expiresAt must be later than issuedAt',
  'request issued in the future',
  'request expired',
  'request lifetime exceeds 15 minutes',
]);

const conflicts = new Set([
  'nonce already used',
  'ring already enchanted',
  'diamond already bound',
]);

const forbidden = new Set([
  'ring ownership verification failed',
  'diamond ownership verification failed',
  'signature verification failed',
]);

const authenticationErrors = new Set([
  'wrong domain',
  'wrong payload',
  'proof expired',
  'bad signature',
  'domain length mismatch',
  'invalid signature length',
  'walletStateInit does not match address',
  'could not resolve wallet public key',
]);

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyError(error: unknown): ErrorResponse {
  const message = errorMessage(error);

  if (error instanceof z.ZodError || clientRequestErrors.has(message)) {
    return { statusCode: 400, body: { error: 'invalid request' } };
  }
  if (conflicts.has(message)) {
    return { statusCode: 409, body: { error: message } };
  }
  if (forbidden.has(message)) {
    return { statusCode: 403, body: { error: message } };
  }
  if (authenticationErrors.has(message)) {
    return { statusCode: 401, body: { error: 'wallet proof verification failed' } };
  }
  if (message.startsWith('TON Center') || message.includes('fetch failed')) {
    return { statusCode: 503, body: { error: 'TON verification service unavailable' } };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { statusCode: 503, body: { error: 'upstream verification timed out' } };
  }
  return { statusCode: 500, body: { error: 'internal error' } };
}
