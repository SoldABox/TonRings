import type { EnchantmentRequest } from './schema.js';

export function buildEnchantmentMessage(request: EnchantmentRequest): string {
  return [
    'Golden Legacy Rings Enchantment',
    `Ring: ${request.ringAddress}#${request.ringIndex}`,
    `Diamond: ${request.diamondAddress}#${request.diamondIndex}`,
    `Owner: ${request.ownerAddress}`,
    `Nonce: ${request.nonce}`,
    `Issued: ${request.issuedAt}`,
    `Expires: ${request.expiresAt}`,
  ].join('\n');
}

export function assertFreshRequest(
  request: EnchantmentRequest,
  nowSeconds = Math.floor(Date.now() / 1000),
): void {
  if (request.expiresAt <= request.issuedAt) {
    throw new Error('expiresAt must be later than issuedAt');
  }
  if (request.issuedAt > nowSeconds + 60) {
    throw new Error('request issued in the future');
  }
  if (request.expiresAt < nowSeconds) {
    throw new Error('request expired');
  }
  if (request.expiresAt - request.issuedAt > 900) {
    throw new Error('request lifetime exceeds 15 minutes');
  }
}
