# TonRings Final Setup

After repository automation completes, the project owner performs only the numbered actions below.

1. Create GitHub environments `nft-testnet` and `nft-mainnet`.
2. Add `PINATA_JWT` as an environment secret.
3. Add `TONCENTER_API_KEY` as an environment secret.
4. Add `TON_DIAMONDS_COLLECTION` as an environment variable.
5. Deploy or select a compatible TEP-62 NFT collection on testnet.
6. Add its address as `RING_COLLECTION_ADDRESS`.
7. Add the receiving testnet wallet as `FIRST_NFT_RECIPIENT`.
8. Add the hosted backend URL as repository variable `TONRINGS_API_BASE`.
9. Enable GitHub Pages with GitHub Actions as the source.
10. Deploy the backend and PostgreSQL database.
11. Run database migrations.
12. Run the `Prepare First NFT` workflow with `testnet` selected.
13. Download and inspect the preparation artifact.
14. Connect the collection-owner wallet and approve the transaction.
15. Run post-mint verification.
16. Repeat with the protected `nft-mainnet` environment only after testnet succeeds.

Never add a seed phrase or private key to GitHub, the backend, or repository files.
