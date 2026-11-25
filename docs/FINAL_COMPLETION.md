# Final Completion Gates

TonRings is considered repository-complete when all automated gates below pass on the same commit.

## Application

- ESLint passes.
- Strict TypeScript compilation passes.
- Unit tests and coverage pass.
- Public frontend integrity passes.
- Docker production image builds successfully.

## Security and dependencies

- Production dependency audit reports no high-severity failure.
- The full dependency tree is valid.
- CodeQL TypeScript analysis completes successfully.

## Generated collection

- The configured number of SVG images is generated.
- The same number of metadata records is generated.
- Every manifest index exists exactly once.
- Every image and metadata pair matches its manifest SHA-256 hash.
- No duplicate image/metadata payload exists.
- Every SVG contains an accessible title and description.
- Every metadata record contains all required traits.
- Manifest rarity values match metadata and report totals.
- Founder status matches the configured first 15 indexes.
- Gallery entries exist for the first 24 items.
- Regeneration produces identical image, metadata, report, and gallery hashes.

## IPFS upload

- Both `image` and `content_url` placeholders are replaced.
- Upload fails closed when either field is malformed.
- No unresolved image CID remains before metadata upload.
- `generated/ipfs.json` records image and metadata bases.

## External launch requirements

The repository cannot supply private or project-specific production values. A production launch still requires:

- PostgreSQL database credentials;
- TON Center API key;
- deployed ring collection address;
- approved TON Diamond collection address;
- Pinata JWT;
- production domain and HTTPS hosting;
- final legal, branding, rarity, and mint review.

These are deployment inputs, not incomplete application functions.
