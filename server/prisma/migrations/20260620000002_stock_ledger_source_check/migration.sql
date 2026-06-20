-- Enforce the "exactly one source FK per row" invariant on stock_ledgers.
-- A ledger row must originate from at most one of: a sale, a purchase, or an adjustment.
-- Without this, a bug could write two source FKs, silently corrupting the audit trail.

ALTER TABLE "stock_ledgers"
ADD CONSTRAINT "stock_ledger_one_source" CHECK (
    (("sale_id" IS NOT NULL)::int +
     ("purchase_id" IS NOT NULL)::int +
     ("adjustment_id" IS NOT NULL)::int) <= 1
);
