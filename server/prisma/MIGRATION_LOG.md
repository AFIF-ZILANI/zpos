# Migration Log

All 21 legacy migrations were created with the name `_init`. This file records what each one actually changed.

| Timestamp | What Changed |
|-----------|-------------|
| `20260402063921` | Initial schema — Role/PaymentMethod/BarcodeStatus enums, PascalCase tables (User, Product, Category, etc.) |
| `20260405140516` | Drop variant-level `cost_price`/`sale_price`; pricing moved to purchase items; add Size enum |
| `20260405182009` | Move `barcode` off `ProductVariant` → onto `Product`; drop variant SKU/barcode columns |
| `20260405182344` | Make `Product.sku` nullable |
| `20260405190754` | Extract barcode into its own `Barcode` table with `BarcodeStatus`; move barcode off `Product` |
| `20260406142846` | Rename all tables to `snake_case`; add `sale_returns`, `payments`; introduce `SaleStatus` and `PaymentStatus` enums |
| `20260409200847` | Drop `CARD` from `PaymentMethod`; add `purchase.date`; add `Counter` table for invoice sequence |
| `20260412152848` | Add `base_variant_id` to `products`; add `VariantBarcodeAllocation` join table + indexes |
| `20260418075007` | Drop `note` from `variant_barcode_allocations`; add `brand` to `products` |
| `20260422142803` | Drop old `invoice_no` from sales; add `invoiced_at` |
| `20260426172513` | Drop `PENDING` from `PaymentStatus`; normalise to `DUE / PARTIAL / PAID` |
| `20260426172605` | Drop `PaymentStatus` column from sales entirely — status is now computed from `SUM(payments.amount)` at query time |
| `20260426195916` | Add `product_name` / `variant_name` snapshot columns to `sale_items` (price/name at time of sale) |
| `20260426201409` | Add `invoice_number` back to sales as `@unique`; seed `Counter` row for invoice sequence |
| `20260426201443` | Make `sale_items.variant_name` nullable (single-variant products have no variant name) |
| `20260426215801` | Simplify `SaleStatus` to `COMPLETED / VOID` — drop `PARTIALLY_RETURNED` / `FULLY_RETURNED` |
| `20260426220741` | Drop `PaymentStatus` enum entirely; add payment method/date composite indexes |
| `20260427075029` | Add temporary `payment_complete` boolean to `sales` |
| `20260427082108` | Drop `payment_complete`; add `invoiced_at` to sales; add `date` / `invoice_no` to `purchases` |
| `20260429162230` | Drop `sale_returns` table; drop `SALE_RETURN` from `StockMovementType`; drop SKU from variants; add `waived_amount` to sales |
| `20260501190251` | Switch to Clerk auth — drop `password_hash` and `refresh_token` from `users`; add `InviteStatus` enum (`PENDING / ACCEPTED / CANCELLED`) |
| `20260620000001` | Add `clerk_id` column to `users` with unique index |
| `20260620000002` | Add CHECK constraint on `stock_ledgers` — at most one of `sale_id / purchase_id / adjustment_id` may be non-null per row |
| `20260620000003` | Drop orphaned `base_variant_id` column from `products` |
| `20260620000004` | Make `customers.name` NOT NULL with default `'Walk-in Customer'`; add non-unique index on `customers.email` |
