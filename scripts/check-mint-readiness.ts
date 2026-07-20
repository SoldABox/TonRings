import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Address } from '@ton/core';
import { TonCenterCollectionReader } from '../src/ton/toncenterCollection.js';

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

async function readable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function validAddress(value: string | undefined): boolean {
  if (!value || value.includes('REPLACE')) return false;
  try {
    Address.parse(value);
    return true;
  } catch {
    return false;
  }
}

const collectionAddress = process.env.RING_COLLECTION_ADDRESS;
const recipientAddress = process.env.FIRST_NFT_RECIPIENT;
const network = process.env.MINT_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
const defaultTonCenterBase = network === 'mainnet'
  ? 'https://toncenter.com/api/v3'
  : 'https://testnet.toncenter.com/api/v3';
const checks: Check[] = [];

checks.push({
  name: 'generated metadata #0',
  passed: await readable('generated/metadata/0.json'),
  detail: 'generated/metadata/0.json must exist',
});
checks.push({
  name: 'generated image #0',
  passed: await readable('generated/images/0.svg'),
  detail: 'generated/images/0.svg must exist',
});
checks.push({
  name: 'collection address syntax',
  passed: validAddress(collectionAddress),
  detail: 'RING_COLLECTION_ADDRESS must be a valid deployed collection address',
});
checks.push({
  name: 'recipient wallet',
  passed: validAddress(recipientAddress),
  detail: 'FIRST_NFT_RECIPIENT must be a valid TON wallet address',
});

let onChainNextItemIndex: number | null = null;
if (validAddress(collectionAddress)) {
  try {
    const reader = new TonCenterCollectionReader({
      baseUrl: process.env.TONCENTER_BASE_URL ?? defaultTonCenterBase,
      apiKey: process.env.TONCENTER_API_KEY,
    });
    const value = await reader.getNextItemIndex(collectionAddress!);
    onChainNextItemIndex = Number(value);
    checks.push({
      name: 'collection contract compatibility',
      passed: true,
      detail: `get_collection_data succeeded; next item index is ${onChainNextItemIndex}`,
    });
    checks.push({
      name: 'first NFT index available',
      passed: onChainNextItemIndex === 0,
      detail: onChainNextItemIndex === 0
        ? 'Collection is ready to mint NFT #0'
        : `Collection next index is ${onChainNextItemIndex}; NFT #0 is no longer available`,
    });
  } catch (error) {
    checks.push({
      name: 'collection contract compatibility',
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    checks.push({
      name: 'first NFT index available',
      passed: false,
      detail: 'Could not confirm on-chain next item index',
    });
  }
} else {
  checks.push({
    name: 'collection contract compatibility',
    passed: false,
    detail: 'A valid collection address is required before an on-chain check',
  });
  checks.push({
    name: 'first NFT index available',
    passed: false,
    detail: 'Could not confirm on-chain next item index',
  });
}

let ipfsReady = false;
let metadataBase = '';
try {
  const ipfs = JSON.parse(await readFile('generated/ipfs.json', 'utf8')) as {
    imageCid?: unknown;
    metadataCid?: unknown;
    metadataBase?: unknown;
  };
  metadataBase = typeof ipfs.metadataBase === 'string' ? ipfs.metadataBase : '';
  ipfsReady =
    typeof ipfs.imageCid === 'string' &&
    ipfs.imageCid.length > 10 &&
    typeof ipfs.metadataCid === 'string' &&
    ipfs.metadataCid.length > 10 &&
    metadataBase.startsWith('ipfs://') &&
    metadataBase.endsWith('/');
} catch {
  ipfsReady = false;
}
checks.push({
  name: 'final IPFS upload',
  passed: ipfsReady,
  detail: 'generated/ipfs.json must contain final image and metadata CIDs',
});

let metadataResolved = false;
try {
  const body = await readFile('generated/metadata/0.json', 'utf8');
  metadataResolved = !body.includes('REPLACE_IMAGE_CID') && body.includes('ipfs://');
} catch {
  metadataResolved = false;
}
checks.push({
  name: 'resolved metadata image',
  passed: metadataResolved,
  detail: 'metadata #0 must use the final image CID',
});
checks.push({
  name: 'TON Center verification credential',
  passed: Boolean(process.env.TONCENTER_API_KEY && !process.env.TONCENTER_API_KEY.includes('REPLACE')),
  detail: 'Required for reliable collection and post-mint verification',
});
checks.push({
  name: 'unsigned wallet transaction',
  passed: await readable('generated/first-mint-tonconnect.json'),
  detail: 'Run npm run mint:prepare:first before wallet approval',
});

const passed = checks.filter(check => check.passed).length;
const precision = Math.round((passed / checks.length) * 100);
const result = {
  ready: passed === checks.length,
  precision,
  network,
  onChainNextItemIndex,
  metadataBase: metadataBase || null,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
