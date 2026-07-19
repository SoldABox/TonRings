BEGIN;

ALTER TABLE enchantments
  ADD COLUMN IF NOT EXISTS collection_address TEXT;

UPDATE enchantments
SET collection_address = COALESCE(
  collection_address,
  NULLIF(current_setting('app.ton_diamonds_collection', true), '')
)
WHERE collection_address IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM enchantments WHERE collection_address IS NULL) THEN
    RAISE EXCEPTION 'Existing enchantments require collection_address backfill';
  END IF;
END $$;

ALTER TABLE enchantments
  ALTER COLUMN collection_address SET NOT NULL;

COMMIT;
