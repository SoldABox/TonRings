# TonRings Owner Checklist

1. Create protected GitHub environments named `nft-testnet` and `nft-mainnet`.
2. Add the Pinata API credential under the name `PINATA_JWT`.
3. Add the TON Center API credential under the name `TONCENTER_API_KEY`.
4. Add the verified TON Diamonds collection address as `TON_DIAMONDS_COLLECTION`.
5. Add the deployed ring collection address as `RING_COLLECTION_ADDRESS`.
6. Add the first recipient wallet as `FIRST_NFT_RECIPIENT`.
7. Add the public HTTPS backend origin as `TONRINGS_API_BASE`.
8. Enable GitHub Pages and choose GitHub Actions as the source.
9. Deploy PostgreSQL and the backend using `.env.example`.
10. Run the production database migrations.
11. Run `Setup Doctor` for `nft-testnet` and resolve each missing item.
12. Run `Prepare First NFT` for testnet.
13. Download and review the generated artifact.
14. Approve the reviewed transaction in the collection-owner wallet.
15. Verify NFT #0 on-chain.
16. Repeat for mainnet only after testnet succeeds.

Do not store wallet recovery credentials in GitHub or the backend.
