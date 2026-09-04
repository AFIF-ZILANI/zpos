# Pre-Launch Audit (2026-09-05)

Full-app review before publishing. `plan.md` (root) was a prior fix pass — already merged (see git log) — and is not re-litigated here except where it left something incomplete. Findings below are new, verified against the current code, most severe first within each section. Check off as fixed.

---

## Critical — fix before launch

- [ ] **Oversold/double-deducted stock — no row lock on checkout.** `server/src/controllers/sale.controller.ts:358-408`. The `FOR UPDATE` raw-SQL lock on `product_variants`/`stock_ledgers` is commented out (blocked by a Prisma uuid-cast issue noted in the comment) and replaced with a plain `findMany` that takes no lock. Two concurrent sales on the same variant both read the same stale balance, both pass the stock check, both insert — stock can go negative and ledger `balance_after` becomes wrong. **Fix:** restore the `FOR UPDATE` query with explicit `::uuid` casts (`Prisma.join(variantIds.map(id => Prisma.sql\`${id}::uuid\`))`), or take a `SELECT ... FOR UPDATE` inside the same transaction before reading balances.

- [ ] **Any STAFF account can delete all products, categories, and purchases.** `server/src/routes/product.route.ts`, `category.route.ts`, `purchase.route.ts`. Only `admin.route.ts` applies `requireRole("OWNER")`. `requireAuth` + `syncUser` only check the token is valid, not the user's role. A cashier's token (or a stolen one) can call `DELETE /api/products/delete`, `/api/categories/delete`, `/api/purchase/delete` on any id, cascading into stock ledgers, barcodes, and purchase history. **Fix:** add `requireRole("OWNER")` (or a manager tier) in front of destructive/admin-grade routes.

- [ ] **Deleting a sold product erases sale history.** `server/src/controllers/product.controller.ts:114-152` (`deleteById`). Manually deletes `stockLedger`/`purchaseItem`/`saleItem` rows for a product's variants before deleting the product, bypassing the DB's `ON DELETE RESTRICT`. Deleting any product that was ever sold destroys historical `SaleItem` financial records and the append-only stock ledger — the schema's own comment (`schema.prisma:385-388`) says the ledger must never be updated or deleted. **Fix:** block delete (or soft-delete via `is_active`) when the product has any `saleItem`/`stockLedger` rows.

- [ ] **Deleting a purchase can corrupt stock for units already sold.** `server/src/controllers/purchase.controller.ts:246-277` (`deletePurchase`). Hard-deletes `stockLedger` and barcode/allocation rows tied to the purchase with no check whether those units were already sold — same append-only violation as above, and can delete barcodes still referenced by completed sales. **Fix:** disallow deleting a purchase once any of its barcodes are consumed; reverse with a compensating ledger entry instead of deleting rows.

- [ ] **Client-supplied `paidAmount`/`totalAmount` isn't validated against the server-computed total at checkout.** `server/src/controllers/sale.controller.ts:334-336,457-464`. `createSale` only cross-checks `paidAmount` against the client-sent `totalAmount`, not the total it just computed server-side from cart pricing — unlike `createPayment`, which does check `paid > total`. A client can send a mismatched `totalAmount`/`paidAmount` and get a payment record inconsistent with the real sale total. **Fix:** after computing `total` server-side in `createSale`, validate `paidAmount` against it the same way `createPayment` does.

- [ ] **`/admin` is reachable by any signed-in user, not just OWNER.** `client/src/App.tsx:23` (`ProtectedRouter`). Only checks `isSignedIn`; the sidebar links `/admin` for everyone (`client/src/components/Layout.tsx:35`). Combined with the missing server-side role check above, this is a real path to privilege escalation, not just a UI nuisance. **Fix:** gate the client route on role too (defense in depth) — but the server-side `requireRole` fix above is the one that actually matters.

---

## High — fix soon after launch

- [ ] **Percent-based line discounts >100% can make totals negative.** `server/src/controllers/sale.controller.ts:23-32` (`calcLineDiscount`). Fixed discounts are clamped to the line value; percent discounts aren't, and the Zod schema only requires `nonnegative()`. A percent discount over 100 drags `subtotal`/`total` negative. **Fix:** clamp percent discount to `min(amount, 100)`, or clamp the computed line result to `[0, lineGross]`.

- [ ] **`createPayment` isn't transaction-locked — concurrent payments can overpay a sale.** `server/src/controllers/sale.controller.ts:811-869`. The "does this payment exceed the remaining balance" check reads then inserts without a `$transaction` + locking read. Two concurrent payment requests on the same sale can both read the same prior-paid sum, both pass, both insert. **Fix:** wrap in `prisma.$transaction` with a locking read, or add a DB check constraint.

- [ ] **Barcode serial allocation isn't atomic — concurrent purchases can collide.** `server/src/controllers/purchase.controller.ts:106-137`. Serials are computed via `findFirst(orderBy desc)` + increment in JS, unlike the invoice number which uses an atomic counter. Concurrent purchases can compute overlapping serials. **Fix:** use the same atomic-counter pattern used for invoice numbers.

- [ ] **`createCustomer`'s duplicate-phone error is silently discarded.** `server/src/controllers/customer.controller.ts:127-152`. The `sendError` returned from inside the `$transaction` callback is never captured or checked (no `instanceof Response` guard like sibling handlers use) — the handler always falls through to a 201 success response even when no customer was created.

- [ ] **Checkout total/discount is fully client-trusted on the frontend.** `client/src/pages/PointOfSale.tsx:253` (`handleConfirmPayment`). Posts client-computed `totalAmount`/per-line `discount` to `/sales/create`; the discount `max` is HTML-only. Anyone intercepting the request can rewrite these before they hit the API. This is the client side of the same gap as the "Critical" checkout-validation item above — fixing the server-side validation closes this too, but note it here since it's the origin of the untrusted values.

---

## Medium

- [ ] **`deletePurchase` doesn't recompute later stock-ledger running balances.** `server/src/controllers/purchase.controller.ts:301-327`. If any sale/purchase happened after the deleted purchase for the same variant, its recorded `balance_after` values stay permanently wrong.

- [ ] **Manual `c.req.json()` parsing bypasses the shared Zod validation layer** in `admin.controller.ts:94-97` (`cancelInvite` — `id` used unchecked), `category.controller.ts:7-21` (`createCategory`), `product.controller.ts:109-113,293-298` (`deleteById`, `toggleVariantById`), `customer.controller.ts:192-197` (`toggleCustomerStatus`). Malformed input raises generic 500s instead of clean 422s. Not independently exploitable (Prisma still parametrizes queries) but inconsistent with the rest of the app. **Fix:** route these through `validate()` like every other mutation.

- [ ] **Category input crashes on malformed non-string fields.** `server/src/controllers/category.controller.ts:15,19`. `parent_id && typeof parent_id !== "string" && parent_id.trim().length === 0` — if `parent_id`/`description` is a truthy non-string (e.g. a number), `.trim()` throws, returning a 500 instead of a 400. **Fix:** `typeof x === "string" && x.trim() === ""`.

- [ ] **`VITE_API_URL` has no fallback/fail-loud check.** `client/src/lib/api-request.ts:9`. Unlike the Clerk key check in `main.tsx:8`, if this env var is unset on Vercel every request silently targets `"undefined/..."` instead of failing with a clear error at startup.

- [ ] **No error state for failed product fetch on the POS screen.** `client/src/pages/PointOfSale.tsx:180`. A failed fetch (500/CORS/expired token) renders the same "No products found" as a genuinely empty catalog — no toast or retry, so a real outage looks like an empty store.

- [ ] **Customer PII logged to the browser console.** `client/src/components/customers/update-customer-modal.tsx:76`. `console.log(customer)` dumps full name/phone/email/address every time the edit modal opens.

- [ ] **Prisma relations have no explicit `onDelete`.** `server/prisma/schema.prisma` (e.g. `Sale.customer`, `Purchase.supplier`, `StockLedger.sale/purchase/adjustment`). Current behavior only matches intent because the last migration hasn't drifted from the schema; a future `prisma migrate dev` could regenerate different implicit defaults. **Fix:** declare `onDelete` explicitly on every relation.

- [ ] **Client-side security headers were lost when Caddy was removed.** The old `client/Caddyfile` (deleted in the Vercel/Railway migration) set `X-Frame-Options`, `Content-Security-Policy`-adjacent headers, and cache-control (`no-cache` on `index.html`, `immutable` on hashed assets) for the *statically served client*. The server's own `secureHeaders()` middleware (`server/src/app.ts`) still protects API responses, but Vercel now serves the client's `index.html`/assets with **no equivalent headers or cache-control**. **Fix:** add a `headers` array to `vercel.json` replicating those (see snippet below).

---

## Low / polish

- [ ] **Dead `changeRole` handler with a live UI that submits `role`.** `client/src/pages/Admin.tsx:133`. The handler is commented out but the edit-user modal's role dropdown still submits `role` via `handleSaveEdit` — unclear whether role edits work at all. Remove the dead code or wire it up.
- [ ] **Leftover debug `console.log`/`console.error` calls**, non-sensitive but unpolished for launch: `client/src/components/product-model.tsx:72,86`, `client/src/pages/new-purchase.tsx:45`, `Sales.tsx`, `Settings.tsx`, `product-section.tsx:95`, `ProductDetails.tsx:418`. Strip or gate behind `import.meta.env.DEV`.
- [ ] **Invite email is dead code — never actually sent.** `server/src/services/invite.service.ts` (`sendInviteEmail`) and `server/src/lib/emails/invite.ts` are never called from `AdminController.invite`; an invite creates a `PENDING` user row but no email goes out. If/when this gets wired up, note that `invitedBy`/`role` are interpolated into the HTML template unescaped (`invite.ts:16`) — escape them first.
- [ ] **`Purchase.invoice_no` is not unique** (only indexed) in `schema.prisma`, unlike `Sale.invoice_number`. Confirm this is intentional (suppliers reusing their own numbering) rather than an oversight.

---

## Test coverage gaps

No test file exists for these controllers at all — for a money-handling app, the two most severe items above (`createSale`'s stock locking, `deletePurchase`'s destructive cascade) currently have **zero** regression protection:

- [ ] `sale.controller.ts` — `createSale` (checkout/payment/stock-locking transaction) untested; `sales.test.ts` only covers `createPayment`, chart, stats, and list.
- [ ] `purchase.controller.ts` — no test file at all (`createPurchase`, `deletePurchase`, overview stats, history).
- [ ] `category.controller.ts` — no test file at all (create/update/delete, including parent/children cascade).
- [ ] `admin.controller.ts` — no test file at all (invite, role update, deactivate, cancel-invite — all access-control-sensitive).
- [ ] `product.controller.ts` — has a test file, but the `deleteById` success path (the cascading delete) is untested — only the 422 case is covered.

---

## Deployment checklist (Vercel + Railway split)

Not bugs, but must be set correctly before the split-origin deploy works:

- [ ] **Vercel env vars:** `VITE_API_URL` (Railway server URL + `/api`), `VITE_CLERK_PUBLISHABLE_KEY`.
- [ ] **Railway env vars:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`, `ALLOWED_ORIGINS` (must exactly match the Vercel domain — `hono/cors` needs an exact origin match, not a wildcard, since `credentials: true` is set in production).
- [ ] **`vercel.json` headers** — add the security headers/cache-control that Caddy used to provide (see Medium section above):
  ```json
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]},
    { "source": "/index.html", "headers": [
      { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
    ]},
    { "source": "/assets/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]}
  ]
  ```
- [ ] **Rotate the secrets** that were briefly committed locally before the push-protection block (Resend API key, Clerk secret key) — see prior session note; low risk since they never reached GitHub, but cheap to rotate.

---

## How this was produced

Four parallel focused reviews (server security/authz, server business-logic correctness, client app, DB schema + test coverage) against the current code state — not a diff review. The two most severe claims (missing row lock, missing role checks) were independently spot-checked by reading the actual source before being included here.
