# Collection Elements

TonRings uses a deterministic layered SVG generator. The same collection index and generator version always produce the same visual combination and metadata.

## Element families

| Family | Count | Purpose |
|---|---:|---|
| Materials | 8 | Defines the ring's metal body and highlight palette |
| Gem signals | 7 | Defines the socket or active gem identity |
| Backgrounds | 7 | Defines the environment and atmosphere |
| Crowns | 6 | Defines the upper ring silhouette |
| Engravings | 7 | Defines the visible identity statement |
| Auras | 6 | Defines the outer energy treatment |
| Ring scales | 3 | Signet, Monument, or Imperial proportions |

This creates more than **296,000 theoretical visual combinations** before rarity weighting, founder status, index numbering and rarity tiers are considered.

## Special elements

- **TON Crystal** — rare blue crystal material.
- **Black Diamond** — highest gem rarity boost.
- **Genesis Crown** — rare crown silhouette.
- **ONE OF ONE** — rare engraving.
- **Founder Radiance** — rare aura.
- **Founder Edition** — automatically assigned to the first 15 collection indexes.
- **Open Socket** — visually dormant ring that remains eligible for a future verified enchantment.

## Rarity system

Every generated item receives a deterministic rarity score based on:

- the selected weighted elements;
- each element's rarity boost;
- a deterministic index seed component;
- founder-edition status.

The score maps to one of five tiers:

1. Core
2. Rare
3. Epic
4. Legendary
5. Mythic

Rarity is descriptive metadata, not a promise of market value.

## Generated output

Running:

```bash
npm run generate
```

creates:

```text
generated/
  images/          Layered 1200 × 1200 SVG rings
  metadata/        NFT metadata JSON files
  gallery.html     Preview of the first 24 rings
  manifest.json    Item hashes and rarity summary
  report.json      Collection and trait-family statistics
```

Every SVG includes:

- accessible title and description;
- material gradients;
- selected crown geometry;
- gem geometry;
- aura layers;
- background treatment;
- rarity badge;
- founder mark when applicable;
- collection index and engraving.

## Automated generation

The `Collection assets` GitHub Actions workflow:

1. builds the TypeScript project;
2. generates the full configured collection;
3. validates image and metadata counts;
4. regenerates and compares every image and metadata hash;
5. packages the complete `generated/` directory;
6. uploads it as a 30-day workflow artifact.

Run it manually from GitHub Actions and set the desired collection size. The default is 256 rings.

## IPFS preparation

After reviewing the generated gallery:

```bash
npm run upload:ipfs
```

uploads images first, replaces the image CID placeholder in metadata, uploads metadata, and writes `generated/ipfs.json`.

Do not mint until the gallery, report, manifest, metadata, legal copy and collection addresses have been reviewed.
