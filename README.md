<div align="center">
  <img src="docs/assets/tonrings-logo.svg" alt="TonRings logo" width="180" />

# TonRings

**Ownership-gated TON Diamond enchantments for collectible championship rings.**

[![CI](https://github.com/SoldABox/TonRings/actions/workflows/ci.yml/badge.svg)](https://github.com/SoldABox/TonRings/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![TON](https://img.shields.io/badge/Network-TON-0098EA)
![License](https://img.shields.io/badge/code-Apache--2.0-blue)

</div>

## What TonRings does

TonRings lets a wallet owner bind an eligible **TON Diamond NFT** to a **TonRings NFT** as an enchantment. The original NFTs remain in the owner's wallet and are never modified or transferred by the application.

The service verifies:

1. The wallet owns the selected ring.
2. The wallet owns the selected TON Diamond.
3. Both NFTs belong to the configured collections.
4. The wallet signed the exact one-time request.
5. The nonce is unused and not expired.
6. The ring and Diamond are not already actively bound.

The final binding is stored atomically in PostgreSQL.

> TonRings is an independent project. It is not affiliated with FIFA, TON Foundation, TON Diamonds, Getgems, or any football organization unless a written partnership is announced.

## Visual architecture

![TonRings architecture](docs/assets/architecture.svg)

```text
Wallet → TonConnect proof → API → TON ownership checks
                            ↓
                    Atomic PostgreSQL binding
                            ↓
                 Ring metadata / visual enchantment
```

## Current capabilities

| Area | Status |
|---|---|
| Strict TypeScript core | Implemented |
| TON NFT ownership provider | Implemented |
| TonConnect proof verification | Implemented |
| Replay and expiry protection | Implemented |
| Atomic ring/Diamond exclusivity | Implemented |
| PostgreSQL storage | Implemented |
| Nonce and session foundation | Implemented |
| NFT collection generator | Implemented |
| IPFS/Pinata upload automation | Implemented |
| Health/readiness endpoints | Implemented |
| Public wallet verification route | In progress |
| Public enchantment binding route | In progress |
| Production web interface | Planned |

## Repository map

```text
src/
  auth/             TonConnect proof verification
  config/           Environment validation
  enchantment/      Binding rules and domain service
  persistence/      PostgreSQL implementation
  ton/              TON Center ownership provider
  server.ts         Fastify HTTP application
scripts/
  migrate.ts        Database migration runner
  generate-collection.ts
  upload-pinata.ts
  validate-launch.ts
tests/              Unit and integration-oriented tests
docs/               Architecture, API and deployment guides
generated/          Generated images and metadata (not committed)
```

## Fast local start

### Requirements

- Node.js 22 or newer
- PostgreSQL
- TON Center API key
- Pinata JWT for IPFS uploads

### Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run check
npm run dev
```

Service checks:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

## Environment variables

| Variable | Purpose |
|---|---|
| `APP_ORIGIN` | Allowed frontend origin |
| `TON_PROOF_DOMAIN` | Domain expected in TonConnect proof |
| `TONCENTER_BASE_URL` | TON Center API endpoint |
| `TONCENTER_API_KEY` | TON Center credential |
| `TON_DIAMONDS_COLLECTION` | Authoritatively verified Diamond collection address |
| `RING_COLLECTION_ADDRESS` | Deployed TonRings collection address |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random secret, minimum 32 characters |
| `PINATA_JWT` | Pinata upload credential |
| `IPFS_GATEWAY` | Public IPFS gateway |
| `COLLECTION_SIZE` | Number of generated ring NFTs |

Never commit `.env` or real credentials.

## Commands

| Command | Function |
|---|---|
| `npm run dev` | Run the API with live reload |
| `npm run build` | Compile strict TypeScript |
| `npm run lint` | Run type-aware ESLint |
| `npm test` | Run tests and coverage |
| `npm run check` | Lint, build and test |
| `npm run db:migrate` | Apply database migration |
| `npm run generate` | Generate collection assets and metadata |
| `npm run upload:ipfs` | Upload generated output to Pinata |
| `npm run validate:launch` | Validate environment and generated output |
| `npm run prepare:launch` | Generate and validate the collection |
| `npm run preflight` | Full code and launch validation |

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Process health |
| `GET` | `/ready` | Production dependency readiness |
| `POST` | `/api/auth/nonce` | Issue a one-time authentication nonce |
| `GET` | `/api/enchantments/ring/:address` | Find an active binding by ring |
| `GET` | `/api/enchantments/diamond/:address` | Find an active binding by Diamond |
| `POST` | `/api/enchantments/revoke` | Revoke an owned binding |

See [API reference](docs/API.md).

## Security model

- NFTs remain in the user's wallet.
- Wallet proofs are domain-bound and payload-bound.
- Proofs and enchantment requests expire.
- Nonces are single use.
- TON addresses are normalized before comparison.
- NFT ownership is checked against current on-chain/indexed data.
- Database uniqueness must be enforced atomically.
- API requests are size-limited and rate-limited.
- Readiness fails closed when launch configuration is missing.

Security reports should follow [SECURITY.md](SECURITY.md).

## Deployment

The fastest supported path is a managed Node service plus managed PostgreSQL:

1. Create PostgreSQL.
2. configure environment variables.
3. Run `npm run db:migrate`.
4. Build with `npm install && npm run build`.
5. Start with `npm start`.
6. Require `/ready` to return HTTP 200.

See the [deployment guide](docs/DEPLOYMENT.md) and [launch checklist](docs/LAUNCH_CHECKLIST.md).

## Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)
- [Security policy](SECURITY.md)

## Licensing

- Source code: Apache License 2.0
- Artwork, collection identity and brand assets: all rights reserved unless explicitly stated otherwise
- Third-party NFT names and marks remain property of their respective owners
