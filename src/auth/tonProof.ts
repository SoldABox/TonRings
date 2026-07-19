import { createHash, timingSafeEqual } from 'node:crypto';
import { Address, Cell, contractAddress, loadStateInit } from '@ton/core';
import nacl from 'tweetnacl';

export interface TonProof {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  payload: string;
  signature: string;
}

export interface VerifyTonProofInput {
  address: string;
  walletStateInit: string;
  proof: TonProof;
  expectedDomain: string;
  expectedPayload: string;
  now?: number;
  maxAgeSeconds?: number;
}

export type WalletPublicKeyResolver = (address: string) => Promise<Buffer | null>;

function sha256(data: Uint8Array): Buffer {
  return createHash('sha256').update(data).digest();
}

function int32Be(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeInt32BE(value);
  return out;
}

function uint32Le(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32LE(value);
  return out;
}

function uint64Le(value: number): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

function equalText(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildTonProofDigest(address: Address, proof: TonProof): Buffer {
  const domain = Buffer.from(proof.domain.value, 'utf8');
  if (proof.domain.lengthBytes !== domain.length) throw new Error('domain length mismatch');

  const message = Buffer.concat([
    Buffer.from('ton-proof-item-v2/', 'utf8'),
    int32Be(address.workChain),
    address.hash,
    uint32Le(domain.length),
    domain,
    uint64Le(proof.timestamp),
    Buffer.from(proof.payload, 'utf8'),
  ]);

  const inner = sha256(message);
  return sha256(Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from('ton-connect'), inner]));
}

export async function verifyTonProof(
  input: VerifyTonProofInput,
  resolvePublicKey: WalletPublicKeyResolver,
): Promise<boolean> {
  const maxAge = input.maxAgeSeconds ?? 15 * 60;
  const now = input.now ?? Math.floor(Date.now() / 1000);

  if (!equalText(input.proof.domain.value, input.expectedDomain)) throw new Error('wrong domain');
  if (!equalText(input.proof.payload, input.expectedPayload)) throw new Error('wrong payload');
  if (Math.abs(now - input.proof.timestamp) > maxAge) throw new Error('proof expired');

  const wantedAddress = Address.parse(input.address);
  const stateInit = loadStateInit(Cell.fromBase64(input.walletStateInit).beginParse());
  const derivedAddress = contractAddress(wantedAddress.workChain, stateInit);
  if (!derivedAddress.equals(wantedAddress)) throw new Error('walletStateInit does not match address');

  const publicKey = await resolvePublicKey(wantedAddress.toRawString());
  if (!publicKey || publicKey.length !== 32) throw new Error('could not resolve wallet public key');

  const signature = Buffer.from(input.proof.signature, 'base64');
  if (signature.length !== 64) throw new Error('invalid signature length');

  const digest = buildTonProofDigest(wantedAddress, input.proof);
  if (!nacl.sign.detached.verify(digest, signature, publicKey)) throw new Error('bad signature');
  return true;
}
