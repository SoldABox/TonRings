import { TON_DIAMONDS_COLLECTION } from './schema.js';

export interface NftSnapshot {
  address: string;
  index: number;
  ownerAddress: string;
  collectionAddress: string;
}

export interface NftOwnershipProvider {
  getNft(address: string): Promise<NftSnapshot | null>;
}

export async function verifyDiamondOwnership(
  provider: NftOwnershipProvider,
  diamondAddress: string,
  expectedIndex: number,
  expectedOwner: string,
): Promise<boolean> {
  const nft = await provider.getNft(diamondAddress);
  return Boolean(
    nft &&
      nft.address === diamondAddress &&
      nft.index === expectedIndex &&
      nft.ownerAddress === expectedOwner &&
      nft.collectionAddress === TON_DIAMONDS_COLLECTION,
  );
}

export async function verifyRingOwnership(
  provider: NftOwnershipProvider,
  ringAddress: string,
  expectedIndex: number,
  expectedOwner: string,
  expectedCollectionAddress: string,
): Promise<boolean> {
  const nft = await provider.getNft(ringAddress);
  return Boolean(
    nft &&
      nft.address === ringAddress &&
      nft.index === expectedIndex &&
      nft.ownerAddress === expectedOwner &&
      nft.collectionAddress === expectedCollectionAddress,
  );
}
