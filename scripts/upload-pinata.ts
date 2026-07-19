import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
if (!env.PINATA_JWT) throw new Error('PINATA_JWT is required');

async function uploadDirectory(directory: string, name: string): Promise<string> {
  const form = new FormData();
  for (const file of await readdir(directory)) {
    const bytes = await readFile(`${directory}/${file}`);
    form.append('file', new Blob([bytes]), file);
  }
  form.append('pinataMetadata', JSON.stringify({ name }));
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST', headers: { Authorization: `Bearer ${env.PINATA_JWT}` }, body: form,
  });
  if (!response.ok) throw new Error(`Pinata upload failed: ${response.status} ${await response.text()}`);
  const result = await response.json() as { IpfsHash: string };
  return result.IpfsHash;
}

const imageCid = await uploadDirectory('generated/images', 'Golden Legacy Rings images');
for (const file of await readdir('generated/metadata')) {
  const path = `generated/metadata/${file}`;
  const metadata = JSON.parse(await readFile(path, 'utf8')) as { image: string };
  metadata.image = metadata.image.replace('REPLACE_IMAGE_CID', imageCid);
  await writeFile(path, JSON.stringify(metadata, null, 2));
}
const metadataCid = await uploadDirectory('generated/metadata', 'Golden Legacy Rings metadata');
await writeFile('generated/ipfs.json', JSON.stringify({ imageCid, metadataCid, metadataBase: `ipfs://${metadataCid}/` }, null, 2));
console.log(`Images: ${imageCid}`);
console.log(`Metadata: ${metadataCid}`);
console.log(`Collection base: ipfs://${metadataCid}/`);
