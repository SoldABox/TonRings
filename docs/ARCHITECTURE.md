# Architecture

## Goal

TonRings creates a verifiable, non-custodial relationship between one TonRings NFT and one eligible TON Diamond NFT.

The application does not transfer, burn, wrap, or modify either NFT. It records an application-level enchantment after proving wallet control and current ownership.

## Main components

### Wallet and TonConnect

The frontend requests a server-generated nonce and asks the wallet to produce a TonConnect proof. The backend validates the proof domain, payload, timestamp, wallet state initialization and Ed25519 signature.

### TON ownership adapter

`TonCenterNftProvider` fetches indexed NFT data and normalizes all TON addresses before comparison. The domain layer verifies:

- NFT item address
- item index
- current owner address
- expected collection address

### Enchantment domain

`EnchantmentService` is transport-independent. It validates request freshness, ownership, signature and atomic repository outcomes.

Repository outcomes are explicit:

```text
created
nonce_exists
ring_exists
diamond_exists
```

This prevents database-specific errors from leaking into application logic.

### PostgreSQL

The persistence layer must enforce uniqueness inside one transaction. Separate read-then-write checks are insufficient because concurrent requests could pass simultaneously.

Required invariants:

- A nonce can be consumed once.
- An active ring can have one binding.
- An active Diamond can have one binding.
- Revoked bindings do not block a future approved binding unless product policy changes.

### Generator and IPFS

The generator creates deterministic collection files. The launch validator compares manifest size against generated image and metadata counts. Pinata automation publishes immutable assets to IPFS.

## Trust boundaries

```text
Untrusted: browser input, wallet-provided strings, request bodies, upstream API payloads
Verified: Zod schemas, normalized addresses, signed proof, current ownership data
Durable: PostgreSQL records and immutable IPFS content
```

## Failure policy

The system fails closed when:

- a proof is malformed, expired or bound to another domain/payload;
- wallet state initialization does not derive the claimed address;
- a public key cannot be resolved;
- TON ownership data is unavailable or inconsistent;
- collection configuration is missing;
- atomic persistence reports a conflict.

## Next architecture milestones

1. Expose the wallet-proof verification endpoint.
2. Issue short-lived authenticated sessions.
3. Expose the binding endpoint through `EnchantmentService`.
4. Add endpoint-level integration tests.
5. Add a web client with TonConnect UI.
6. Add metadata-rendering and enchantment preview jobs.
