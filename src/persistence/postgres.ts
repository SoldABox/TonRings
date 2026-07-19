import { createHash, randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type { EnchantmentRecord } from '../enchantment/schema.js';

export class PostgresStore {
  readonly sql: Sql;
  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  }

  async close(): Promise<void> { await this.sql.end(); }

  async issueNonce(ttlSeconds = 300): Promise<{ nonce: string; expiresAt: string }> {
    const nonce = randomUUID();
    const [row] = await this.sql<{ expires_at: Date }[]>`
      INSERT INTO auth_nonces (nonce, expires_at)
      VALUES (${nonce}, NOW() + (${ttlSeconds} * INTERVAL '1 second')) RETURNING expires_at`;
    if (!row) throw new Error('nonce insert failed');
    return { nonce, expiresAt: row.expires_at.toISOString() };
  }

  async consumeNonce(nonce: string, walletAddress: string): Promise<boolean> {
    const rows = await this.sql`
      UPDATE auth_nonces SET consumed_at = NOW(), wallet_address = ${walletAddress}
      WHERE nonce = ${nonce} AND consumed_at IS NULL AND expires_at > NOW() RETURNING nonce`;
    return rows.length === 1;
  }

  async hasNonce(nonce: string): Promise<boolean> {
    const [row] = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM enchantments WHERE nonce = ${nonce}) AS exists`;
    return row?.exists ?? false;
  }

  async createSession(walletAddress: string, token: string, ttlSeconds = 86400): Promise<string> {
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

  async hasActiveRingBinding(ringAddress: string): Promise<boolean> {
    return (await this.findActiveByRing(ringAddress)) !== null;
  }

  async hasActiveDiamondBinding(diamondAddress: string): Promise<boolean> {
    return (await this.findActiveByDiamond(diamondAddress)) !== null;
  }

  async save(record: EnchantmentRecord): Promise<void> { await this.saveEnchantment(record); }

  async saveEnchantment(record: EnchantmentRecord): Promise<void> {
    await this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${record.ringAddress}))`;
      await tx`SELECT pg_advisory_xact_lock(hashtext(${record.diamondAddress}))`;
      await tx`
        INSERT INTO enchantments
          (id, ring_address, ring_index, diamond_address, diamond_index, owner_address, signature, nonce,
           issued_at, expires_at, status, created_at)
        VALUES
          (${record.id}, ${record.ringAddress}, ${record.ringIndex}, ${record.diamondAddress}, ${record.diamondIndex},
           ${record.ownerAddress}, ${record.signature}, ${record.nonce}, ${record.issuedAt}, ${record.expiresAt},
           ${record.status}, ${record.createdAt})`;
    });
  }

  async findActiveByRing(ringAddress: string): Promise<EnchantmentRecord | null> {
    const [row] = await this.sql<Record<string, unknown>[]>`
      SELECT * FROM enchantments WHERE ring_address = ${ringAddress} AND status = 'active' LIMIT 1`;
    return row ? this.mapRecord(row) : null;
  }

  async findActiveByDiamond(diamondAddress: string): Promise<EnchantmentRecord | null> {
    const [row] = await this.sql<Record<string, unknown>[]>`
      SELECT * FROM enchantments WHERE diamond_address = ${diamondAddress} AND status = 'active' LIMIT 1`;
    return row ? this.mapRecord(row) : null;
  }

  async revoke(id: string, ownerAddress: string): Promise<boolean> {
    const rows = await this.sql`
      UPDATE enchantments SET status = 'revoked', revoked_at = NOW()
      WHERE id = ${id} AND owner_address = ${ownerAddress} AND status = 'active' RETURNING id`;
    return rows.length === 1;
  }

  private mapRecord(row: Record<string, unknown>): EnchantmentRecord {
    return {
      id: String(row.id), ringAddress: String(row.ring_address), ringIndex: Number(row.ring_index),
      diamondAddress: String(row.diamond_address), diamondIndex: Number(row.diamond_index),
      ownerAddress: String(row.owner_address), nonce: String(row.nonce),
      collectionAddress: process.env.TON_DIAMONDS_COLLECTION as EnchantmentRecord['collectionAddress'],
      signature: String(row.signature), createdAt: new Date(String(row.created_at)).toISOString(),
      status: String(row.status) as EnchantmentRecord['status'],
      issuedAt: Number(row.issued_at), expiresAt: Number(row.expires_at),
    };
  }
}
