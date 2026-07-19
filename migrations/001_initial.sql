BEGIN;

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce UUID PRIMARY KEY,
  wallet_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_sessions (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enchantments (
  id UUID PRIMARY KEY,
  ring_address TEXT NOT NULL,
  ring_index BIGINT NOT NULL,
  diamond_address TEXT NOT NULL,
  diamond_index BIGINT NOT NULL,
  owner_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  nonce UUID NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS enchantments_one_active_ring
  ON enchantments (ring_address) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS enchantments_one_active_diamond
  ON enchantments (diamond_address) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS enchantments_owner_idx ON enchantments (owner_address);
CREATE INDEX IF NOT EXISTS auth_nonces_expiry_idx ON auth_nonces (expires_at);
CREATE INDEX IF NOT EXISTS wallet_sessions_expiry_idx ON wallet_sessions (expires_at);

COMMIT;
