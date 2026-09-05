# ZPOS Fix and Verification Plan

> Living implementation plan for the POS application. Update a checkbox only
> after the referenced code, tests, and verification command have been run.

## Goal

Keep the PostgreSQL/Prisma database, Hono/Bun API, and React/Vite client
correct, secure, and consistent with Clerk authentication.

## Rules

- Work on a feature branch; do not commit directly to `main`.
- Never rewrite or rename an applied Prisma migration. Add a new descriptive
  migration for every schema change.
- Never drop production data without a reviewed backup, migration guard, and
  rollback or recovery procedure.
- Keep monetary values as Prisma `Decimal` and PostgreSQL `Decimal(10,2)`.
- Read the client API base URL from `VITE_API_URL`; never hardcode a deployed
  server URL.
- Keep Clerk as the only authentication provider.
- Do not log tokens, customer data, payment data, or full request/response
  objects.
- Prefer focused tests before manual verification. Run the relevant test suite
  after each task and the full validation commands before release.

## Current Repository Baseline

Verified from the repository on 2026-09-05:

- Clerk user mapping and the first four database follow-up migrations are
  already present. See `server/prisma/MIGRATION_LOG.md`.
- The server already has rate limiting, security headers, CSRF protection,
  compression, and request timeouts in `server/src/app.ts`.
- Shared React Query configuration already exists in
  `client/src/lib/query-client.ts`.
- An application-level React error boundary already exists and is mounted in
  `client/src/App.tsx`.
- `getChartData` is implemented at `GET /api/sales/get/chart` and has tests.
- Payment creation is transactional, locks the sale row, and has regression
  tests proving it does not update `discount_amount`.
- `server/package.json` already contains `hono-rate-limiter`; do not add it a
  second time.

The items below are therefore a verification backlog, not instructions to
recreate completed work.

## Phase 1: Database and Authentication

### Task 1: Verify Clerk user synchronization

Status: [x] Implemented; verify against the deployed database.

Files:

- `server/prisma/schema.prisma`
- `server/src/middleware/authSyncUser.middleware.ts`
- `server/prisma/seed.ts`

Checks:

```bash
cd server && bunx prisma validate
cd server && bun test src/__tests__/**/*.test.ts
```

Confirm that `clerk_id` is unique, user synchronization keys by Clerk ID,
and seed data contains no removed `password_hash` or `refresh_token` fields.
Do not use a fabricated placeholder email that can collide with another user.

### Task 2: Verify the stock-ledger source constraint

Status: [x] Migration recorded; verify the invariant matches the domain rule.

The current migration enforces at most one of `sale_id`, `purchase_id`, and
`adjustment_id`. If every ledger row must have a source, add a separate
`IS NOT NULL` condition in a reviewed migration; do not silently change the
existing constraint.

Checks:

```bash
cd server && bunx prisma migrate status
cd server && bun test src/__tests__/**/*.test.ts
```

Add a database-level test or integration check that rejects two source IDs in
one row and accepts every valid source type.

### Task 3: Verify removal of orphaned product data

Status: [x] Migration recorded; verify schema/client consistency.

Confirm that `base_variant_id` is absent from the Prisma model and generated
queries, then run:

```bash
cd server && bunx prisma validate
cd server && bunx prisma generate
```

### Task 4: Verify customer constraints

Status: [x] Migration recorded; verify existing data and API behavior.

`customers.name` is required and customer email has a non-unique index in the
current migration log. Do not add a unique email constraint without first
deciding how shared household or business emails should behave and checking
duplicates in production.

Add tests for a missing name, a walk-in customer, duplicate phone handling,
and nullable email handling.

### Task 5: Remove obsolete local-auth remnants

Status: [ ] Audit required.

Search only for live references before deleting anything:

```bash
rg -n "auth\.controller|auth\.route|password_hash|refresh_token|jsonwebtoken|bcrypt" server client packages
```

Remove a file or dependency only when no route, test, import, or deployment
script still needs it. Then run `bun run --filter server build` and the server
tests. Do not remove Clerk middleware or Clerk environment variables.

## Phase 2: Backend Correctness and Security

### Task 6: Complete payment regression coverage

Status: [x] Critical corruption bug fixed; improve edge-case coverage.

The endpoint is `POST /api/sales/payment/create`, not `/api/sales/payment`.
Keep the row lock and transaction. Add tests for duplicate/concurrent
payments, exact-total payment, decimal amounts, and a missing sale. Verify
that `discount_amount` remains unchanged and that the response status/message
matches the API contract.

```bash
cd server && bun test src/__tests__/api/sales.test.ts
```

### Task 7: Verify API URL configuration

Status: [x] Guard present; verify environment files and deployment settings.

The client must use `import.meta.env.VITE_API_URL`. Keep secrets out of the
client and commit only a non-secret example file. The value must include the
`/api` path exactly once.

```bash
cd client && bun run build
```

Test one local request and one deployed request to ensure no doubled `/api`
path and no localhost fallback.

### Task 8: Validate required server configuration

Status: [ ] Audit required.

Validate required variables at startup without leaking their values. Prefer a
typed configuration parser that returns a clear error; avoid importing a
module solely for an incidental `process.exit`, because that makes tests and
library imports difficult. Cover `DATABASE_URL`, Clerk secret configuration,
allowed origins, and production mode with tests or a documented smoke check.

### Task 9: Maintain chart endpoint contract

Status: [x] Implemented and tested.

The SQL must aggregate payments per sale before deriving `PAID`, `DUE`, or
`PARTIAL`; joining payments directly into the final grouping over-counts sales.
The API response currently contains `{ data, total }` with chart items shaped
as `{ name, value, fill }`. Keep the client and tests aligned with that shape
and route: `GET /api/sales/get/chart`.

### Task 10: Remove sensitive production logging

Status: [ ] Audit required.

```bash
rg -n "console\.log|console\.debug|console\.dir" server/src/controllers server/src/services
```

Remove or replace logs that contain PII, payment data, tokens, or full ORM
objects. Preserve actionable structured error logging where needed, with
redaction. Re-run the search and server tests.

### Task 11: Review rate-limit trust boundaries

Status: [x] Middleware exists; verify production configuration.

The current limiter supports `RATE_LIMIT_PER_MINUTE` and separates
authenticated sessions from unauthenticated IP traffic. Confirm the reverse
proxy supplies a trusted client IP before using `x-forwarded-for`; otherwise
an attacker can spoof it. Add endpoint-specific limits for payment/admin
operations only if measured traffic requires them.

### Task 12: Verify global error responses

Status: [ ] Audit required.

Confirm `AppError`, `HTTPException`, validation errors, and unknown errors all
produce the documented JSON shape. Production responses must not include
stack traces, SQL, tokens, or internal file paths. Add a test route only in
development or test code; never ship a permanent throw-test endpoint.

### Task 13: Remove dead utility work

Status: [ ] Audit required.

Do not extract `parseCookie` merely because it existed in removed local-auth
code. Search for current consumers first; delete unused code instead of
creating an unused utility.

### Task 14: Clarify invoice numbering

Status: [ ] Decision required.

The current counter is global while the displayed number contains the year.
Choose one documented invariant:

- Global sequence: keep the counter key stable and document that numbers do
  not reset each year; or
- Per-year sequence: use a year-keyed counter and add a migration plus a
  concurrency test.

Do not change padding or presentation alone and call that a yearly reset.
Verify uniqueness under concurrent sale creation.

## Phase 3: Frontend Behavior

### Task 15: Finish mutation invalidation

Status: [ ] Audit required.

`queryClient` is already centralized, but mutation hooks currently need a
consistent invalidation strategy. Prefer endpoint-to-query-key mappings or
explicit invalidation at each mutation call site. Do not invalidate every
query after every mutation. Add a focused test or a manual flow for product,
category, customer, purchase, sale, and payment mutations.

```bash
cd client && bun run build
cd client && bun run lint
```

### Task 16: Verify POS scan callback dependencies

Status: [ ] Audit required.

Inspect `handleScan` in `client/src/pages/PointOfSale.tsx`. Include every
referenced callback or value in its dependency list, and keep empty-barcode,
unknown-barcode, loading, and error paths covered. Use the existing sound and
toast helpers rather than duplicating request logic.

### Task 17: Verify error-boundary recovery

Status: [x] Boundary exists; improve scope and recovery testing if needed.

Ensure the boundary does not expose sensitive error details in production and
that retrying resets the failed subtree. Keep the app-level boundary and add
route-level boundaries only where a page needs independent recovery.

### Task 18: Make POS product selection intentional

Status: [ ] Product decision required.

Do not add a clickable row that only displays a toast while implying that it
adds an item. Choose one behavior and test it:

- Add a single-variant product using existing product data; or
- Open a variant selector; or
- Keep rows non-clickable and provide a clearly labeled barcode workflow.

Never add an item without a known variant, price, barcode, and available stock.

### Task 19: Verify Settings navigation

Status: [ ] Audit required.

The Settings page and route already exist. Check whether the sidebar link is
intentionally disabled. If enabled, verify role access, mobile navigation,
loading/error states, and that settings shown as configurable are actually
persisted. Do not present non-functional toggles as saved configuration.

### Task 20: Keep the sales chart wired to the API

Status: [ ] Audit required.

Use the existing `Sales.tsx` request and the server contract from Task 9.
Confirm date filters are URL-encoded, loading/empty/error states render, and
the chart does not assume a non-empty data array.

## Phase 4: Cleanup and Release Checks

### Task 21: Remove dead commented code

Status: [ ] Audit required.

Remove obsolete comments only after checking git history or current issue
references. Keep comments that explain a non-obvious invariant, concurrency
lock, security boundary, or migration decision.

### Task 22: Maintain migration documentation

Status: [x] `server/prisma/MIGRATION_LOG.md` exists.

Append a row for each new migration. Do not rename applied migration folders;
Prisma uses their names as migration history identifiers.

### Task 23: Use the product reorder level

Status: [ ] Audit required.

Confirm the product-list API, shared type, and POS badge use the same field
name and units. Test zero stock, stock at the reorder level, and stock above
the reorder level. Do not reintroduce a hardcoded threshold.

## Verification Gate

Run from the repository root:

```bash
bun run --filter server test
bun run --filter server build
bun run --filter client lint
bun run --filter client build
cd server && bunx prisma validate
cd server && bunx prisma migrate status
```

Before release, also verify the production environment contains the required
variables, migrations are applied in order, CORS origins are explicit, and a
staging checkout cannot oversell stock or over-collect a sale.
