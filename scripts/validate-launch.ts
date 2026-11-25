import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { loadEnv, type AppEnv } from '../src/config/env.js';
import { validateGeneratedCollection } from '../src/collection/validateGenerated.js';

const failures: string[] = [];
const warnings: string[] = [];
let env: AppEnv | undefined;

try {
  env = loadEnv();
} catch (error) {
  failures.push(`Environment invalid: ${String(error)}`);
}

for (const path of [
  'generated/manifest.json',
  'generated/report.json',
  'generated/gallery.html',
  'generated/images',
  'generated/metadata',
]) {
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

if (failures.length === 0) {
  try {
    failures.push(...(await validateGeneratedCollection()));
  } catch (error) {
    failures.push(`Generated collection validation failed: ${String(error)}`);
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Launch validation passed: every generated ring and metadata record is consistent.');
}
