import { Address } from '@ton/core';
import { TonCenterNftProvider } from '../src/ton/toncenterNftProvider.js';

interface Arguments {
  item?: string;
  collection?: string;
  recipient?: string;
  index: number;
}

function parseArguments(values: string[]): Arguments {
  const result: Arguments = { index: 0 };
  for (let offset = 0; offset < values.length; offset += 1) {
    const flag = values[offset];
    const value = values[offset + 1];
    if (!flag?.startsWith('--')) throw new Error(`Unexpected argument: ${String(flag)}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);

    switch (flag) {
      case '--item':
        result.item = value;
        break;
      case '--collection':
        result.collection = value;
        break;
      case '--recipient':
        result.recipient = value;
        break;
      case '--index':
        result.index = Number(value);
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
    offset += 1;
  }
  return result;
}

function raw(value: string): string {
  return Address.parse(value).toRawString();
}

const args = parseArguments(process.argv.slice(2));
if (!args.item) throw new Error('--item is required');
if (!args.collection) throw new Error('--collection is required');
if (!args.recipient) throw new Error('--recipient is required');
if (!Number.isSafeInteger(args.index) || args.index < 0) {
  throw new Error('--index must be a non-negative safe integer');
}

const provider = new TonCenterNftProvider({
  baseUrl: process.env.TONCENTER_BASE_URL ?? 'https://toncenter.com/api/v3',
  apiKey: process.env.TONCENTER_API_KEY,
});
const snapshot = await provider.getNft(args.item);
if (!snapshot) throw new Error('NFT item was not found or is not indexed yet');

const failures: string[] = [];
if (snapshot.address !== raw(args.item)) failures.push('item address mismatch');
if (snapshot.collectionAddress !== raw(args.collection)) failures.push('collection address mismatch');
if (snapshot.ownerAddress !== raw(args.recipient)) failures.push('owner address mismatch');
if (snapshot.index !== args.index) failures.push(`index mismatch: ${snapshot.index} != ${args.index}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('First NFT verification passed.');
  console.log(JSON.stringify(snapshot, null, 2));
}
