# API Reference

Base URL in development: `http://localhost:3000`

All JSON request bodies must use `Content-Type: application/json`.

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

Returns HTTP `200` only when launch-critical configuration is present. Returns HTTP `503` with a list of missing values otherwise.

```json
{
  "ready": false,
  "missing": ["RING_COLLECTION_ADDRESS"]
}
```

## Authentication nonce

### `POST /api/auth/nonce`

Issues a short-lived one-time nonce for wallet authentication.

The route is rate-limited more strictly than general API traffic.

## Lookup by ring

### `GET /api/enchantments/ring/:address`

Returns the active enchantment for a ring or `null`.

```json
{
  "enchantment": null
}
```

## Lookup by Diamond

### `GET /api/enchantments/diamond/:address`

Returns the active enchantment for a TON Diamond or `null`.

## Revoke enchantment

### `POST /api/enchantments/revoke`

Requires an authenticated bearer session.

```http
Authorization: Bearer <session-token>
```

Request:

```json
{
  "id": "f9fb6138-93cb-4d1d-824d-92af82266d59"
}
```

Responses:

- `200` — binding revoked
- `401` — session missing or invalid
- `404` — binding not found or not owned by the session wallet

## Planned launch-critical endpoints

### `POST /api/auth/verify`

Will consume the nonce, validate TonConnect proof and issue a short-lived wallet session.

### `POST /api/enchantments/bind`

Will authenticate the wallet, validate both NFT ownership records and create the binding atomically.

These endpoints must not be advertised as available until implementation and integration tests are complete.

## Error handling

Schema validation errors return HTTP `400` with a generic response:

```json
{ "error": "invalid request" }
```

Unexpected errors return HTTP `500` without exposing internal stack traces:

```json
{ "error": "internal error" }
```
