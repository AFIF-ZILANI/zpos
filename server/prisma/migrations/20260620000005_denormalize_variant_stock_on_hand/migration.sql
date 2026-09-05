-- Denormalize current stock onto product_variants.
--
-- Current stock was previously derived with a DISTINCT ON (variant_id) over the
-- entire append-only stock_ledgers table on every product list, POS search and
-- stats request. That is an O(all movements ever) scan on the hottest read path
-- in the application. The ledger remains the source of truth for history; this
-- column is maintained inside the same transaction (and under the same
-- per-variant FOR UPDATE lock) as every ledger write.

ALTER TABLE "product_variants"
  ADD COLUMN "stock_on_hand" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the latest ledger entry per variant.
UPDATE "product_variants" pv
SET "stock_on_hand" = ls."balance_after"
FROM (
  SELECT DISTINCT ON (variant_id)
    variant_id,
    balance_after
  FROM "stock_ledgers"
  ORDER BY variant_id, created_at DESC, id DESC
) ls
WHERE ls."variant_id" = pv."id";

-- Supports the "active variants of a product" join used by product listing and
-- stats now that those queries no longer touch stock_ledgers at all.
CREATE INDEX IF NOT EXISTS "product_variants_product_id_is_active_idx"
  ON "product_variants" ("product_id", "is_active");
