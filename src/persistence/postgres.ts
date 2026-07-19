import { createHash, randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type {
  CreateEnchantmentResult,
  EnchantmentRepository,
} from '../enchantment/service.js';
import type { EnchantmentRecord } from '../enchantment/schema.js';

interface DatabaseError {
  code?: string;
  constraint_name?: string;
}

function conflictFromError(error: unknown): CreateEnchantmentResult | null {
  if (!error || typeof error !== 'object') return null;
  const dbError = error as DatabaseError;
  if (dbError.code !== '23505') return null;

  switch (dbError.constraint_name) {
    case 'enchantments_nonce_key':
      return 'nonce_exists';
    case 'enchantments_one_active_ring':
      return 'ring_exists';
    case 'enchantments_one_active_diamond':
      return 'diamond_exists';
    default:
      return null;
  }
}

export class PostgresStore implements EnchantmentRepository {
  readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  async close(): Promise<void> {
    await this.sql.end();
  }

  async issueNonce(ttlSeconds = 300): Promise<{ nonce: string; expiresAt: string }> {
    const nonce = randomUUID();
    const [row] = await this.sql<{ expires_at: Date }[]>`
      INSERT INTO auth_nonces (nonce, expires_at)
      VALUES (${nonce}, NOW() + (${ttlSeconds} * INTERVAL '1 second'))
      RETURNING expires_at`;
    if (!row) throw new Error('nonce insert failed');
    return { nonce, expiresAt: row.expires_at.toISOString() };
  }

  async consumeNonce(nonce: string, walletAddress: string): Promise<boolean> {
    const rows = await this.sql`
      UPDATE auth_nonces
      SET consumed_at = NOW(), wallet_address = ${walletAddress}
      WHERE nonce = ${nonce} AND consumed_at IS NULL AND expires_at > NOW()
      RETURNING nonce`;
    return rows.length === 1;
  }

  async createSession(walletAddress: string, token: string, ttlSeconds = 86_400): Promise<string> {
    const id = randomUUID();
    const hash = createHash('sha256').update(token).digest('hex');
    await this.sql`
      INSERT INTO wallet_sessions (id, wallet_address, token_hash, expires_at)
      VALUES (${id}, ${walletAddress}, ${hash}, NOW() + (${ttlSeconds} * INTERVAL '1 second'))`;
    return id;
  }

  async sessionWallet(token: string): Promise<string | null> {
    const hash = createHash('sha256').update(token).digest('hex');
    const [row] = await this.sql<{ wallet_address: string }[]>`
      SELECT wallet_address FROM wallet_sessions
      WHERE token_hash = ${hash} AND revoked_at IS NULL AND expires_at > NOW()`;
    return row?.wallet_address ?? null;
  }

  async create(record: EnchantmentRecord): Promise<CreateEnchantmentResult> {
    try {
      await this.sql.begin(async transaction => {
        await transaction`SELECT pg_advisory_xact_lock(hashtext(${record.ringAddress}))`;
        await transaction`SELECT pg_advisory_xact_lock(hashtext(${record.diamondAddress}))`;
        await transaction`
          INSERT INTO enchantments
            (id, ring_address, ring_index, diamond_address, diamond_index,
             owner_address, collection_address, signature, nonce, issued_at,
             expires_at, status, created_at)
          VALUES
            (${record.id}, ${record.ringAddress}, ${record.ringIndex},
             ${record.diamondAddress}, ${record.diamondIndex}, ${record.ownerAddress},
             ${record.collectionAddress}, ${record.signature}, ${record.nonce},
             ${record.issuedAt}, ${record.expiresAt}, ${record.status}, ${record.createdAt})`;
      });
      return 'created';
    } catch (error) {
      const conflict = conflictFromError(error);
      if (conflict) return conflict;
      throw error;
    }
  }

  async findActiveByRing(ringAddress: string): Promise<EnchantmentRecord | null> {
    const [row] = await this.sql<Record<string, unknown>[]>`
      SELECT * FROM enchantments
      WHERE ring_address = ${ringAddress} AND status = 'active'
      LIMIT 1`;
    return row ? this.mapRecord(row) : null;
  }

  async findActiveByDiamond(diamondAddress: string): Promise<EnchantmentRecord | null> {
    const [row] = await this.sql<Record<string, unknown>[]>`
      SELECT * FROM enchantments
      WHERE diamond_address = ${diamondAddress} AND status = 'active'
      LIMIT 1`;
    return row ? this.mapRecord(row) : null;
  }

  async revoke(id: string, ownerAddress: string): Promise<boolean> {
    const rows = await this.sql`
      UPDATE enchantments SET status = 'revoked', revoked_at = NOW()
      WHERE id = ${id} AND owner_address = ${ownerAddress} AND status = 'active'
      RETURNING id`;
    return rows.length === 1;
  }

  private mapRecord(row: Record<string, unknown>): EnchantmentRecord {
    return {
      id: String(row.id),
      ringAddress: String(row.ring_address),
      ringIndex: Number(row.ring_index),
      diamondAddress: String(row.diamond_address),
      diamondIndex: Number(row.diamond_index),
      ownerAddress: String(row.owner_address),
      nonce: String(row.nonce),
      collectionAddress: String(row.collection_address),
      signature: String(row.signature),
      createdAt: new Date(String(row.created_at)).toISOString(),
      status: String(row.status) as EnchantmentRecord['status'],
      issuedAt: Number(row.issued_at),
      expiresAt: Number(row.expires_at),
    };
  }
}
