import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

interface ManifestItem {
  index: number;
  sha256: string;
  rarityTier: string;
  rarityScore: number;
  enchantable: boolean;
}

interface Manifest {
  version?: number;
  generator?: string;
  size?: number;
  items?: ManifestItem[];
  rarityCounts?: Record<string, number>;
}

interface Metadata {
  name?: unknown;
  description?: unknown;
  image?: unknown;
  content_url?: unknown;
  attributes?: Array<{ trait_type?: unknown; value?: unknown }>;
}

function traits(metadata: Metadata): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const attribute of metadata.attributes ?? []) {
    if (typeof attribute.trait_type === 'string') {
      result.set(attribute.trait_type, attribute.value);
    }
  }
  return result;
}

export async function validateGeneratedCollection(): Promise<string[]> {
  const failures: string[] = [];
  const manifest = JSON.parse(await readFile('generated/manifest.json', 'utf8')) as Manifest;
  const size = manifest.size ?? 0;
  const items = manifest.items ?? [];

  if (manifest.version !== 2) failures.push('Manifest version must be 2');
  if (manifest.generator !== 'tonrings-layered-svg-v2') failures.push('Unexpected generator');
  if (!Number.isSafeInteger(size) || size < 1) failures.push('Manifest size is invalid');
  if (items.length !== size) failures.push(`Manifest items ${items.length} != size ${size}`);

  const [images, metadataFiles] = await Promise.all([
    readdir('generated/images'),
    readdir('generated/metadata'),
  ]);
  if (images.length !== size) failures.push(`Image count ${images.length} != size ${size}`);
  if (metadataFiles.length !== size) failures.push(`Metadata count ${metadataFiles.length} != size ${size}`);

  const seenIndexes = new Set<number>();
  const seenHashes = new Set<string>();
  const rarityCounts = new Map<string, number>();
  const requiredTraits = [
    'Material', 'Gem Signal', 'Crown', 'Engraving', 'Background', 'Aura',
    'Ring Scale', 'Rarity Tier', 'Rarity Score', 'Enchantable', 'Founder Edition',
  ];

  for (const item of items) {
    if (!Number.isSafeInteger(item.index) || item.index < 0 || item.index >= size) {
      failures.push(`Invalid index ${String(item.index)}`);
      continue;
    }
    if (seenIndexes.has(item.index)) failures.push(`Duplicate index ${item.index}`);
    seenIndexes.add(item.index);

    const [svg, metadataBody] = await Promise.all([
      readFile(`generated/images/${item.index}.svg`, 'utf8'),
      readFile(`generated/metadata/${item.index}.json`, 'utf8'),
    ]);
    const hash = createHash('sha256').update(svg).update(metadataBody).digest('hex');
    if (hash !== item.sha256) failures.push(`Hash mismatch for #${item.index}`);
    if (seenHashes.has(hash)) failures.push(`Duplicate payload for #${item.index}`);
    seenHashes.add(hash);

    if (!svg.startsWith('<svg')) failures.push(`Invalid SVG for #${item.index}`);
    if (!svg.includes(`<title id="title">Golden Legacy Ring #${item.index}</title>`)) {
      failures.push(`Accessible title missing for #${item.index}`);
    }
    if (!svg.includes('<description id="description">')) {
      failures.push(`Accessible description missing for #${item.index}`);
    }

    const metadata = JSON.parse(metadataBody) as Metadata;
    if (metadata.name !== `Golden Legacy Ring #${item.index}`) failures.push(`Name mismatch for #${item.index}`);
    if (typeof metadata.description !== 'string' || metadata.description.length < 20) failures.push(`Description missing for #${item.index}`);
    if (metadata.content_url !== metadata.image) failures.push(`content_url mismatch for #${item.index}`);
    if (typeof metadata.image !== 'string' || !metadata.image.endsWith(`/${item.index}.svg`)) failures.push(`Image URI mismatch for #${item.index}`);

    const values = traits(metadata);
    for (const name of requiredTraits) if (!values.has(name)) failures.push(`${name} missing for #${item.index}`);
    if (values.get('Rarity Tier') !== item.rarityTier) failures.push(`Rarity tier mismatch for #${item.index}`);
    if (values.get('Rarity Score') !== item.rarityScore) failures.push(`Rarity score mismatch for #${item.index}`);
    if (values.get('Enchantable') !== (item.enchantable ? 'Yes' : 'No')) failures.push(`Enchantable mismatch for #${item.index}`);
    if (values.get('Founder Edition') !== (item.index < Math.min(15, size) ? 'Yes' : 'No')) failures.push(`Founder mismatch for #${item.index}`);
    rarityCounts.set(item.rarityTier, (rarityCounts.get(item.rarityTier) ?? 0) + 1);
  }

  for (let index = 0; index < size; index += 1) {
    if (!seenIndexes.has(index)) failures.push(`Manifest is missing index ${index}`);
  }
  for (const [tier, count] of rarityCounts) {
    if (manifest.rarityCounts?.[tier] !== count) failures.push(`Rarity count mismatch for ${tier}`);
  }

  const report = JSON.parse(await readFile('generated/report.json', 'utf8')) as {
    collectionSize?: unknown; founderEditions?: unknown; enchantableCount?: unknown; rarityCounts?: unknown;
  };
  if (report.collectionSize !== size) failures.push('Report collection size mismatch');
  if (report.founderEditions !== Math.min(15, size)) failures.push('Report founder count mismatch');
  if (report.enchantableCount !== items.filter(item => item.enchantable).length) failures.push('Report enchantable count mismatch');
  if (JSON.stringify(report.rarityCounts) !== JSON.stringify(manifest.rarityCounts)) failures.push('Report rarity counts mismatch');

  const gallery = await readFile('generated/gallery.html', 'utf8');
  for (let index = 0; index < Math.min(24, size); index += 1) {
    if (!gallery.includes(`images/${index}.svg`)) failures.push(`Gallery missing #${index}`);
  }

  try {
    const ipfs = JSON.parse(await readFile('generated/ipfs.json', 'utf8')) as { imageCid?: unknown; metadataCid?: unknown };
    if (typeof ipfs.imageCid !== 'string' || typeof ipfs.metadataCid !== 'string') failures.push('IPFS record is incomplete');
    for (let index = 0; index < size; index += 1) {
      if ((await readFile(`generated/metadata/${index}.json`, 'utf8')).includes('REPLACE_IMAGE_CID')) failures.push(`CID placeholder remains in ${index}.json`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  return failures;
}
