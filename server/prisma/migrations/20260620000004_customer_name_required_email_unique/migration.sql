-- Make customer name required with a safe default for any existing null rows.
-- Add a non-unique index on email for search performance.
-- Phone remains the primary deduplication key (already unique).

-- 1. Back-fill any null names before making the column NOT NULL
UPDATE "customers" SET "name" = 'Walk-in Customer' WHERE "name" IS NULL;

-- 2. Make name NOT NULL with a default
ALTER TABLE "customers"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "name" SET DEFAULT 'Walk-in Customer';

-- 3. Add index on email for search performance (non-unique — phone is the dedup key)
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");
