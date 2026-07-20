import { readdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
if (!env.PINATA_JWT) throw new Error('PINATA_JWT is required');

async function uploadDirectory(directory: string, name: string): Promise<string> {
  const form = new FormData();
  const files = (await readdir(directory)).sort((left, right) => left.localeCompare(right));

  if (files.length === 0) throw new Error(`No files found in ${directory}`);

  for (const file of files) {
    const bytes = await readFile(`${directory}/${file}`);
    form.append('file', new Blob([new Uint8Array(bytes)]), file);
  }

  form.append('pinataMetadata', JSON.stringify({ name }));
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PINATA_JWT}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.status} ${await response.text()}`);
  }

  const result = (await response.json()) as { IpfsHash?: string };
  if (!result.IpfsHash) throw new Error('Pinata response did not include an IPFS hash');
  return result.IpfsHash;
}

function replaceImageCid(value: unknown, imageCid: string, path: string): string {
  if (typeof value !== 'string' || !value.includes('REPLACE_IMAGE_CID')) {
    throw new Error(`Metadata image placeholder missing in ${path}`);
  }
  return value.replaceAll('REPLACE_IMAGE_CID', imageCid);
}

const imageCid = await uploadDirectory('generated/images', 'Golden Legacy Rings images');
for (const file of (await readdir('generated/metadata')).sort((left, right) => left.localeCompare(right))) {
  const path = `generated/metadata/${file}`;
  const metadata = JSON.parse(await readFile(path, 'utf8')) as {
    image?: unknown;
    content_url?: unknown;
  };

  metadata.image = replaceImageCid(metadata.image, imageCid, `${path} image`);
  metadata.content_url = replaceImageCid(metadata.content_url, imageCid, `${path} content_url`);

  const serialized = JSON.stringify(metadata, null, 2);
  if (serialized.includes('REPLACE_IMAGE_CID')) {
    throw new Error(`Unresolved image CID placeholder remains in ${path}`);
  }
  await writeFile(path, serialized);
}

const metadataCid = await uploadDirectory('generated/metadata', 'Golden Legacy Rings metadata');
await writeFile(
  'generated/ipfs.json',
  JSON.stringify(
    {
      imageCid,
      metadataCid,
      imageBase: `ipfs://${imageCid}/`,
      metadataBase: `ipfs://${metadataCid}/`,
      uploadedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(`Images: ${imageCid}`);
console.log(`Metadata: ${metadataCid}`);
console.log(`Collection base: ipfs://${metadataCid}/`);
