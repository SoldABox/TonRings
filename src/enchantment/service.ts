import { randomUUID } from 'node:crypto';
import { assertFreshRequest, buildEnchantmentMessage } from './message.js';
import {
  EnchantmentRequestSchema,
  TON_DIAMONDS_COLLECTION,
  type EnchantmentRecord,
  type EnchantmentRequest,
} from './schema.js';
import {
  verifyDiamondOwnership,
  verifyRingOwnership,
  type NftOwnershipProvider,
} from './ownership.js';

export interface SignatureVerifier {
  verify(input: {
    ownerAddress: string;
    message: string;
    signature: string;
  }): Promise<boolean>;
}

export type CreateEnchantmentResult =
  | 'created'
  | 'nonce_exists'
  | 'ring_exists'
  | 'diamond_exists';

export interface EnchantmentRepository {
  /**
   * Persists the record atomically. Implementations must enforce unique active
   * bindings for nonce, ringAddress and diamondAddress in the same transaction.
   */
  create(record: EnchantmentRecord): Promise<CreateEnchantmentResult>;
}

export interface BindInput {
  request: EnchantmentRequest;
  signature: string;
}

function throwCreateConflict(result: Exclude<CreateEnchantmentResult, 'created'>): never {
  switch (result) {
    case 'nonce_exists':
      throw new Error('nonce already used');
    case 'ring_exists':
      throw new Error('ring already enchanted');
    case 'diamond_exists':
      throw new Error('diamond already bound');
  }
}

export class EnchantmentService {
  constructor(
    private readonly ownership: NftOwnershipProvider,
    private readonly signatures: SignatureVerifier,
    private readonly repository: EnchantmentRepository,
    private readonly ringCollectionAddress: string,
  ) {}

  async bind(input: BindInput): Promise<EnchantmentRecord> {
    const request = EnchantmentRequestSchema.parse(input.request);
    assertFreshRequest(request);

    const [ownsRing, ownsDiamond] = await Promise.all([
      verifyRingOwnership(
        this.ownership,
        request.ringAddress,
        request.ringIndex,
        request.ownerAddress,
        this.ringCollectionAddress,
      ),
      verifyDiamondOwnership(
        this.ownership,
        request.diamondAddress,
        request.diamondIndex,
        request.ownerAddress,
      ),
    ]);

    if (!ownsRing) throw new Error('ring ownership verification failed');
    if (!ownsDiamond) throw new Error('diamond ownership verification failed');

    const message = buildEnchantmentMessage(request);
    const signatureValid = await this.signatures.verify({
      ownerAddress: request.ownerAddress,
      message,
      signature: input.signature,
    });
    if (!signatureValid) throw new Error('signature verification failed');

    const record: EnchantmentRecord = {
      ...request,
      id: randomUUID(),
      collectionAddress: TON_DIAMONDS_COLLECTION,
      signature: input.signature,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    const result = await this.repository.create(record);
    if (result !== 'created') throwCreateConflict(result);

    return record;
  }
}
