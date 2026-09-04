# POS App — Fix & Optimize Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs, security gaps, schema design issues, and UX problems across the full POS stack — database first, then backend API, then frontend.

**Architecture:** PostgreSQL (Prisma ORM) → Hono.js API on Bun runtime → React + Vite frontend with Clerk auth. Shared `@myapp/shared` package for Zod schemas and TypeScript types. Client deploys to Vercel, server deploys to Railway.

**Tech Stack:** Bun, Hono.js, Prisma, PostgreSQL, React 18, Vite, TanStack Query, Clerk, shadcn/ui, Zod, Sonner, Wouter, TypeScript.

**Plan Location:** `/plan.md` (project root)  
**Work Order:** Database Schema → Backend API → Frontend UI/UX

---

## Global Constraints

- Never drop production data without a safe migration guard
- All money fields must remain `Decimal(10,2)` — no floats
- All migrations must use descriptive names (not `_init`)
- Branch → change → verify → merge (per CLAUDE.md)
- No direct commits to `main`
- `server_URI` must be read from `VITE_API_URL` env var — no hardcoding
- Keep Clerk as the sole auth provider — remove all local-auth code paths
- All console.log statements must be removed from production controllers

---

## Checkpoint Legend

| Symbol | Meaning |
|--------|---------|
| `- [ ]` | Not started |
| `- [x]` | Completed |
| `- [~]` | In progress |
| `- [!]` | Blocked — see note |

---

# PHASE 1 — DATABASE SCHEMA & MIGRATIONS

---

## Task 1: Add `clerk_id` to users + fix seed file

**Priority:** 🔴 Critical  
**Files:**
- Create: `server/prisma/migrations/YYYYMMDDHHMMSS_add_clerk_id_to_users/migration.sql`
- Modify: `server/prisma/schema.prisma` — add `clerk_id` field to `User` model
- Modify: `server/src/middleware/authSyncUser.middleware.ts` — sync by `clerk_id` not email
- Modify: `server/prisma/seed.ts` — remove `password_hash` and `refresh_token` fields

**Why:** The last migration (`20260501190251`) dropped `password_hash` and `refresh_token` from `users`, but the seed still writes those columns → `prisma db seed` crashes. Also, without `clerk_id`, Clerk → DB user mapping is fragile (breaks on email change).

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Create the migration**

  Run in `server/` directory:
  ```bash
  npx prisma migrate dev --name add_clerk_id_to_users
  ```
  When prompted, add this SQL manually before running, or edit `schema.prisma` first (see Step 2).

- [ ] **Step 2: Add `clerk_id` to schema**

  In `server/prisma/schema.prisma`, update the `User` model:
  ```prisma
  model User {
    id       String  @id @default(uuid())
    clerk_id String? @unique   // ← ADD THIS
    name     String?
    email    String  @unique
    phone    String? @unique
    status   InviteStatus @default(PENDING)
    role     Role         @default(OWNER)
    is_active Boolean     @default(true)

    created_at DateTime @default(now())
    updated_at DateTime @updatedAt

    sales             Sale[]
    purchases         Purchase[]
    stockAdjustments  StockAdjustment[]
    barcodesRetired   Barcode[]                  @relation("BarcodeRetirer")
    barcodesAllocated VariantBarcodeAllocation[] @relation("BarcodeAllocator")

    @@index([email])
    @@index([clerk_id])  // ← ADD THIS
    @@map("users")
  }
  ```

- [ ] **Step 3: Run migration**
  ```bash
  cd server && npx prisma migrate dev --name add_clerk_id_to_users
  ```
  Expected: Migration file created, DB updated, Prisma client regenerated.

- [ ] **Step 4: Fix `authSyncUser.middleware.ts` to use `clerk_id`**

  Current file at `server/src/middleware/authSyncUser.middleware.ts` — change the upsert to key on `clerk_id`:
  ```ts
  import type { Context, Next } from "hono";
  import prisma from "@/lib/prisma";
  import type { AppEnv } from "@/types";

  export async function syncUser(c: Context<AppEnv>, next: Next) {
      const clerkUserId = c.get("clerkUserId") as string;
      if (!clerkUserId) return await next();

      const user = await prisma.user.upsert({
          where: { clerk_id: clerkUserId },
          update: {},
          create: {
              clerk_id: clerkUserId,
              email: `${clerkUserId}@pending.clerk`,  // placeholder until Clerk webhook fills it
              role: "STAFF",
              status: "PENDING",
          },
          select: { id: true, role: true, is_active: true },
      });

      c.set("userId", user.id);
      c.set("userRole", user.role);
      await next();
  }
  ```

- [ ] **Step 5: Fix seed.ts — remove dropped columns**

  In `server/prisma/seed.ts`, remove `password_hash` and `refresh_token` from all `prisma.user.upsert` calls:
  ```ts
  const owner = await prisma.user.upsert({
      where: { email: "owner@posapp.com" },
      update: {},
      create: {
          name: "Rafiq Ahmed",
          email: "owner@posapp.com",
          // ← REMOVE: password_hash: passwordHash,
          phone: "01711000001",
          role: Role.OWNER,
          status: "ACCEPTED",
      },
  });
  ```
  Repeat for `staff1` and `staff2`. Also remove the `bcrypt` import and `passwordHash` variable if no longer used.

- [ ] **Step 6: Verify seed runs**
  ```bash
  cd server && npx prisma db seed
  ```
  Expected: `🎉 Seeding complete!` with no errors.

- [ ] **Step 7: Commit**
  ```bash
  git add server/prisma/schema.prisma server/prisma/seed.ts \
          server/src/middleware/authSyncUser.middleware.ts \
          server/prisma/migrations/
  git commit -m "fix(db): add clerk_id to users, fix broken seed file"
  ```

**Checkpoint after Task 1:** `- [ ]` _(mark completed with note on date)_

---

## Task 2: Add CHECK constraint on `stock_ledgers` single-source rule

**Priority:** 🔴 Critical  
**Files:**
- Create: `server/prisma/migrations/YYYYMMDDHHMMSS_stock_ledger_source_check/migration.sql`

**Why:** The schema comment says "Exactly one non-null per row" for `sale_id / purchase_id / adjustment_id` but no DB constraint enforces it. A bug could write a row with two sources, silently corrupting the audit trail.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Create raw SQL migration**

  Create file `server/prisma/migrations/$(date +%Y%m%d%H%M%S)_stock_ledger_source_check/migration.sql`:
  ```sql
  -- Enforce: at most one source FK per stock_ledger row
  ALTER TABLE stock_ledgers
  ADD CONSTRAINT stock_ledger_one_source CHECK (
      (sale_id IS NOT NULL)::int +
      (purchase_id IS NOT NULL)::int +
      (adjustment_id IS NOT NULL)::int <= 1
  );
  ```

- [ ] **Step 2: Apply with Prisma baseline**

  Since this is raw SQL not expressible in Prisma schema, apply it directly:
  ```bash
  cd server && npx prisma db execute --file prisma/migrations/<timestamp>_stock_ledger_source_check/migration.sql
  ```
  Then mark it in migration history:
  ```bash
  npx prisma migrate resolve --applied <timestamp>_stock_ledger_source_check
  ```

- [ ] **Step 3: Verify constraint exists**
  ```bash
  psql $DATABASE_URL -c "\d stock_ledgers" | grep stock_ledger_one_source
  ```
  Expected: constraint appears in the output.

- [ ] **Step 4: Commit**
  ```bash
  git add server/prisma/migrations/
  git commit -m "fix(db): add CHECK constraint on stock_ledgers to enforce single source FK"
  ```

**Checkpoint after Task 2:** `- [ ]` _(mark completed with note)_

---

## Task 3: Remove dangling `base_variant_id` field from `Product`

**Priority:** 🟡 Minor  
**Files:**
- Create: `server/prisma/migrations/YYYYMMDDHHMMSS_drop_base_variant_id/migration.sql`
- Modify: `server/prisma/schema.prisma`

**Why:** `Product.base_variant_id` has no `@relation`, no FK, and is never read or written. It is dead weight that confuses future readers.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Remove field from schema**

  In `server/prisma/schema.prisma`, delete `base_variant_id String?` from the `Product` model.

- [ ] **Step 2: Run migration**
  ```bash
  cd server && npx prisma migrate dev --name drop_base_variant_id_from_products
  ```
  Expected: Column dropped.

- [ ] **Step 3: Commit**
  ```bash
  git add server/prisma/schema.prisma server/prisma/migrations/
  git commit -m "fix(db): remove orphaned base_variant_id field from products"
  ```

**Checkpoint after Task 3:** `- [ ]` _(mark completed with note)_

---

## Task 4: Add unique constraint on `Customer.email` + make `name` required

**Priority:** 🟡 Minor  
**Files:**
- Create: migration for `customer_email_unique`
- Modify: `server/prisma/schema.prisma`

**Why:** Two customers can share an email with no error. `Customer.name` being nullable causes "null" display issues.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Update schema**

  In `server/prisma/schema.prisma`, change `Customer`:
  ```prisma
  model Customer {
    id             String  @id @default(uuid())
    name           String  // ← make required (was String?)
    phone          String? @unique
    email          String? @unique  // ← add @unique
    address        String?
    credit_balance Decimal @default(0) @db.Decimal(10, 2)
    is_active      Boolean @default(true)
    // ...
    @@index([phone])
    @@index([email])  // ← add index
    @@map("customers")
  }
  ```

- [ ] **Step 2: Run migration**
  ```bash
  cd server && npx prisma migrate dev --name customer_email_unique_name_required
  ```
  > Note: If existing rows have null `name`, the migration will fail. Add a default first:
  ```sql
  UPDATE customers SET name = 'Unknown' WHERE name IS NULL;
  ```

- [ ] **Step 3: Update `createSale` customer upsert in sale controller**

  In `server/src/controllers/sale.controller.ts` around line 353, ensure `name` is always provided:
  ```ts
  const customerRecord = await prisma.customer.upsert({
      where: { phone: checkout.customer.phone },
      update: {
          name: checkout.customer.name || "Walk-in Customer",
          address: checkout.customer.address || undefined,
          email: checkout.customer.email || undefined,
      },
      create: {
          name: checkout.customer.name || "Walk-in Customer",
          phone: checkout.customer.phone,
          address: checkout.customer.address || undefined,
          email: checkout.customer.email || undefined,
      },
      select: { id: true },
  });
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add server/prisma/schema.prisma server/prisma/migrations/ \
          server/src/controllers/sale.controller.ts
  git commit -m "fix(db): make customer name required, add unique constraint on customer email"
  ```

**Checkpoint after Task 4:** `- [ ]` _(mark completed with note)_

---

## Task 5: Remove local auth code (align schema with Clerk-only auth)

**Priority:** 🟠 Important  
**Files:**
- Modify: `server/src/app.ts` — remove auth routes
- Delete: `server/src/controllers/auth.controller.ts`
- Delete: `server/src/routes/auth.route.ts`
- Delete: `server/src/lib/token.ts`
- Delete: `server/src/lib/password.ts`
- Delete: `server/src/services/token.service.ts`
- Modify: `server/src/services/user.service.ts` — remove password-related methods
- Remove: `server/package.json` — `bcryptjs`, `jsonwebtoken` deps

**Why:** Migration `20260501` dropped `password_hash` and `refresh_token`. The local auth controller (`auth.controller.ts`) references these dropped columns. This code cannot work and creates a false sense of security (dead routes that look alive). Clerk is the correct auth provider.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Remove auth routes from `app.ts`**

  In `server/src/app.ts`, remove the import and `app.route("/api/auth", authRouter)` line.

- [ ] **Step 2: Delete dead files**
  ```bash
  rm server/src/controllers/auth.controller.ts
  rm server/src/routes/auth.route.ts
  rm server/src/lib/token.ts
  rm server/src/lib/password.ts
  rm server/src/services/token.service.ts
  ```

- [ ] **Step 3: Remove unused deps from server package.json**
  ```bash
  cd server && bun remove bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
  ```

- [ ] **Step 4: Verify server still builds**
  ```bash
  cd server && bun run build 2>&1 | grep -i error
  ```
  Expected: No errors.

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "feat(auth): remove dead local-auth code — Clerk is now sole auth provider"
  ```

**Checkpoint after Task 5:** `- [ ]` _(mark completed with note)_

---

# PHASE 2 — BACKEND API BUGS & SECURITY

---

## Task 6: Fix critical `createPayment` bug — wrong field updated

**Priority:** 🔴 Critical  
**Files:**
- Modify: `server/src/controllers/sale.controller.ts` — lines 839–856

**Why:** `createPayment` correctly creates a `Payment` record but then executes `sale.update({ data: { discount_amount: new Decimal(amount) } })` — this overwrites `discount_amount` with the payment amount on every payment collect, corrupting every sale's financial data.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Remove the incorrect `sale.update` block**

  In `server/src/controllers/sale.controller.ts`, replace the entire `await prisma.$transaction` block in `createPayment` (lines ~839–856):

  **BEFORE (broken):**
  ```ts
  await prisma.$transaction(async (tx) => {
      await tx.payment.create({
          data: {
              sale_id: saleId,
              amount: new Decimal(amount),
              method: method,
              reference: reference,
          }
      })
      await tx.sale.update({          // ← BUG: corrupts discount_amount
          where: { id: saleId },
          data: {
              discount_amount: new Decimal(amount),
          }
      })
  })
  ```

  **AFTER (correct):**
  ```ts
  await prisma.payment.create({
      data: {
          sale_id: saleId,
          amount: new Decimal(amount),
          method: method,
          reference: reference ?? null,
      },
  });
  ```
  No transaction needed — it's a single atomic write. The payment record alone is sufficient; payment status is computed from `SUM(payments.amount)` at query time.

- [ ] **Step 2: Fix the success message**

  Change the response message from `"Payment data fetched successfully"` (wrong) to `"Payment recorded successfully"`:
  ```ts
  return sendSuccess(c, {}, "Payment recorded successfully", 201);
  ```

- [ ] **Step 3: Verify manually**

  Start server and POST to `/api/sales/payment` with a valid payload. Verify:
  - A `payments` row is created in the DB
  - The `sales` row's `discount_amount` is **not** changed
  ```bash
  psql $DATABASE_URL -c "SELECT discount_amount FROM sales WHERE id = '<test-sale-id>';"
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/controllers/sale.controller.ts
  git commit -m "fix(api): remove incorrect sale.update in createPayment — was corrupting discount_amount"
  ```

**Checkpoint after Task 6:** `- [ ]` _(mark completed with note)_

---

## Task 7: Fix hardcoded `server_URI` — read from env var

**Priority:** 🔴 Critical  
**Files:**
- Modify: `client/src/lib/api-request.ts` — line 19
- Modify: `client/.env` — add `VITE_API_URL`
- Modify: `client/.env.example` (create if missing)

**Why:** `export const server_URI = "http://localhost:3000/api"` is hardcoded. The app cannot be deployed to any environment other than localhost.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Update `api-request.ts`**

  In `client/src/lib/api-request.ts`, replace line 19:
  ```ts
  // BEFORE
  export const server_URI = "http://localhost:3000/api";

  // AFTER
  export const server_URI = import.meta.env.VITE_API_URL as string;
  ```

- [ ] **Step 2: Add startup guard**

  Immediately after the export, add:
  ```ts
  if (!server_URI) {
      throw new Error("VITE_API_URL is not set. Add it to your .env file.");
  }
  ```

- [ ] **Step 3: Update `client/.env`**

  Ensure this line exists in `client/.env`:
  ```
  VITE_API_URL=http://localhost:3000/api
  ```

- [ ] **Step 4: Create `client/.env.example`** (for new devs)
  ```
  VITE_API_URL=http://localhost:3000/api
  ```

- [ ] **Step 5: Verify dev server starts without error**
  ```bash
  cd client && bun run dev
  ```
  Expected: No `VITE_API_URL is not set` error in console.

- [ ] **Step 6: Commit**
  ```bash
  git add client/src/lib/api-request.ts client/.env.example
  git commit -m "fix(client): read server_URI from VITE_API_URL env var instead of hardcoding localhost"
  ```

**Checkpoint after Task 7:** `- [ ]` _(mark completed with note)_

---

## Task 8: Add server startup validation for required env vars

**Priority:** 🟠 Important  
**Files:**
- Modify: `server/src/config/index.ts`
- Modify: `server/index.ts`

**Why:** `process.env.CLERK_SECRET_KEY!` uses a non-null assertion — a missing env var causes a cryptic runtime crash instead of a clear startup failure.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Update `server/src/config/index.ts`**

  ```ts
  const REQUIRED_ENV = [
      "DATABASE_URL",
      "CLERK_SECRET_KEY",
  ] as const;

  for (const key of REQUIRED_ENV) {
      if (!process.env[key]) {
          console.error(`[startup] Missing required env var: ${key}`);
          process.exit(1);
      }
  }

  export const config = {
      clerkSecretKey: process.env.CLERK_SECRET_KEY!,
      databaseUrl: process.env.DATABASE_URL!,
      nodeEnv: process.env.NODE_ENV ?? "development",
      isProduction: process.env.NODE_ENV === "production",
  } as const;
  ```

- [ ] **Step 2: Import config at top of `server/src/app.ts`**

  Add at the very top of `server/src/app.ts` (before any other imports):
  ```ts
  import "@/config"; // runs validation on startup
  ```

- [ ] **Step 3: Replace all `process.env.CLERK_SECRET_KEY!` with `config.clerkSecretKey`**
  ```bash
  grep -r "CLERK_SECRET_KEY" server/src/
  ```
  Update each occurrence to use `config.clerkSecretKey`.

- [ ] **Step 4: Verify startup fails cleanly with missing env**
  ```bash
  CLERK_SECRET_KEY= bun run server/index.ts 2>&1 | head -5
  ```
  Expected: `[startup] Missing required env var: CLERK_SECRET_KEY` then exit.

- [ ] **Step 5: Commit**
  ```bash
  git add server/src/config/index.ts server/src/app.ts
  git commit -m "fix(server): validate required env vars at startup instead of crashing with non-null assertion"
  ```

**Checkpoint after Task 8:** `- [ ]` _(mark completed with note)_

---

## Task 9: Implement `getChartData` — sales chart endpoint

**Priority:** 🟠 Important  
**Files:**
- Modify: `server/src/controllers/sale.controller.ts` — `getChartData` method
- Modify: `client/src/components/sales/OrderStatusChart.tsx` — wire to real data

**Why:** `getChartData` returns `{}` — the sales chart on the dashboard has no data. This is a core analytics feature.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Implement `getChartData` in sale controller**

  Replace the stub in `server/src/controllers/sale.controller.ts`:
  ```ts
  async getChartData(c: Context) {
      const { from, to } = c.req.query();

      if (!from || !to) {
          return sendError(c, "from and to are required", "INVALID_REQUEST", 422);
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      const rows = await prisma.$queryRaw<{ status: string; count: bigint; total: string }[]>`
          SELECT
              CASE
                  WHEN COALESCE(SUM(p.amount), 0) >= s.total THEN 'PAID'
                  WHEN COALESCE(SUM(p.amount), 0) = 0        THEN 'DUE'
                  ELSE 'PARTIAL'
              END AS status,
              COUNT(*)::int AS count,
              SUM(s.total)::text AS total
          FROM sales s
          LEFT JOIN payments p ON p.sale_id = s.id
          WHERE s.invoiced_at >= ${fromDate}
            AND s.invoiced_at <= ${toDate}
            AND s.status != 'VOID'
          GROUP BY 1
      `;

      const data = rows.map((r) => ({
          status: r.status,
          count: Number(r.count),
          total: Number(r.total),
      }));

      return sendSuccess(c, data, "Chart data fetched successfully", 200);
  },
  ```

- [ ] **Step 2: Verify endpoint returns data**
  ```bash
  curl "http://localhost:3000/api/sales/chart?from=2026-01-01&to=2026-12-31" \
    -H "Authorization: Bearer <token>"
  ```
  Expected: JSON array with `PAID`, `DUE`, `PARTIAL` objects.

- [ ] **Step 3: Commit**
  ```bash
  git add server/src/controllers/sale.controller.ts
  git commit -m "feat(api): implement getChartData — sales status distribution endpoint"
  ```

**Checkpoint after Task 9:** `- [ ]` _(mark completed with note)_

---

## Task 10: Remove all `console.log` from production controllers

**Priority:** 🟡 Minor  
**Files:**
- Modify: `server/src/controllers/sale.controller.ts` — lines 686, 726, 746, 795

**Why:** Raw sale rows and full response objects are logged to stdout in production, leaking customer PII and financial data to logs.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Find all console.log in server controllers**
  ```bash
  grep -rn "console.log" server/src/controllers/
  ```

- [ ] **Step 2: Remove every `console.log` found**

  In `sale.controller.ts`, delete lines:
  - `console.log(rows)` (line ~686)
  - `console.log(response)` (line ~726)
  - Any commented-out `console.log` blocks

- [ ] **Step 3: Verify none remain**
  ```bash
  grep -rn "console.log" server/src/ | grep -v "node_modules"
  ```
  Expected: No results.

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/controllers/
  git commit -m "fix(server): remove console.log statements leaking PII to production logs"
  ```

**Checkpoint after Task 10:** `- [ ]` _(mark completed with note)_

---

## Task 11: Add rate limiting to auth and sensitive endpoints

**Priority:** 🟠 Important  
**Files:**
- Modify: `server/src/app.ts`
- Modify: `server/package.json`

**Why:** No rate limiting exists on any endpoint. Login and payment endpoints accept unlimited requests.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Install rate limiter**
  ```bash
  cd server && bun add hono-rate-limiter
  ```

- [ ] **Step 2: Add rate limiting in `app.ts`**

  ```ts
  import { rateLimiter } from "hono-rate-limiter";

  // Apply to all routes — 300 req/min per IP
  app.use("*", rateLimiter({
      windowMs: 60 * 1000,
      limit: 300,
      keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
  }));
  ```

- [ ] **Step 3: Verify rate limiter works**
  ```bash
  for i in {1..310}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health; done | tail -20
  ```
  Expected: Last responses return `429`.

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/app.ts server/package.json
  git commit -m "feat(security): add rate limiting — 300 req/min per IP"
  ```

**Checkpoint after Task 11:** `- [ ]` _(mark completed with note)_

---

## Task 12: Add global error handler to Hono app

**Priority:** 🟠 Important  
**Files:**
- Modify: `server/src/app.ts`

**Why:** Unhandled exceptions currently expose stack traces in responses. A global handler ensures consistent error responses and prevents information leakage.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Add `onError` handler in `app.ts`**

  Add after the app is created:
  ```ts
  import { config } from "@/config";

  app.onError((err, c) => {
      if (err instanceof AppError) {
          return c.json({ success: false, error: err.code, message: err.message }, err.statusCode as any);
      }
      // In dev, expose the stack. In prod, hide it.
      const message = config.isProduction ? "Internal server error" : err.message;
      console.error("[unhandled]", err);
      return c.json({ success: false, error: "INTERNAL_ERROR", message }, 500);
  });
  ```

- [ ] **Step 2: Verify error handler fires**

  Add a temporary route that throws:
  ```bash
  curl http://localhost:3000/api/throw-test
  ```
  Expected: `{ "success": false, "error": "INTERNAL_ERROR", "message": "..." }` — no stack trace in production mode.

- [ ] **Step 3: Commit**
  ```bash
  git add server/src/app.ts
  git commit -m "feat(server): add global error handler to prevent stack trace leakage"
  ```

**Checkpoint after Task 12:** `- [ ]` _(mark completed with note)_

---

## Task 13: Extract `parseCookie` to shared utility

**Priority:** 🟡 Minor  
**Files:**
- Create: `server/src/utils/cookie.ts`

**Why:** `parseCookie` is defined inline in `auth.controller.ts`. With local auth being removed (Task 5), this utility may be needed elsewhere. Keep it in one place.

**Checkpoint:** `- [ ]` Not started  
> **Note:** If Task 5 (remove local auth) is completed first, verify whether `parseCookie` is still used anywhere. If not, skip this task.

- [ ] **Step 1: Create `server/src/utils/cookie.ts`**
  ```ts
  export function parseCookie(cookieHeader: string, name: string): string | undefined {
      return cookieHeader
          .split(";")
          .map((c) => c.trim().split("="))
          .find(([key]) => key === name)?.[1];
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add server/src/utils/cookie.ts
  git commit -m "refactor(server): extract parseCookie to shared utility"
  ```

**Checkpoint after Task 13:** `- [ ]` _(mark completed with note)_

---

## Task 14: Fix invoice counter — reset consideration + year prefix

**Priority:** 🟡 Minor  
**Files:**
- Modify: `server/src/controllers/sale.controller.ts` — `createSale` invoice generation (line ~442)

**Why:** `INV-2026-00001` embeds the year but the counter never resets at year end. Next year it will generate `INV-2027-01001` (continuing from last year's count), which is confusing for accounting.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Change invoice format to not embed year in counter**

  In `createSale`, replace the invoice generation block:
  ```ts
  // BEFORE
  const invoiceNo = `INV-${new Date().getFullYear()}-${String(counter.value).padStart(5, "0")}`;

  // AFTER — use a global sequential number; year is informational only
  const year = new Date().getFullYear();
  const invoiceNo = `INV-${year}-${String(counter.value).padStart(6, "0")}`;
  ```

  > **Decision:** Either (a) keep global counter and accept cross-year sequential numbers, or (b) add a per-year counter key like `"invoice:2026"`. Option (a) is simpler and sufficient for most retail use cases. Option (b) requires a DB migration to add the year-keyed counter row each Jan 1. **Default to option (a) for now** — revisit if customer requests year-reset invoicing.

- [ ] **Step 2: Commit**
  ```bash
  git add server/src/controllers/sale.controller.ts
  git commit -m "fix(api): clarify invoice number format — global sequential counter, year is decorative"
  ```

**Checkpoint after Task 14:** `- [ ]` _(mark completed with note)_

---

# PHASE 3 — FRONTEND: UX & BUGS

---

## Task 15: Fix global query invalidation after mutations

**Priority:** 🔴 Critical (UX)  
**Files:**
- Modify: `client/src/lib/api-request.ts` — all mutation hooks
- Modify: `client/src/App.tsx` — make `queryClient` accessible

**Why:** `usePostData`, `usePatchData`, `useDeleteData` hooks never call `queryClient.invalidateQueries`. After any mutation, the UI shows stale data until the user manually refreshes. This is the #1 source of confusing UX in the app.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Export `queryClient` from `App.tsx`**

  Move `queryClient` out of `App` into a separate file:

  Create `client/src/lib/query-client.ts`:
  ```ts
  import { QueryClient } from "@tanstack/react-query";

  export const queryClient = new QueryClient({
      defaultOptions: {
          queries: {
              staleTime: 30 * 1000, // 30s — down from 5 min, suits live POS
              retry: 1,
              refetchOnWindowFocus: false,
          },
      },
  });
  ```

  In `client/src/App.tsx`, replace the inline `new QueryClient()` with an import:
  ```ts
  import { queryClient } from "@/lib/query-client";
  ```

- [ ] **Step 2: Update mutation hooks in `api-request.ts` to accept `invalidateKeys`**

  ```ts
  import { queryClient } from "@/lib/query-client";

  export function usePostData<TInput, TOutput>(
      endpoint: string,
      invalidateKeys?: string[][]
  ) {
      const { getToken } = useAuth();
      return useMutation<TOutput, Error, TInput>({
          mutationKey: [endpoint, "POST"],
          mutationFn: (data: TInput) =>
              fetchJson<TOutput>(endpoint, getToken, {
                  method: "POST",
                  body: data as RequestInit["body"],
              }),
          onSuccess: () => {
              invalidateKeys?.forEach((key) =>
                  queryClient.invalidateQueries({ queryKey: key })
              );
          },
      });
  }
  ```

  Apply the same pattern to `usePutData`, `usePatchData`, `useDeleteData`, `useDeleteBulkData`.

- [ ] **Step 3: Update `staleTime` in `useGetData`**

  The `useGetData` hook currently hardcodes `staleTime: 1000 * 60 * 5` (5 minutes). Remove this hardcoded override so it inherits the 30s default from `queryClient` config (set in Step 1):
  ```ts
  export function useGetData<T>(
      endpoint: string,
      queryKey?: string[],
      options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
  ) {
      const { getToken } = useAuth();
      return useQuery<T>({
          queryKey: queryKey ? [...queryKey, endpoint] : [endpoint],
          queryFn: () => fetchJson<T>(endpoint, getToken),
          ...options,
      });
  }
  ```

- [ ] **Step 4: Update key call sites to pass invalidateKeys**

  In `client/src/components/product-model.tsx` (product create/update):
  ```ts
  const { mutate: createProduct } = usePostData("/products/create", [["/products/get/all"]]);
  ```

  In `client/src/pages/PointOfSale.tsx` — remove manual `refetchProducts()` call; the invalidation hook handles it:
  ```ts
  const { mutate: createSale } = usePostData("/sales/create", [["/products/get/all"]]);
  ```

- [ ] **Step 5: Verify stale data is gone**

  Create a product, return to products list — the new product should appear without refresh.

- [ ] **Step 6: Commit**
  ```bash
  git add client/src/lib/api-request.ts client/src/lib/query-client.ts client/src/App.tsx \
          client/src/components/ client/src/pages/
  git commit -m "fix(client): add query invalidation after mutations, reduce staleTime to 30s"
  ```

**Checkpoint after Task 15:** `- [ ]` _(mark completed with note)_

---

## Task 16: Fix `handleScan` missing dependency in POS

**Priority:** 🟠 Important  
**Files:**
- Modify: `client/src/pages/PointOfSale.tsx` — line 261

**Why:** `handleScan` uses `getToken` from closure but only lists `[addToCart]` in `useCallback` deps. If `getToken` reference changes (e.g., token refresh), the stale closure will use the old token function.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Fix `handleScan` dependency array**

  In `client/src/pages/PointOfSale.tsx`:
  ```ts
  // BEFORE
  const handleScan = useCallback(
      async (barcode: string) => {
          // uses getToken from closure
      },
      [addToCart],  // ← missing getToken
  );

  // AFTER
  const handleScan = useCallback(
      async (barcode: string) => {
          if (!barcode.trim()) {
              playSoundWithCacheInstance("error_beep");
              return;
          }
          playSoundWithCacheInstance("beep");
          const data = await getProductByBarcode(barcode, getToken);
          if (data) addToCart(data);
          else {
              toast.error(`No product for barcode ${barcode}`);
              playSoundWithCacheInstance("error_beep");
          }
      },
      [addToCart, getToken],  // ← add getToken
  );
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add client/src/pages/PointOfSale.tsx
  git commit -m "fix(pos): add getToken to handleScan useCallback dependency array"
  ```

**Checkpoint after Task 16:** `- [ ]` _(mark completed with note)_

---

## Task 17: Add React error boundaries at page level

**Priority:** 🟠 Important  
**Files:**
- Create: `client/src/components/ErrorBoundary.tsx`
- Modify: `client/src/App.tsx` — wrap each route

**Why:** An unhandled render error in any page crashes the entire app with a blank screen. Error boundaries catch this and show a recovery UI.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Create `ErrorBoundary.tsx`**

  ```tsx
  import { Component, type ReactNode } from "react";

  interface Props { children: ReactNode; fallback?: ReactNode; }
  interface State { hasError: boolean; error?: Error; }

  export class ErrorBoundary extends Component<Props, State> {
      state: State = { hasError: false };

      static getDerivedStateFromError(error: Error): State {
          return { hasError: true, error };
      }

      render() {
          if (this.state.hasError) {
              return this.props.fallback ?? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                      <p className="text-sm font-medium text-destructive">Something went wrong.</p>
                      <p className="text-xs text-muted-foreground">{this.state.error?.message}</p>
                      <button
                          onClick={() => this.setState({ hasError: false })}
                          className="text-xs underline text-primary"
                      >
                          Try again
                      </button>
                  </div>
              );
          }
          return this.props.children;
      }
  }
  ```

- [ ] **Step 2: Wrap each route in `App.tsx`**

  ```tsx
  import { ErrorBoundary } from "@/components/ErrorBoundary";

  // In ProtectedRouter Switch:
  <Route path="/pos" component={() => (
      <ErrorBoundary><PointOfSale /></ErrorBoundary>
  )} />
  // ... repeat for each route
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add client/src/components/ErrorBoundary.tsx client/src/App.tsx
  git commit -m "feat(client): add ErrorBoundary component — prevent full-app crash on render errors"
  ```

**Checkpoint after Task 17:** `- [ ]` _(mark completed with note)_

---

## Task 18: Implement POS product row click → add to cart

**Priority:** 🟠 Important  
**Files:**
- Modify: `client/src/pages/PointOfSale.tsx` — product table row `onClick`

**Why:** Clicking a product row in the POS does nothing (`/* extend here */` comment). Users expect a click to add the product to cart. Barcode-only entry is a friction point for keyboard/mouse workflows.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Fetch product by ID for cart entry**

  The `ProductTableRow` type has `id`, `name`, `category`, `variants`, `stock`. To add to cart, we need a `CartEntryProduct` (with `variantId`, `barcode`, `price`, `availableStock`). Add a helper:

  In `client/src/pages/PointOfSale.tsx`:
  ```ts
  async function getFirstVariantForProduct(
      productId: string,
      getToken: () => Promise<string | null>,
  ): Promise<CartEntryProduct | null> {
      try {
          const token = await getToken();
          const res = await fetch(`${server_URI}/products/get/${productId}/first-variant`, {
              headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return null;
          const result: { data: CartEntryProduct } = await res.json();
          return result.data ?? null;
      } catch {
          return null;
      }
  }
  ```

  > **Note:** This requires a backend endpoint `GET /products/:id/first-variant`. Add it in Task 18b below, or use the existing barcode scan as the primary path and show a toast directing users to scan.

- [ ] **Step 1 (simplified alternative — no new endpoint needed):**

  If the product has exactly 1 variant and `stock > 0`, show a toast: "Scan the barcode to add this product". If multiple variants, show: "This product has multiple variants — scan a barcode to select one."

  In the `<tr onClick>`:
  ```tsx
  onClick={() => {
      if (p.stock === 0) {
          toast.error(`${p.name} is out of stock`);
          return;
      }
      if (p.variants > 1) {
          toast.info(`${p.name} has ${p.variants} variants — scan the barcode to add`);
          return;
      }
      toast.info("Scan the product barcode to add it to the cart");
  }}
  ```

- [ ] **Step 2: Add cursor styling to rows**

  In the `<tr>` className, add `cursor-pointer`:
  ```tsx
  className="hover:bg-muted/30 transition-colors cursor-pointer"
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add client/src/pages/PointOfSale.tsx
  git commit -m "feat(pos): add product row click feedback — guides user to barcode scan"
  ```

**Checkpoint after Task 18:** `- [ ]` _(mark completed with note)_

---

## Task 19: Restore and implement Settings page

**Priority:** 🟡 Minor  
**Files:**
- Modify: `client/src/App.tsx` — uncomment Settings route
- Modify: `client/src/pages/Settings.tsx` — implement basic content

**Why:** The Settings route is commented out in `App.tsx`. The page file exists but is dead. At minimum, restore it with a placeholder that shows store info and payment method configuration.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Uncomment Settings route in `App.tsx`**

  ```tsx
  import Settings from "@/pages/Settings";
  // ...
  <Route path="/settings" component={Settings} />
  ```

- [ ] **Step 2: Add basic content to `Settings.tsx`**

  Implement at minimum:
  - Store name display
  - Currency display (BDT)
  - Payment methods toggle (CASH / BKASH / NAGAD / ROCKET)
  - "Coming soon" notice for advanced settings

- [ ] **Step 3: Add Settings link to sidebar navigation**

  In `client/src/components/Layout.tsx` (or sidebar file), add Settings nav item.

- [ ] **Step 4: Commit**
  ```bash
  git add client/src/App.tsx client/src/pages/Settings.tsx client/src/components/
  git commit -m "feat(client): restore Settings page with basic store configuration"
  ```

**Checkpoint after Task 19:** `- [ ]` _(mark completed with note)_

---

## Task 20: Wire `OrderStatusChart` to real `getChartData` endpoint

**Priority:** 🟡 Minor (depends on Task 9)  
**Files:**
- Modify: `client/src/components/sales/OrderStatusChart.tsx`
- Modify: `client/src/pages/Sales.tsx` (or Dashboard.tsx — wherever chart is rendered)

**Why:** After Task 9 implements the endpoint, the frontend chart component needs to fetch and render real data instead of mock/empty data.

**Checkpoint:** `- [ ]` Not started  
> **Depends on:** Task 9 (implement `getChartData` endpoint)

- [ ] **Step 1: Update `OrderStatusChart` to fetch real data**

  In `client/src/components/sales/OrderStatusChart.tsx`:
  ```tsx
  import { useGetData } from "@/lib/api-request";

  type ChartRow = { status: string; count: number; total: number };

  export function OrderStatusChart({ from, to }: { from: string; to: string }) {
      const { data, isLoading } = useGetData<{ data: ChartRow[] }>(
          `/sales/chart?from=${from}&to=${to}`
      );

      if (isLoading) return <Skeleton className="h-48 w-full" />;

      const chartData = data?.data ?? [];
      // Map to recharts/shadcn chart format and render...
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add client/src/components/sales/OrderStatusChart.tsx
  git commit -m "feat(client): connect OrderStatusChart to real getChartData API endpoint"
  ```

**Checkpoint after Task 20:** `- [ ]` _(mark completed with note)_

---

# PHASE 4 — POLISH & DOCUMENTATION

---

## Task 21: Remove all commented-out dead code

**Priority:** 🟡 Minor  
**Files:**
- Modify: `server/src/controllers/sale.controller.ts` — remove ~30 lines of commented SQL
- Modify: `client/src/lib/api-request.ts` — remove commented server URI config blocks
- Modify: `client/src/App.tsx` — remove `// import Settings` and commented route

**Why:** Large commented-out blocks create noise, slow code reading, and falsely suggest these approaches were tried and abandoned without explanation. Git history preserves the old code.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Clean `sale.controller.ts`**

  Remove the `// async function generateInvoiceNo` block (~lines 38–50) and the commented `$queryRaw` blocks inside `createSale` (~lines 376–413).

- [ ] **Step 2: Clean `api-request.ts`**

  Remove the commented-out `console.log`, `process.env.SERVER_URI`, and `import.meta.env.VITE_API_URL` lines at the top.

- [ ] **Step 3: Clean `App.tsx`**

  Remove `// import Settings` and the commented `<Route path="/settings" ...>` (which will be restored properly in Task 19).

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/controllers/sale.controller.ts \
          client/src/lib/api-request.ts \
          client/src/App.tsx
  git commit -m "chore: remove commented-out dead code — git history preserves old approaches"
  ```

**Checkpoint after Task 21:** `- [ ]` _(mark completed with note)_

---

## Task 22: Rename migrations to descriptive names (documentation only)

**Priority:** 🟡 Minor  
**Files:**
- `server/prisma/migrations/` — all 21 migration directories

**Why:** All 21 migrations are named `_init`. New team members (and future-you) cannot understand what changed without reading the full SQL. This is a documentation fix only — no SQL changes.

**Checkpoint:** `- [ ]` Not started

> **Note:** Renaming Prisma migration directories requires also updating `migration_lock.toml` and the directory names. This is safe to do but must be done carefully.

- [ ] **Step 1: Create a mapping document**

  Add `server/prisma/MIGRATION_LOG.md`:
  ```markdown
  | Timestamp | Actual Change |
  |-----------|---------------|
  | 20260402063921 | Initial schema — PascalCase tables |
  | 20260405140516 | Rename tables to snake_case |
  | 20260405182009 | Add barcode system |
  | 20260406142846 | Complete schema rewrite — add sale_returns, payments |
  | 20260409200847 | Add stock ledger |
  | 20260412152848 | Add purchase items index |
  | 20260418075007 | Add product brand field |
  | 20260422142803 | Add invoiced_at to sales |
  | 20260426172513 | Add invoice_no field |
  | 20260426172605 | Rename invoice_no to invoice_number |
  | 20260426195916 | Add sales status |
  | 20260426201409 | Add sales invoice |
  | 20260426201443 | Sales status enum v1 |
  | 20260426215801 | SaleStatus simplify to COMPLETED/VOID |
  | 20260426220741 | Remove PaymentStatus enum |
  | 20260427075029 | Drop SKU from variants |
  | 20260427082108 | Add purchase date/invoice fields |
  | 20260429162230 | Drop sale_returns, remove SKU, add waived_amount |
  | 20260501190251 | Switch to Clerk auth — drop password_hash, refresh_token, add InviteStatus |
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add server/prisma/MIGRATION_LOG.md
  git commit -m "docs(db): add migration log explaining what each migration changed"
  ```

**Checkpoint after Task 22:** `- [ ]` _(mark completed with note)_

---

## Task 23: Enforce `reorder_level` in POS stock badge

**Priority:** 🟡 Minor  
**Files:**
- Modify: `client/src/pages/PointOfSale.tsx` — `StockBadge` component
- Modify: `client/src/types/index.ts` — add `reorderLevel` to `ProductTableRow`
- Modify: `server/src/controllers/product.controller.ts` — include `reorder_level` in product list response

**Why:** `StockBadge` uses hardcoded `<= 5` as the low-stock threshold instead of the product's `reorder_level` field, which is already stored and seeded.

**Checkpoint:** `- [ ]` Not started

- [ ] **Step 1: Add `reorderLevel` to product list API response**

  In product controller's `getAll` handler, include `reorder_level` in the select/return.

- [ ] **Step 2: Update `ProductTableRow` type**

  In `client/src/types/index.ts`:
  ```ts
  export type ProductTableRow = {
      id: string;
      name: string;
      category: string;
      variants: number;
      stock: number;
      reorderLevel: number; // ← add this
  };
  ```

- [ ] **Step 3: Update `StockBadge` to use dynamic threshold**

  ```tsx
  function StockBadge({ stock, reorderLevel }: { stock: number; reorderLevel: number }) {
      if (stock === 0)
          return <span className="... bg-destructive/10 text-destructive">Out</span>;
      if (stock <= reorderLevel)
          return <span className="... bg-amber-500/10 text-amber-600">{stock}</span>;
      return <span className="... bg-emerald-500/10 text-emerald-600">{stock}</span>;
  }
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add client/src/pages/PointOfSale.tsx client/src/types/index.ts \
          server/src/controllers/product.controller.ts
  git commit -m "feat(pos): use product reorder_level for stock badge threshold instead of hardcoded 5"
  ```

**Checkpoint after Task 23:** `- [ ]` _(mark completed with note)_

---

# FULL PRIORITY SUMMARY

| # | Task | Phase | Priority | Status |
|---|------|-------|----------|--------|
| 1 | Add `clerk_id` to users + fix seed | DB | 🔴 Critical | `- [ ]` |
| 2 | CHECK constraint on `stock_ledgers` | DB | 🔴 Critical | `- [ ]` |
| 3 | Remove dangling `base_variant_id` | DB | 🟡 Minor | `- [ ]` |
| 4 | Customer email unique + name required | DB | 🟡 Minor | `- [ ]` |
| 5 | Remove dead local-auth code | DB/API | 🟠 Important | `- [ ]` |
| 6 | Fix `createPayment` bug (wrong field) | API | 🔴 Critical | `- [ ]` |
| 7 | Fix hardcoded `server_URI` | API | 🔴 Critical | `- [ ]` |
| 8 | Server env var validation at startup | API | 🟠 Important | `- [ ]` |
| 9 | Implement `getChartData` endpoint | API | 🟠 Important | `- [ ]` |
| 10 | Remove `console.log` from controllers | API | 🟡 Minor | `- [ ]` |
| 11 | Add rate limiting | API | 🟠 Important | `- [ ]` |
| 12 | Global error handler for Hono | API | 🟠 Important | `- [ ]` |
| 13 | Extract `parseCookie` utility | API | 🟡 Minor | `- [ ]` |
| 14 | Clarify invoice counter format | API | 🟡 Minor | `- [ ]` |
| 15 | Fix global query invalidation (stale UI) | FE | 🔴 Critical | `- [ ]` |
| 16 | Fix `handleScan` missing dep | FE | 🟠 Important | `- [ ]` |
| 17 | Add React error boundaries | FE | 🟠 Important | `- [ ]` |
| 18 | POS product row click feedback | FE | 🟠 Important | `- [ ]` |
| 19 | Restore Settings page | FE | 🟡 Minor | `- [ ]` |
| 20 | Wire chart to real endpoint | FE | 🟡 Minor | `- [ ]` |
| 21 | Remove dead commented-out code | Polish | 🟡 Minor | `- [ ]` |
| 22 | Migration log documentation | Polish | 🟡 Minor | `- [ ]` |
| 23 | Use `reorder_level` in StockBadge | Polish | 🟡 Minor | `- [ ]` |

---

## How to Use This Plan

1. Work tasks **in order** — later tasks may depend on earlier ones (noted in each task).
2. Before starting any task, create a git branch: `git checkout -b fix/<task-name>`.
3. Mark each step `[x]` as you complete it.
4. After each task, update the summary table status and add a completion note:
   ```
   **Checkpoint after Task N:** `- [x]` Completed 2026-06-21 — note any deviations here.
   ```
5. Merge branch → main after each task is fully verified.
6. If a task is blocked, mark `- [!]` and explain why in the checkpoint note.
