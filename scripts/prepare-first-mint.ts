import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Address } from '@ton/core';
import { buildTonConnectMintTransaction } from '../src/nft/referenceMint.js';

interface Arguments {
  collection?: string;
  recipient?: string;
  index: number;
  metadataBase?: string;
  network: 'testnet' | 'mainnet';
  confirmMainnet?: string;
}

function parseArguments(values: string[]): Arguments {
  const result: Arguments = { index: 0, network: 'testnet' };
  for (let offset = 0; offset < values.length; offset += 1) {
    const flag = values[offset];
    const value = values[offset + 1];
    if (!flag?.startsWith('--')) throw new Error(`Unexpected argument: ${String(flag)}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);

    switch (flag) {
      case '--collection':
        result.collection = value;
        break;
      case '--recipient':
        result.recipient = value;
        break;
      case '--index':
        result.index = Number(value);
        break;
      case '--metadata-base':
        result.metadataBase = value;
        break;
      case '--network':
        if (value !== 'testnet' && value !== 'mainnet') {
          throw new Error('--network must be testnet or mainnet');
        }
        result.network = value;
        break;
      case '--confirm-mainnet':
        result.confirmMainnet = value;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
    offset += 1;
  }
  return result;
}

async function metadataBaseFromIpfs(): Promise<string | undefined> {
  try {
    const value = JSON.parse(await readFile('generated/ipfs.json', 'utf8')) as {
      metadataBase?: unknown;
    };
    return typeof value.metadataBase === 'string' ? value.metadataBase : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

const args = parseArguments(process.argv.slice(2));
if (!args.collection) throw new Error('--collection is required');
if (!args.recipient) throw new Error('--recipient is required');
if (!Number.isSafeInteger(args.index) || args.index < 0) {
  throw new Error('--index must be a non-negative safe integer');
}
if (args.network === 'mainnet' && args.confirmMainnet !== 'I_UNDERSTAND') {
  throw new Error('Mainnet preparation requires --confirm-mainnet I_UNDERSTAND');
}

Address.parse(args.collection);
Address.parse(args.recipient);
await access(`generated/metadata/${args.index}.json`, constants.R_OK);

const metadataBase = args.metadataBase ?? (await metadataBaseFromIpfs());
if (!metadataBase?.startsWith('ipfs://') || !metadataBase.endsWith('/')) {
  throw new Error('A final ipfs:// metadata base ending in / is required');
}

const metadataBody = await readFile(`generated/metadata/${args.index}.json`, 'utf8');
if (metadataBody.includes('REPLACE_IMAGE_CID')) {
  throw new Error('Metadata still contains an unresolved image CID');
}

const transaction = buildTonConnectMintTransaction({
  collectionAddress: args.collection,
  recipientAddress: args.recipient,
  itemIndex: BigInt(args.index),
  itemContent: `${args.index}.json`,
  network: args.network === 'mainnet' ? '-239' : '-3',
});

const output = {
  warning: 'Unsigned transaction. Review collection, recipient, network, value and payload in the wallet before approval.',
  assumptions: [
    'The collection contract follows the TON reference single-item mint layout with op=1.',
    'The connected wallet is the collection owner.',
    `The collection common content prefix is ${metadataBase}`,
  ],
  item: {
    index: args.index,
    recipient: Address.parse(args.recipient).toString({ bounceable: false, urlSafe: true }),
    metadata: `${metadataBase}${args.index}.json`,
  },
  transaction,
};

await writeFile('generated/first-mint-tonconnect.json', JSON.stringify(output, null, 2));
console.log('Prepared generated/first-mint-tonconnect.json');
console.log(`Network: ${args.network}`);
console.log(`NFT index: ${args.index}`);
console.log('No private key or seed phrase was read or stored.');
