-- Remove orphaned base_variant_id from products.
-- This field had no @relation, no FK constraint, and was never read or written
-- by any controller or service. Removing it cleans up the schema.

ALTER TABLE "products" DROP COLUMN IF EXISTS "base_variant_id";
