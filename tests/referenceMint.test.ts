import { describe, expect, it } from 'vitest';
import { Address, Cell, toNano } from '@ton/core';
import {
  buildReferenceMintBody,
  buildTonConnectMintTransaction,
} from '../src/nft/referenceMint.js';

const collection = `0:${'11'.repeat(32)}`;
const recipient = `0:${'22'.repeat(32)}`;

describe('reference NFT mint payload', () => {
  it('matches the reference collection op=1 message layout', () => {
    const body = buildReferenceMintBody({
      collectionAddress: collection,
      recipientAddress: recipient,
      itemIndex: 0n,
      itemContent: '0.json',
    });
    const slice = body.beginParse();

    expect(slice.loadUint(32)).toBe(1);
    expect(slice.loadUintBig(64)).toBe(0n);
    expect(slice.loadUintBig(64)).toBe(0n);
    expect(slice.loadCoins()).toBe(toNano('0.005'));

    const init = slice.loadRef().beginParse();
    expect(init.loadAddress().toRawString()).toBe(Address.parse(recipient).toRawString());
    const content = init.loadRef().beginParse().loadStringTail();
    expect(content).toBe('0.json');
    expect(slice.remainingBits).toBe(0);
    expect(slice.remainingRefs).toBe(0);
  });

  it('creates an unsigned testnet TonConnect request by default', () => {
    const transaction = buildTonConnectMintTransaction(
      {
        collectionAddress: collection,
        recipientAddress: recipient,
        itemIndex: 7n,
        itemContent: '7.json',
      },
      1_800_000_000,
    );

    expect(transaction.network).toBe('-3');
    expect(transaction.validUntil).toBe(1_800_000_600);
    expect(transaction.messages).toHaveLength(1);
    expect(transaction.messages[0]?.amount).toBe(toNano('0.02').toString());

    const payload = transaction.messages[0]?.payload;
    expect(payload).toBeTruthy();
    const body = Cell.fromBase64(payload!);
    const slice = body.beginParse();
    expect(slice.loadUint(32)).toBe(1);
    slice.loadUintBig(64);
    expect(slice.loadUintBig(64)).toBe(7n);
  });

  it('rejects unsafe values before a wallet sees the transaction', () => {
    expect(() =>
      buildReferenceMintBody({
        collectionAddress: collection,
        recipientAddress: recipient,
        itemIndex: -1n,
        itemContent: '0.json',
      }),
    ).toThrow('itemIndex must fit uint64');

    expect(() =>
      buildReferenceMintBody({
        collectionAddress: collection,
        recipientAddress: recipient,
        itemIndex: 0n,
        itemContent: '0.json',
        itemBalanceTon: '0.02',
        transactionAmountTon: '0.01',
      }),
    ).toThrow('transaction amount must exceed item balance');

    expect(() =>
      buildTonConnectMintTransaction(
        {
          collectionAddress: collection,
          recipientAddress: recipient,
          itemIndex: 0n,
          itemContent: '0.json',
          validUntil: 1_800_004_000,
        },
        1_800_000_000,
      ),
    ).toThrow('validUntil cannot exceed one hour');
  });
});
