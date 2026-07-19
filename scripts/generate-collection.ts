import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { loadEnv } from '../src/config/env.js';
import {
  auras,
  backgrounds,
  crowns,
  engravings,
  gems,
  materials,
  pickWeighted,
  ringSizes,
  type WeightedTrait,
} from '../src/collection/catalog.js';

const env = loadEnv();

interface GeneratedTraits {
  material: WeightedTrait;
  gem: WeightedTrait;
  background: WeightedTrait;
  crown: WeightedTrait;
  engraving: WeightedTrait;
  aura: WeightedTrait;
  size: (typeof ringSizes)[number];
  rarityScore: number;
  rarityTier: string;
  enchantable: boolean;
  founder: boolean;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return replacements[character] ?? character;
  });
}

function seedFor(index: number): Buffer {
  return createHash('sha256').update(`tonrings:golden-legacy:v2:${index}`).digest();
}

function traitsFor(index: number): GeneratedTraits {
  const seed = seedFor(index);
  const material = pickWeighted(materials, seed.readUInt16BE(0));
  const gem = pickWeighted(gems, seed.readUInt16BE(2));
  const background = pickWeighted(backgrounds, seed.readUInt16BE(4));
  const crown = pickWeighted(crowns, seed.readUInt16BE(6));
  const engraving = pickWeighted(engravings, seed.readUInt16BE(8));
  const aura = pickWeighted(auras, seed.readUInt16BE(10));
  const size = ringSizes[seed[12]! % ringSizes.length]!;
  const founder = index < Math.min(15, env.COLLECTION_SIZE);
  const rarityScore =
    100 +
    seed[13]! +
    (material.rarityBoost ?? 0) +
    (gem.rarityBoost ?? 0) +
    (background.rarityBoost ?? 0) +
    (crown.rarityBoost ?? 0) +
    (engraving.rarityBoost ?? 0) +
    (aura.rarityBoost ?? 0) +
    (founder ? 220 : 0);
  const rarityTier =
    rarityScore >= 900
      ? 'Mythic'
      : rarityScore >= 650
        ? 'Legendary'
        : rarityScore >= 450
          ? 'Epic'
          : rarityScore >= 280
            ? 'Rare'
            : 'Core';

  return {
    material,
    gem,
    background,
    crown,
    engraving,
    aura,
    size,
    rarityScore,
    rarityTier,
    enchantable: gem.id === 'diamond' || gem.id === 'black-diamond' || gem.id === 'none',
    founder,
  };
}

function crownShape(crown: WeightedTrait): string {
  switch (crown.id) {
    case 'fortress':
      return '<path d="M390 390h420l45 235H345z" rx="30"/>';
    case 'winged':
      return '<path d="M420 405h360l48 205H372z"/><path d="M390 470 245 540l145 24zm420 0 145 70-145 24z"/>';
    case 'dynasty':
      return '<path d="M390 420 470 340l80 75 50-115 50 115 80-75 80 80 35 205H355z"/>';
    case 'halo':
      return '<rect x="375" y="400" width="450" height="225" rx="85"/><ellipse cx="600" cy="365" rx="205" ry="58" fill="none" stroke="currentColor" stroke-width="24"/>';
    case 'genesis':
      return '<path d="M365 625 405 390l95 70 100-175 100 175 95-70 40 235z"/><path d="m600 320 38 62-38 62-38-62z" fill="currentColor"/>';
    default:
      return '<rect x="385" y="405" width="430" height="220" rx="58"/>';
  }
}

function auraLayer(aura: WeightedTrait): string {
  if (aura.id === 'none') return '';
  const [light, middle, dark] = aura.colors;
  return `<g opacity="0.82" filter="url(#blur)">
    <circle cx="600" cy="530" r="330" fill="none" stroke="${light}" stroke-width="18"/>
    <circle cx="600" cy="530" r="285" fill="none" stroke="${middle}" stroke-width="24" stroke-dasharray="22 34"/>
    <circle cx="600" cy="530" r="245" fill="none" stroke="${dark}" stroke-width="12"/>
  </g>`;
}

function gemShape(gem: WeightedTrait): string {
  if (gem.id === 'none') {
    return '<path d="m600 438 88 62-34 110-54 50-54-50-34-110z" fill="#0b101b" stroke="#778296" stroke-width="12" opacity=".9"/>';
  }
  return `<path d="m600 438 88 62-34 110-54 50-54-50-34-110z" fill="url(#gem)" stroke="#f4fdff" stroke-width="9"/>
    <path d="m600 438v222m-88-160 88 52 88-52m-142 110 54-58 54 58" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="5"/>`;
}

function ringSvg(index: number, traits: GeneratedTraits): string {
  const [materialLight, materialMiddle, materialDark] = traits.material.colors;
  const [gemLight, gemMiddle, gemDark] = traits.gem.colors;
  const [backgroundLight, backgroundMiddle, backgroundDark] = traits.background.colors;
  const scale = traits.size === 'Imperial' ? 1.08 : traits.size === 'Monument' ? 1 : 0.93;
  const founderMark = traits.founder
    ? '<g transform="translate(1015 150)"><circle r="58" fill="#0b1020" stroke="#ffd86d" stroke-width="8"/><text y="8" text-anchor="middle" fill="#ffd86d" font-size="30" font-family="sans-serif" font-weight="800">F</text></g>'
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-labelledby="title description">
  <title id="title">Golden Legacy Ring #${index}</title>
  <description id="description">${escapeXml(traits.rarityTier)} ${escapeXml(traits.material.label)} ring with ${escapeXml(traits.gem.label)} and ${escapeXml(traits.aura.label)}</description>
  <defs>
    <radialGradient id="background" cx="50%" cy="38%"><stop stop-color="${backgroundLight}"/><stop offset=".48" stop-color="${backgroundMiddle}"/><stop offset="1" stop-color="${backgroundDark}"/></radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${materialLight}"/><stop offset=".42" stop-color="${materialMiddle}"/><stop offset="1" stop-color="${materialDark}"/></linearGradient>
    <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${gemLight}"/><stop offset=".48" stop-color="${gemMiddle}"/><stop offset="1" stop-color="${gemDark}"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="30" stdDeviation="24" flood-color="#000" flood-opacity=".6"/></filter>
    <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
    <pattern id="grain" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#fff" opacity=".11"/><circle cx="18" cy="13" r=".8" fill="#fff" opacity=".08"/></pattern>
  </defs>
  <rect width="1200" height="1200" fill="url(#background)"/>
  <rect width="1200" height="1200" fill="url(#grain)"/>
  ${auraLayer(traits.aura)}
  <ellipse cx="600" cy="820" rx="335" ry="76" fill="#000" opacity=".5" filter="url(#blur)"/>
  <g transform="translate(${600 - 600 * scale} ${600 - 600 * scale}) scale(${scale})" filter="url(#shadow)" color="${materialLight}">
    <ellipse cx="600" cy="690" rx="300" ry="235" fill="none" stroke="url(#metal)" stroke-width="138"/>
    <ellipse cx="600" cy="690" rx="225" ry="160" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="12"/>
    <g fill="url(#metal)" stroke="${materialLight}" stroke-opacity=".35" stroke-width="6">${crownShape(traits.crown)}</g>
    ${gemShape(traits.gem)}
    <path d="M410 625h380" stroke="#ffffff" stroke-opacity=".22" stroke-width="9"/>
  </g>
  <text x="600" y="930" text-anchor="middle" fill="#ffffff" font-size="54" font-family="Georgia,serif" font-weight="700" letter-spacing="8">${escapeXml(traits.engraving.label)}</text>
  <text x="600" y="992" text-anchor="middle" fill="${materialLight}" font-size="28" font-family="Arial,sans-serif" letter-spacing="4">${escapeXml(traits.material.label.toUpperCase())} · #${String(index).padStart(3, '0')}</text>
  <g transform="translate(85 1030)"><rect width="230" height="54" rx="27" fill="#080b14" stroke="${materialLight}" stroke-opacity=".5"/><text x="115" y="36" text-anchor="middle" fill="#fff" font-size="23" font-family="Arial,sans-serif">${escapeXml(traits.rarityTier.toUpperCase())}</text></g>
  ${founderMark}
</svg>`;
}

function metadataFor(index: number, imageName: string, traits: GeneratedTraits) {
  return {
    name: `Golden Legacy Ring #${index}`,
    description:
      'An independent, football-inspired digital championship ring from TonRings. Supports verified, non-custodial TON Diamond enchantments when eligible. No official affiliation is implied.',
    image: `ipfs://REPLACE_IMAGE_CID/${imageName}`,
    content_url: `ipfs://REPLACE_IMAGE_CID/${imageName}`,
    attributes: [
      { trait_type: 'Material', value: traits.material.label },
      { trait_type: 'Gem Signal', value: traits.gem.label },
      { trait_type: 'Crown', value: traits.crown.label },
      { trait_type: 'Engraving', value: traits.engraving.label },
      { trait_type: 'Background', value: traits.background.label },
      { trait_type: 'Aura', value: traits.aura.label },
      { trait_type: 'Ring Scale', value: traits.size },
      { trait_type: 'Rarity Tier', value: traits.rarityTier },
      { trait_type: 'Rarity Score', value: traits.rarityScore },
      { trait_type: 'Enchantable', value: traits.enchantable ? 'Yes' : 'No' },
      { trait_type: 'Founder Edition', value: traits.founder ? 'Yes' : 'No' },
    ],
  };
}

await rm('generated', { recursive: true, force: true });
await mkdir('generated/images', { recursive: true });
await mkdir('generated/metadata', { recursive: true });

const manifestItems: Array<{
  index: number;
  sha256: string;
  rarityTier: string;
  rarityScore: number;
  enchantable: boolean;
}> = [];
const rarityCounts = new Map<string, number>();
const galleryCards: string[] = [];

for (let index = 0; index < env.COLLECTION_SIZE; index += 1) {
  const traits = traitsFor(index);
  const imageName = `${index}.svg`;
  const svg = ringSvg(index, traits);
  const metadata = metadataFor(index, imageName, traits);
  const body = JSON.stringify(metadata, null, 2);

  await writeFile(`generated/images/${imageName}`, svg);
  await writeFile(`generated/metadata/${index}.json`, body);

  rarityCounts.set(traits.rarityTier, (rarityCounts.get(traits.rarityTier) ?? 0) + 1);
  manifestItems.push({
    index,
    sha256: createHash('sha256').update(svg).update(body).digest('hex'),
    rarityTier: traits.rarityTier,
    rarityScore: traits.rarityScore,
    enchantable: traits.enchantable,
  });

  if (index < 24) {
    galleryCards.push(`<article><img src="images/${imageName}" alt="Golden Legacy Ring #${index}"/><h2>#${String(index).padStart(3, '0')} · ${escapeXml(traits.rarityTier)}</h2><p>${escapeXml(traits.material.label)} · ${escapeXml(traits.gem.label)} · ${escapeXml(traits.aura.label)}</p></article>`);
  }
}

const manifest = {
  version: 2,
  generator: 'tonrings-layered-svg-v2',
  size: env.COLLECTION_SIZE,
  generatedAt: new Date().toISOString(),
  rarityCounts: Object.fromEntries([...rarityCounts.entries()].sort()),
  items: manifestItems,
};
await writeFile('generated/manifest.json', JSON.stringify(manifest, null, 2));

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>TonRings Generated Preview</title><style>body{margin:0;background:#080b14;color:#f7f8fc;font-family:system-ui;padding:32px}header{max-width:1100px;margin:auto auto 28px}h1{font-size:clamp(2.4rem,6vw,5rem);margin:0}header p,article p{color:#a9b0c1}.grid{max-width:1100px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}article{border:1px solid #ffffff1a;border-radius:20px;padding:12px;background:#121726}img{width:100%;border-radius:14px;display:block}h2{font-size:1rem;margin:12px 4px 3px}article p{font-size:.82rem;margin:0 4px 7px}</style></head><body><header><p>DETERMINISTIC COLLECTION PREVIEW</p><h1>Golden Legacy Rings</h1><p>First ${Math.min(24, env.COLLECTION_SIZE)} generated items. Run <code>npm run generate</code> to rebuild the full collection.</p></header><main class="grid">${galleryCards.join('')}</main></body></html>`;
await writeFile('generated/gallery.html', gallery);

const report = {
  collectionSize: env.COLLECTION_SIZE,
  founderEditions: Math.min(15, env.COLLECTION_SIZE),
  rarityCounts: manifest.rarityCounts,
  enchantableCount: manifestItems.filter(item => item.enchantable).length,
  traitFamilies: {
    materials: materials.length,
    gems: gems.length,
    backgrounds: backgrounds.length,
    crowns: crowns.length,
    engravings: engravings.length,
    auras: auras.length,
    sizes: ringSizes.length,
  },
};
await writeFile('generated/report.json', JSON.stringify(report, null, 2));

console.log(`Generated ${env.COLLECTION_SIZE} layered TonRings.`);
console.log(`Founder editions: ${report.founderEditions}`);
console.log(`Enchantable rings: ${report.enchantableCount}`);
console.log(`Gallery: generated/gallery.html`);
