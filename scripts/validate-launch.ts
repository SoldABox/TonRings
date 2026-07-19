import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { loadEnv, type AppEnv } from '../src/config/env.js';

const failures: string[] = [];
const warnings: string[] = [];
let env: AppEnv | undefined;

try {
  env = loadEnv();
} catch (error) {
  failures.push(`Environment invalid: ${String(error)}`);
}

for (const path of ['generated/manifest.json', 'generated/images', 'generated/metadata']) {
  try {
    await access(path, constants.R_OK);
  } catch {
    failures.push(`Missing generated output: ${path}`);
  }
}

if (env) {
  if (env.TON_DIAMONDS_COLLECTION.includes('REPLACE')) {
    failures.push('TON_DIAMONDS_COLLECTION is not configured');
  }
  if (env.RING_COLLECTION_ADDRESS.includes('REPLACE')) {
    failures.push('RING_COLLECTION_ADDRESS is not configured');
  }
  if (!env.PINATA_JWT) warnings.push('PINATA_JWT missing: generation works, upload is blocked');
}

try {
  const manifest = JSON.parse(await readFile('generated/manifest.json', 'utf8')) as {
    size?: number;
  };
  if (!Number.isSafeInteger(manifest.size) || (manifest.size ?? 0) < 1) {
    failures.push('Manifest size is invalid');
  } else {
    const [images, metadata] = await Promise.all([
      readdir('generated/images'),
      readdir('generated/metadata'),
    ]);
    if (images.length !== manifest.size) {
      failures.push(`Image count ${images.length} != manifest size ${manifest.size}`);
    }
    if (metadata.length !== manifest.size) {
      failures.push(`Metadata count ${metadata.length} != manifest size ${manifest.size}`);
    }
  }
} catch (error) {
  failures.push(`Generated collection validation failed: ${String(error)}`);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Launch validation passed.');
}
