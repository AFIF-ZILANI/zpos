-- Add clerk_id to users for Clerk → DB user mapping
-- This links each row to the Clerk identity without depending on email matching.

ALTER TABLE "users" ADD COLUMN "clerk_id" TEXT;

CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");
CREATE INDEX "users_clerk_id_idx" ON "users"("clerk_id");
