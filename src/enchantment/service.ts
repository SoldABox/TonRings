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

export interface EnchantmentRepository {
  hasNonce(nonce: string): Promise<boolean>;
  hasActiveRingBinding(ringAddress: string): Promise<boolean>;
  hasActiveDiamondBinding(diamondAddress: string): Promise<boolean>;
  save(record: EnchantmentRecord): Promise<void>;
}

export interface BindInput {
  request: EnchantmentRequest;
  signature: string;
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

    if (await this.repository.hasNonce(request.nonce)) {
      throw new Error('nonce already used');
    }
    if (await this.repository.hasActiveRingBinding(request.ringAddress)) {
      throw new Error('ring already enchanted');
    }
    if (await this.repository.hasActiveDiamondBinding(request.diamondAddress)) {
      throw new Error('diamond already bound');
    }

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

    await this.repository.save(record);
    return record;
  }
}
