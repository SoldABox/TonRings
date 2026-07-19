import { describe, expect, it } from 'vitest';
import { beginCell, contractAddress, storeStateInit } from '@ton/core';
import nacl from 'tweetnacl';
import { buildTonProofDigest, verifyTonProof, type TonProof } from '../src/auth/tonProof.js';

function fixture() {
  const stateInit = { code: beginCell().storeUint(1, 1).endCell(), data: beginCell().storeUint(0, 1).endCell() };
  const stateInitCell = beginCell().store(storeStateInit(stateInit)).endCell();
  const address = contractAddress(0, stateInit);
  const keys = nacl.sign.keyPair();
  const timestamp = 1_750_000_000;
  const proof: TonProof = {
    timestamp,
    domain: { lengthBytes: Buffer.byteLength('rings.example'), value: 'rings.example' },
    payload: 'single-use-nonce',
    signature: '',
  };
  proof.signature = Buffer.from(nacl.sign.detached(buildTonProofDigest(address, proof), keys.secretKey)).toString('base64');
  return { address, keys, proof, stateInitCell, timestamp };
}

describe('verifyTonProof', () => {
  it('accepts an address-bound, current, correctly signed proof', async () => {
    const { address, keys, proof, stateInitCell, timestamp } = fixture();
    await expect(verifyTonProof({
      address: address.toString(),
      walletStateInit: stateInitCell.toBoc().toString('base64'),
      proof,
      expectedDomain: 'rings.example',
      expectedPayload: 'single-use-nonce',
      now: timestamp,
    }, async () => Buffer.from(keys.publicKey))).resolves.toBe(true);
  });

  it('rejects a reused or substituted nonce', async () => {
    const { address, keys, proof, stateInitCell, timestamp } = fixture();
    await expect(verifyTonProof({
      address: address.toString(),
      walletStateInit: stateInitCell.toBoc().toString('base64'),
      proof,
      expectedDomain: 'rings.example',
      expectedPayload: 'different-nonce',
      now: timestamp,
    }, async () => Buffer.from(keys.publicKey))).rejects.toThrow('wrong payload');
  });

  it('rejects expired proofs', async () => {
    const { address, keys, proof, stateInitCell, timestamp } = fixture();
    await expect(verifyTonProof({
      address: address.toString(),
      walletStateInit: stateInitCell.toBoc().toString('base64'),
      proof,
      expectedDomain: 'rings.example',
      expectedPayload: 'single-use-nonce',
      now: timestamp + 901,
    }, async () => Buffer.from(keys.publicKey))).rejects.toThrow('proof expired');
  });
});
