# First TonRings NFT

TonRings prepares and verifies a standards-compatible single-item mint for a collection contract that follows the TON reference NFT collection message layout.

## Security boundary

The repository never reads a wallet seed phrase or private key. It prepares an unsigned TonConnect request; the collection-owner wallet must review and approve the irreversible transaction.

The reference mint body is:

```text
deploy_nft#00000001
query_id:uint64
item_index:uint64
amount:Coins
content:^Cell
```

The referenced content cell stores the recipient address and the individual metadata key, such as `0.json`.

## Required external inputs

1. A deployed TEP-62-compatible collection contract owned by your wallet.
2. Final collection and item metadata uploaded to IPFS.
3. A funded testnet owner wallet.
4. The intended recipient wallet.
5. A TON Center API credential for reliable verification.

Start on testnet. Mainnet transactions are irreversible.

## Generate and upload assets

```bash
npm run generate
npm run validate:launch
npm run upload:ipfs
```

The upload writes `generated/ipfs.json` and replaces every image CID placeholder.

## Configure the testnet launch

Keep these values local and never commit secrets:

```bash
export MINT_NETWORK="testnet"
export TONCENTER_BASE_URL="https://testnet.toncenter.com/api/v3"
export TONCENTER_API_KEY="<TONCENTER_KEY>"
export RING_COLLECTION_ADDRESS="<DEPLOYED_TESTNET_COLLECTION>"
export FIRST_NFT_RECIPIENT="<TESTNET_RECIPIENT_WALLET>"
```

## Readiness gate

```bash
npm run mint:readiness
```

The gate now calls the deployed collection's `get_collection_data` method. It checks that:

- the collection contract is reachable;
- it supports sequential indexes;
- its on-chain `next_item_index` is exactly `0` for the first NFT;
- NFT #0 artwork and metadata exist;
- metadata contains final IPFS URIs;
- the recipient and collection addresses are valid;
- the verification credential is configured;
- the unsigned transaction has been generated.

It returns success only when every check passes.

## Prepare NFT #0 on testnet

```bash
npm run mint:prepare:first -- \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --network testnet
```

Do not guess or manually force index `0`. The command reads the live on-chain `next_item_index` and uses it. Supplying `--index` is optional and acts only as an assertion; preparation fails if it differs from the chain.

Output:

```text
generated/first-mint-tonconnect.json
```

The output records:

- the verified collection address;
- the live next item index;
- the network;
- the recipient;
- the resolved metadata URI;
- the unsigned TonConnect transaction.

Before approval, verify that the destination is the collection contract, the network is testnet (`-3`), the recipient is correct, and the on-chain index is `0`.

## Mainnet guard

After a successful testnet mint and verification:

```bash
export MINT_NETWORK="mainnet"
export TONCENTER_BASE_URL="https://toncenter.com/api/v3"

npm run mint:prepare:first -- \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --network mainnet \
  --confirm-mainnet I_UNDERSTAND
```

This still creates only an unsigned request. The wallet owner must approve it.

## Verify after wallet approval

After the item appears on-chain, obtain its item address and run:

```bash
npm run mint:verify:first -- \
  --item "<NFT_ITEM_ADDRESS>" \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --index 0
```

Verification checks the exact item address, collection, current owner, and index.

## Definition of complete

NFT #0 is considered sent only when:

- the collection transaction succeeds;
- `get_collection_data` advances from index `0` to `1`;
- the item contract is active;
- the item reports the intended recipient as owner;
- the item reports the expected collection and index;
- the item metadata resolves from IPFS.

Generated artwork or transaction JSON alone is not a mint. A wallet-approved on-chain transaction is required.
