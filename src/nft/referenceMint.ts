import { Address, beginCell, toNano, type Cell } from '@ton/core';

const UINT64_MAX = (1n << 64n) - 1n;

export interface ReferenceMintInput {
  collectionAddress: string;
  recipientAddress: string;
  itemIndex: bigint;
  itemContent: string;
  queryId?: bigint;
  itemBalanceTon?: string;
  transactionAmountTon?: string;
  validUntil?: number;
  network?: '-3' | '-239';
}

export interface TonConnectMintTransaction {
  validUntil: number;
  network: '-3' | '-239';
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
  }>;
}

function assertUint64(value: bigint, field: string): void {
  if (value < 0n || value > UINT64_MAX) {
    throw new Error(`${field} must fit uint64`);
  }
}

function assertItemContent(value: string): void {
  if (value.length < 1 || value.length > 512) {
    throw new Error('itemContent must contain 1-512 characters');
  }
  if (value.includes('\0') || /[\r\n]/.test(value)) {
    throw new Error('itemContent contains unsupported control characters');
  }
}

function assertAmounts(itemBalance: bigint, transactionAmount: bigint): void {
  if (itemBalance <= 0n) throw new Error('item balance must be positive');
  if (transactionAmount <= itemBalance) {
    throw new Error('transaction amount must exceed item balance to cover fees');
  }
}

export function buildReferenceMintBody(input: ReferenceMintInput): Cell {
  const recipient = Address.parse(input.recipientAddress);
  const queryId = input.queryId ?? 0n;
  const itemBalance = toNano(input.itemBalanceTon ?? '0.005');
  const transactionAmount = toNano(input.transactionAmountTon ?? '0.02');

  Address.parse(input.collectionAddress);
  assertUint64(queryId, 'queryId');
  assertUint64(input.itemIndex, 'itemIndex');
  assertItemContent(input.itemContent);
  assertAmounts(itemBalance, transactionAmount);

  const content = beginCell().storeStringTail(input.itemContent).endCell();
  const initParams = beginCell()
    .storeAddress(recipient)
    .storeRef(content)
    .endCell();

  return beginCell()
    .storeUint(1, 32)
    .storeUint(queryId, 64)
    .storeUint(input.itemIndex, 64)
    .storeCoins(itemBalance)
    .storeRef(initParams)
    .endCell();
}

export function buildTonConnectMintTransaction(
  input: ReferenceMintInput,
  nowSeconds = Math.floor(Date.now() / 1000),
): TonConnectMintTransaction {
  const collection = Address.parse(input.collectionAddress);
  const body = buildReferenceMintBody(input);
  const transactionAmount = toNano(input.transactionAmountTon ?? '0.02');
  const validUntil = input.validUntil ?? nowSeconds + 600;

  if (!Number.isSafeInteger(validUntil) || validUntil <= nowSeconds) {
    throw new Error('validUntil must be a future Unix timestamp');
  }
  if (validUntil > nowSeconds + 3600) {
    throw new Error('validUntil cannot exceed one hour');
  }

  return {
    validUntil,
    network: input.network ?? '-3',
    messages: [
      {
        address: collection.toString({ bounceable: true, urlSafe: true }),
        amount: transactionAmount.toString(),
        payload: body.toBoc().toString('base64'),
      },
    ],
  };
}
