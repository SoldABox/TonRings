# First TonRings NFT

TonRings can prepare and verify a standards-compatible single-item mint for a collection contract that follows the TON reference NFT collection message layout.

## Important boundary

The repository does not deploy a collection contract automatically and never reads a wallet seed phrase. The irreversible transaction must be reviewed and approved by the collection-owner wallet.

The reference mint body used here is:

```text
deploy_nft#00000001
query_id:uint64
item_index:uint64
amount:Coins
content:^Cell
```

The referenced content cell stores the recipient address and the individual metadata key such as `0.json`.

## Before minting

Complete these steps in order:

1. Generate and review the collection.
2. Upload images and metadata to IPFS.
3. Deploy a TEP-62-compatible collection contract whose owner is your wallet.
4. Configure that collection's common metadata prefix to the uploaded metadata base.
5. Fund the collection-owner wallet with testnet TON.
6. Prepare NFT #0 as an unsigned TonConnect transaction.
7. Review and approve it in the owner wallet.
8. Verify the deployed item owner, collection, and index.

Start on testnet. Mainnet transactions are irreversible.

## Generate and upload assets

```bash
npm run generate
npm run validate:launch
npm run upload:ipfs
```

The IPFS upload writes:

```text
generated/ipfs.json
```

and replaces image placeholders in every metadata record.

## Check readiness

Set only local environment values; never commit them:

```bash
export RING_COLLECTION_ADDRESS="<DEPLOYED_COLLECTION_ADDRESS>"
export FIRST_NFT_RECIPIENT="<RECIPIENT_WALLET>"
export TONCENTER_API_KEY="<TONCENTER_KEY>"
npm run mint:readiness
```

The command returns a percentage and every remaining blocker. It only returns success at 100%.

## Prepare NFT #0 on testnet

```bash
npm run mint:prepare:first -- \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --index 0 \
  --network testnet
```

Output:

```text
generated/first-mint-tonconnect.json
```

This file contains an unsigned TonConnect transaction request. It does not contain a private key, seed phrase, or signature.

Review all fields before wallet approval:

- network must be testnet (`-3`) for the first trial;
- destination must be the deployed collection contract;
- recipient must be the intended first owner;
- item index must equal the collection's next item index;
- metadata key must be `0.json`;
- attached value must be acceptable for the deployed contract.

## Mainnet preparation guard

Mainnet output requires an explicit acknowledgement:

```bash
npm run mint:prepare:first -- \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --index 0 \
  --network mainnet \
  --confirm-mainnet I_UNDERSTAND
```

This still produces only an unsigned request. The wallet owner must approve it.

## Verify after approval

After the transaction succeeds, obtain the NFT item address from the collection or explorer and run:

```bash
npm run mint:verify:first -- \
  --item "<NFT_ITEM_ADDRESS>" \
  --collection "$RING_COLLECTION_ADDRESS" \
  --recipient "$FIRST_NFT_RECIPIENT" \
  --index 0
```

Verification checks:

- exact item address returned by TON Center;
- exact collection address;
- exact current owner;
- exact NFT index.

## When NFT #0 is considered sent

NFT #0 is sent only after all of the following are true:

- the collection deployment transaction succeeded;
- the collection reports index `0` as deployed;
- the NFT item contract is active;
- the item reports the intended recipient as owner;
- the item reports the expected collection and index;
- the metadata resolves from IPFS.

Preparing JSON or generating artwork is not minting. A wallet-approved on-chain transaction is required.
