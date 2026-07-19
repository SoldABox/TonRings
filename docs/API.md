# API Reference

Development base URL: `http://localhost:3000`

All JSON request bodies use `Content-Type: application/json`.

## Health

### `GET /health`

Confirms that the process is running.

```json
{
  "ok": true,
  "service": "ton-rings",
  "version": "0.3.0"
}
```

## Readiness

### `GET /ready`

Returns HTTP `200` only when launch configuration and PostgreSQL are available. Otherwise it returns HTTP `503` and a list of missing dependencies.

```json
{
  "ready": false,
  "missing": ["RING_COLLECTION_ADDRESS", "DATABASE"]
}
```

## Authentication flow

### 1. `POST /api/auth/nonce`

Issues a five-minute, single-use UUID nonce.

Example response:

```json
{
  "nonce": "71052048-8e13-49b2-bb91-bc17d3f2943f",
  "expiresAt": "2026-07-19T20:30:00.000Z"
}
```

Pass `nonce` as the TonConnect `tonProof` payload.

### 2. `POST /api/auth/verify`

Validates the wallet's TonConnect proof and consumes the issued nonce.

Request:

```json
{
  "address": "0:...",
  "walletStateInit": "base64-boc",
  "proof": {
    "timestamp": 1784492700,
    "domain": {
      "lengthBytes": 16,
      "value": "app.example.com"
    },
    "payload": "71052048-8e13-49b2-bb91-bc17d3f2943f",
    "signature": "base64-signature"
  }
}
```

Success:

```json
{
  "token": "opaque-session-token",
  "walletAddress": "0:...",
  "expiresIn": 86400
}
```

The token is returned once. The database stores only its SHA-256 hash.

Possible responses:

- `200` — verified and authenticated
- `400` — malformed request
- `401` — proof, public key, domain, timestamp, or nonce verification failed
- `429` — rate limited

## Create enchantment

### `POST /api/enchantments/bind`

Requires:

```http
Authorization: Bearer <session-token>
```

Request:

```json
{
  "request": {
    "ringAddress": "0:...",
    "ringIndex": 1,
    "diamondAddress": "0:...",
    "diamondIndex": 42,
    "ownerAddress": "0:...",
    "nonce": "cf28e331-cd44-4eed-97ac-8c5517d73cf1",
    "issuedAt": 1784492700,
    "expiresAt": 1784493300
  }
}
```

The session wallet must match `ownerAddress`. The API re-checks current ownership of both NFTs and verifies both configured collection addresses before committing the record atomically.

Possible responses:

- `201` — binding created
- `400` — malformed or invalid request window
- `401` — missing or invalid session
- `403` — session owner or NFT ownership mismatch
- `409` — nonce, ring, or Diamond conflict
- `429` — rate limited

## Lookup by ring

### `GET /api/enchantments/ring/:address`

Returns the active enchantment or `null`.

```json
{
  "enchantment": null
}
```

## Lookup by Diamond

### `GET /api/enchantments/diamond/:address`

Returns the active enchantment or `null`.

## Revoke enchantment

### `POST /api/enchantments/revoke`

Requires an authenticated bearer session.

Request:

```json
{
  "id": "f9fb6138-93cb-4d1d-824d-92af82266d59"
}
```

Possible responses:

- `200` — binding revoked
- `401` — session missing or invalid
- `404` — active binding not found or not owned by the session wallet

## Error policy

Schema validation errors return:

```json
{ "error": "invalid request" }
```

Authentication failures return a generic response rather than exposing cryptographic details:

```json
{ "error": "wallet proof verification failed" }
```

Unexpected failures return:

```json
{ "error": "internal error" }
```
