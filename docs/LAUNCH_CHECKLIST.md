# Launch Checklist

## Code gate

- [ ] Latest GitHub Actions run is green.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm test` passes with coverage.
- [ ] No production secret is committed.

## Contract and collection gate

- [ ] TON Diamonds collection address confirmed from an authoritative source.
- [ ] TonRings collection deployed.
- [ ] `RING_COLLECTION_ADDRESS` updated.
- [ ] Royalty destination and percentage reviewed.
- [ ] Collection name and artwork do not imply unauthorized affiliation.

## Data gate

- [ ] PostgreSQL is reachable over TLS.
- [ ] Database migration completed once.
- [ ] Nonce uniqueness enforced.
- [ ] Active ring uniqueness enforced.
- [ ] Active Diamond uniqueness enforced.
- [ ] Backup and restore procedure tested.

## Asset gate

- [ ] `npm run generate` completed.
- [ ] `npm run validate:launch` passed.
- [ ] Image count equals manifest size.
- [ ] Metadata count equals manifest size.
- [ ] Assets uploaded to IPFS.
- [ ] Metadata uploaded to IPFS.
- [ ] CIDs recorded outside the deployment environment.
- [ ] Random sample of metadata and images opened successfully.

## API gate

- [ ] `/health` returns HTTP 200.
- [ ] `/ready` returns HTTP 200.
- [ ] `/api/auth/nonce` returns a short-lived nonce.
- [ ] Wallet verification endpoint is implemented and tested.
- [ ] Binding endpoint is implemented and tested.
- [ ] Revocation is restricted to the owning wallet.
- [ ] CORS permits only the production frontend.
- [ ] Rate limits are active behind the production proxy.

## Frontend gate

- [ ] TonConnect manifest is hosted over HTTPS.
- [ ] TonConnect domain exactly matches `TON_PROOF_DOMAIN`.
- [ ] Wallet connect and disconnect work.
- [ ] Ring and Diamond ownership lists load.
- [ ] Enchantment preview clearly states it is non-custodial.
- [ ] Errors do not expose secrets or internal stack traces.

## Announcement gate

- [ ] Independent-project disclaimer is visible.
- [ ] Terms and privacy notice are published.
- [ ] Support channel is monitored.
- [ ] Mint price, supply and royalties are final.
- [ ] No promise is made for unfinished functionality.
- [ ] Emergency pause/maintenance message is prepared.

## Final command

```bash
npm run preflight
```

A launch is approved only when the code gate is green and all required production values are configured. A prelaunch preview may be deployed earlier, but unfinished wallet verification or binding must remain visibly disabled.
