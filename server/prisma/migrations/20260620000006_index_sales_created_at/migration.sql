-- The dashboard filters sales by created_at (not the indexed invoiced_at),
-- always combined with a status predicate. Six dashboard endpoints were each
-- doing a sequential scan of the whole sales table per page load.

CREATE INDEX IF NOT EXISTS "sales_created_at_idx"
  ON "sales" ("created_at");

CREATE INDEX IF NOT EXISTS "sales_status_created_at_idx"
  ON "sales" ("status", "created_at");
