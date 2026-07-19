# Deployment Guide

## Recommended fast stack

- Application: Railway, Render or Fly.io
- Database: managed PostgreSQL
- NFT files: Pinata/IPFS
- Marketplace: Getgems after collection deployment and metadata verification

## 1. Preflight

```bash
npm install
npm run check
```

For collection launch preparation:

```bash
npm run preflight
```

## 2. Configure production environment

Required values:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
APP_ORIGIN=https://app.example.com
TON_PROOF_DOMAIN=app.example.com
TONCENTER_BASE_URL=https://toncenter.com/api/v3
TONCENTER_API_KEY=...
TON_DIAMONDS_COLLECTION=...
RING_COLLECTION_ADDRESS=...
DATABASE_URL=postgres://...
SESSION_SECRET=...
PINATA_JWT=...
IPFS_GATEWAY=https://ipfs.io/ipfs/
COLLECTION_SIZE=256
```

`APP_ORIGIN` includes the protocol. `TON_PROOF_DOMAIN` is only the exact hostname expected from TonConnect.

## 3. Database

```bash
npm run db:migrate
```

Run migrations as a release command or one-off deployment task. Do not run concurrent migration processes.

## 4. Build and start

Build:

```bash
npm install --no-audit --no-fund
npm run build
```

Start:

```bash
npm start
```

Health endpoint:

```text
GET /health
```

Readiness endpoint:

```text
GET /ready
```

Configure the hosting platform to require a successful `/health` response. Manually verify `/ready` returns HTTP 200 before announcing launch.

## 5. Generate and publish collection data

```bash
npm run generate
npm run validate:launch
npm run upload:ipfs
```

Record all returned CIDs. Confirm that metadata links resolve through at least two IPFS gateways before minting.

## 6. Production smoke test

```bash
curl -fsS https://api.example.com/health
curl -fsS https://api.example.com/ready
curl -fsS -X POST https://api.example.com/api/auth/nonce
```

Then verify lookup endpoints with known valid TON addresses.

## Rollback

1. Stop new binding traffic.
2. Roll back the application image, not the database blindly.
3. Preserve enchantment and nonce records.
4. Investigate before reversing migrations.
5. Keep `/ready` returning 503 if configuration or dependencies are unsafe.

## Deployment gate

Do not announce full enchantment functionality until both planned endpoints exist and pass integration tests:

- `POST /api/auth/verify`
- `POST /api/enchantments/bind`
