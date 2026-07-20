import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Address } from '@ton/core';

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
  name: 'deployed collection address',
  passed: validAddress(process.env.RING_COLLECTION_ADDRESS),
  detail: 'RING_COLLECTION_ADDRESS must be the deployed collection contract',
});
checks.push({
  name: 'recipient wallet',
  passed: validAddress(process.env.FIRST_NFT_RECIPIENT),
  detail: 'FIRST_NFT_RECIPIENT must be a valid TON wallet address',
});

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
  detail: 'Required for reliable post-mint verification',
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
  metadataBase: metadataBase || null,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
