import { Address } from '@ton/core';

export interface NftSnapshot {
  address: string;
  index: number;
  ownerAddress: string;
  collectionAddress: string;
}

export interface NftOwnershipProvider {
  getNft(address: string): Promise<NftSnapshot | null>;
}

export function sameAddress(left: string, right: string): boolean {
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return false;
  }
}

export async function verifyDiamondOwnership(
  provider: NftOwnershipProvider,
  diamondAddress: string,
  expectedIndex: number,
  expectedOwner: string,
  expectedCollectionAddress: string,
): Promise<boolean> {
  const nft = await provider.getNft(diamondAddress);
  return Boolean(
    nft &&
      sameAddress(nft.address, diamondAddress) &&
      nft.index === expectedIndex &&
      sameAddress(nft.ownerAddress, expectedOwner) &&
      sameAddress(nft.collectionAddress, expectedCollectionAddress),
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
      sameAddress(nft.address, ringAddress) &&
      nft.index === expectedIndex &&
      sameAddress(nft.ownerAddress, expectedOwner) &&
      sameAddress(nft.collectionAddress, expectedCollectionAddress),
  );
}
