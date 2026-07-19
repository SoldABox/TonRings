# Changelog

All notable changes to TonRings are documented here.

## 0.4.0 — 2026-07-19

### Added

- Complete TonConnect nonce and wallet-proof authentication API.
- TON Center wallet public-key resolver using `get_public_key`.
- Authenticated enchantment binding endpoint.
- Atomic PostgreSQL repository implementation.
- Configurable verified TON Diamond collection address.
- Ordered database migration runner and collection-address migration.
- Docker production image and health check.
- TonConnect manifest template.
- Architecture diagram, vector logo, API reference, deployment guide and launch checklist.
- Security reporting policy.
- Public-key resolver tests.

### Improved

- Strict TypeScript and type-aware ESLint coverage for launch scripts.
- Pinata uploader validation, deterministic file ordering and timeouts.
- Runtime readiness checks and database health verification.
- TON address validation and normalization.
- Authentication error handling and no-store response headers.
- CI steps split into lint, build and test diagnostics.
- GitHub Actions upgraded to current action runtimes.

### Fixed

- ESLint parsing failures for files under `scripts/`.
- JavaScript configuration accidentally included in TypeScript compilation.
- Optional TON Center API-key typing under `exactOptionalPropertyTypes`.
- Non-atomic database persistence contract.
- Hard-coded Diamond collection verification.
- Compiled migration path mismatch in Docker deployments.
- Node Buffer compatibility in multipart IPFS uploads.

## 0.3.0

- Initial Fastify server, PostgreSQL schema, collection generator, Pinata uploader and launch automation.

## 0.2.0

- TON Center NFT ownership provider and TonConnect proof verification.

## 0.1.0

- Enchantment domain model, ownership rules, replay protection and unit-test foundation.
