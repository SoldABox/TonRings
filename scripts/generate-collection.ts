import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
const materials = ['Royal Gold', 'White Gold', 'Rose Gold', 'Platinum', 'Black Titanium', 'Ancient Bronze', 'Obsidian', 'TON Crystal'];
const gems = ['None', 'Sapphire', 'Ruby', 'Emerald', 'Diamond Socket'];
const engravings = ['Legacy', 'Champion', 'Eternal', 'Genesis', 'Victory', 'Crown'];
const backgrounds = ['Midnight', 'Arena', 'Aurora', 'Vault'];

function pick<T>(items: readonly T[], seed: Buffer, offset: number): T {
  const item = items[seed[offset % seed.length]! % items.length];
  if (item === undefined) throw new Error('empty trait list');
  return item;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

await mkdir('generated/images', { recursive: true });
await mkdir('generated/metadata', { recursive: true });

const manifest: Array<{ index: number; sha256: string }> = [];
for (let index = 0; index < env.COLLECTION_SIZE; index += 1) {
  const seed = createHash('sha256').update(`golden-legacy-rings:v1:${index}`).digest();
  const material = pick(materials, seed, 0);
  const gem = pick(gems, seed, 1);
  const engraving = pick(engravings, seed, 2);
  const background = pick(backgrounds, seed, 3);
  const rarityScore = 100 + seed[4]! + (gem === 'Diamond Socket' ? 300 : 0) + (material === 'TON Crystal' ? 250 : 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs><radialGradient id="bg"><stop stop-color="#222"/><stop offset="1" stop-color="#050505"/></radialGradient><linearGradient id="ring"><stop stop-color="#fff4b0"/><stop offset=".45" stop-color="#c99421"/><stop offset="1" stop-color="#5b3900"/></linearGradient></defs>
<rect width="1200" height="1200" fill="url(#bg)"/><ellipse cx="600" cy="610" rx="330" ry="245" fill="none" stroke="url(#ring)" stroke-width="145"/>
<path d="M430 420 L770 420 L825 610 L375 610 Z" fill="url(#ring)"/><circle cx="600" cy="490" r="95" fill="#aef" opacity="${gem === 'None' ? '0.08' : '0.9'}"/>
<text x="600" y="820" text-anchor="middle" fill="white" font-size="54" font-family="serif">${escapeXml(engraving)}</text>
<text x="600" y="890" text-anchor="middle" fill="#d6b45f" font-size="30" font-family="sans-serif">${escapeXml(material)} · #${index}</text></svg>`;
  const imageName = `${index}.svg`;
  await writeFile(`generated/images/${imageName}`, svg);
  const metadata = {
    name: `Golden Legacy Ring #${index}`,
    description: 'Unofficial football-inspired digital ring. No affiliation with FIFA, teams, players, Getgems, or TON Diamonds.',
    image: `ipfs://REPLACE_IMAGE_CID/${imageName}`,
    attributes: [
      { trait_type: 'Material', value: material },
      { trait_type: 'Gem', value: gem },
      { trait_type: 'Engraving', value: engraving },
      { trait_type: 'Background', value: background },
      { trait_type: 'Rarity Score', value: rarityScore },
      { trait_type: 'Enchantable', value: gem === 'Diamond Socket' ? 'Yes' : 'No' },
    ],
  };
  const body = JSON.stringify(metadata, null, 2);
  await writeFile(`generated/metadata/${index}.json`, body);
  manifest.push({ index, sha256: createHash('sha256').update(svg).update(body).digest('hex') });
}
await writeFile('generated/manifest.json', JSON.stringify({ version: 1, size: env.COLLECTION_SIZE, items: manifest }, null, 2));
console.log(`Generated ${env.COLLECTION_SIZE} deterministic rings.`);
