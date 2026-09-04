# UI Redesign — Foundation + Dashboard + POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic shadcn default look (green primary, DM Sans, gray surfaces) with the "Warm Retail, refined" design language across the design-token foundation and the two flagship pages (Dashboard, Point of Sale), including a restyle and type-reconsideration pass on Dashboard's two charts.

**Architecture:** This codebase is a Tailwind v4 + shadcn/ui app where every existing component already consumes semantic CSS custom properties (`bg-primary`, `text-muted-foreground`, etc.) rather than hardcoded colors — confirmed by reading `button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `table.tsx`. This means most of the visual transformation happens by replacing the **values** of those custom properties in `index.css`, not by rewriting components. The remaining work is: (1) a few places that bypass the token system with hardcoded Tailwind color utilities (`bg-emerald-500`, `text-green-600`, etc.) — these get retoned individually, and (2) the two Dashboard charts, which need restyling, better empty/loading states, and one chart-type change.

**Tech Stack:** React 19, Vite, Tailwind CSS v4 (CSS-first `@theme` config, no `tailwind.config.js`), shadcn/ui, Recharts 2.15, wouter, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-09-05-ui-redesign-design.md`

## Global Constraints

- Layout/navigation structure does not change — this is a visual-language pass only (per spec's explicit scope decision).
- No new automated tests — this is presentation-layer restyling of already-tested data flows. The existing server/client test suites must continue passing unchanged throughout.
- Every numeric value (currency, quantities, counts, percentages) gets monospace (IBM Plex Mono) treatment — this is a running requirement across every task, not a one-off.
- No all-caps labels, no eyebrow labels, no em-dash-joined meta text (spec's explicit anti-patterns, sourced from the `frontend-design` skill's calibration guidance).
- Verify by running the dev server and looking at the actual page in both light and dark mode — a production build passing is necessary but not sufficient.

---

### Task 1: Design tokens — palette, fonts, radius

**Files:**
- Modify: `client/src/index.css:7-67` (`@theme inline` block — add success/warning color mappings)
- Modify: `client/src/index.css:73-172` (`:root` — full light-mode token replacement)
- Modify: `client/src/index.css:181-264` (`.dark` — full dark-mode token replacement)

**Interfaces:**
- Produces: CSS custom properties `--success`, `--success-foreground`, `--warning`, `--warning-foreground` (new — needed because the codebase currently hardcodes amber/emerald ad hoc for these two semantic states; every later task that touches a status badge or trend indicator consumes these instead of hardcoded Tailwind colors). Produces Tailwind utility classes `bg-success`, `text-success`, `bg-warning`, `text-warning` (and `-foreground` variants) via the `@theme inline` mapping. Produces `font-serif` → Fraunces, `font-sans` → Work Sans, `font-mono` → IBM Plex Mono (existing Tailwind utility classes, new font values). All later tasks consume these.

- [ ] **Step 1: Add success/warning to the `@theme inline` color mapping**

In `client/src/index.css`, inside the `@theme inline { ... }` block, immediately after the existing `--color-destructive-border: var(--destructive-border);` line (currently line 40), add:

```css
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));

  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
```

- [ ] **Step 2: Replace the entire `:root` block (light mode)**

Replace the full `:root { ... }` block (starts `:root {` at line 73, ends with the matching `}` at line 172) with:

```css
/* ─────────────────────────────────────────────
   LIGHT MODE
   Palette: Warm Retail — brick rust on warm oat.
   Grounded in retail/ledger vernacular (mono
   numerals everywhere), not generic SaaS warmth.
   ───────────────────────────────────────────── */
:root {
  --button-outline: rgba(0, 0, 0, 0.10);
  --badge-outline: rgba(0, 0, 0, 0.05);
  --opaque-button-border-intensity: -8;
  --elevate-1: rgba(0, 0, 0, 0.03);
  --elevate-2: rgba(0, 0, 0, 0.07);

  /* ── Surfaces ── */
  /* Warm oat page background — deeper/more pigmented than the generic
     "AI cream" default so it doesn't read as templated */
  --background: 41 42% 85%;
  --foreground: 30 33% 11%;

  --border: 41 42% 80%;

  --card: 41 62% 95%;
  --card-foreground: 30 33% 11%;
  --card-border: 41 35% 82%;

  /* ── Sidebar: warm near-black (not pure black) ── */
  --sidebar: 30 33% 11%;
  --sidebar-foreground: 38 40% 88%;
  --sidebar-border: 30 28% 18%;
  --sidebar-primary: 16 75% 45%;
  --sidebar-primary-foreground: 38 83% 95%;
  --sidebar-accent: 30 28% 18%;
  --sidebar-accent-foreground: 38 30% 82%;
  --sidebar-ring: 16 75% 45%;

  /* Popover / dropdown */
  --popover: 41 62% 95%;
  --popover-foreground: 30 33% 11%;
  --popover-border: 41 35% 82%;

  /* ── Primary: brick rust ── */
  /* HSL 16 71% 39% ≈ #a8431d — saturated and specific, not the pastel
     terracotta that's become an AI-design cliché */
  --primary: 16 71% 39%;
  --primary-foreground: 38 83% 95%;

  /* ── Secondary: quiet warm neutral ── */
  --secondary: 41 30% 90%;
  --secondary-foreground: 30 30% 20%;

  /* ── Muted ── */
  --muted: 41 30% 90%;
  --muted-foreground: 38 24% 34%;

  /* ── Accent: pale rust tint ── */
  --accent: 16 55% 90%;
  --accent-foreground: 16 71% 28%;

  /* ── Destructive: deep red ── */
  --destructive: 0 50% 36%;
  --destructive-foreground: 38 83% 95%;

  /* ── Warning: ochre — low stock, partial payment ── */
  --warning: 36 77% 31%;
  --warning-foreground: 38 83% 95%;

  /* ── Success: muted retail green — in stock, paid ── */
  --success: 126 22% 29%;
  --success-foreground: 38 83% 95%;

  --input: 41 35% 80%;
  --ring: 16 71% 39%;

  /* ── Charts: rust, muted green, deep gold, dusty blue, plum ── */
  --chart-1: 16 71% 42%;
  --chart-2: 126 22% 32%;
  --chart-3: 38 70% 48%;
  --chart-4: 205 35% 42%;
  --chart-5: 280 25% 42%;

  /* ── Typography ── */
  /* Work Sans: UI text at speed — nav, labels, buttons, tables, forms */
  --app-font-sans: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  /* Fraunces: display — page titles, section headings, large stat figures */
  --app-font-serif: 'Fraunces', Georgia, serif;
  /* IBM Plex Mono: every number, no exception — receipt/ledger vernacular */
  --app-font-mono: 'IBM Plex Mono', Menlo, monospace;

  /* ── Geometry ── */
  --radius: 0.625rem;

  /* ── Shadows: crisp, functional ── */
  --shadow-2xs: 0px 1px 2px 0px rgba(15, 30, 50, 0.04);
  --shadow-xs:  0px 1px 3px 0px rgba(15, 30, 50, 0.06);
  --shadow-sm:  0px 1px 3px 0px rgba(15, 30, 50, 0.06), 0px 1px 2px -1px rgba(15, 30, 50, 0.04);
  --shadow:     0px 2px 6px 0px rgba(15, 30, 50, 0.07), 0px 1px 3px -1px rgba(15, 30, 50, 0.04);
  --shadow-md:  0px 4px 12px 0px rgba(15, 30, 50, 0.09), 0px 2px 4px -1px rgba(15, 30, 50, 0.05);
  --shadow-lg:  0px 8px 24px 0px rgba(15, 30, 50, 0.11), 0px 4px 6px -1px rgba(15, 30, 50, 0.05);
  --shadow-xl:  0px 16px 40px 0px rgba(15, 30, 50, 0.13), 0px 8px 10px -1px rgba(15, 30, 50, 0.05);
  --shadow-2xl: 0px 24px 60px 0px rgba(15, 30, 50, 0.17);

  --tracking-normal: 0em;
  --spacing: 0.25rem;

  /* ── Derived borders (opaque-relative) ── */
  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border:  hsl(from hsl(var(--sidebar-accent))  h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border:         hsl(from hsl(var(--primary))         h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border:       hsl(from hsl(var(--secondary))       h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border:           hsl(from hsl(var(--muted))           h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border:          hsl(from hsl(var(--accent))          h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border:     hsl(from hsl(var(--destructive))     h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}
```

- [ ] **Step 3: Replace the entire `.dark` block**

Replace the full `.dark { ... }` block (starts `.dark {` at line 181, ends with the matching `}` at line 264) with:

```css
/* ─────────────────────────────────────────────
   DARK MODE
   Warm near-black surfaces, brightened rust
   primary for contrast — not an inverted light
   mode, layered warm-dark tones.
   ───────────────────────────────────────────── */
.dark {
  --button-outline: rgba(255, 255, 255, 0.08);
  --badge-outline: rgba(255, 255, 255, 0.05);
  --opaque-button-border-intensity: 9;
  --elevate-1: rgba(255, 255, 255, 0.04);
  --elevate-2: rgba(255, 255, 255, 0.08);

  /* ── Surfaces ── */
  --background: 30 22% 9%;
  --foreground: 39 50% 90%;

  --border: 34 27% 18%;

  --card: 32 25% 12%;
  --card-foreground: 39 50% 90%;
  --card-border: 34 27% 20%;

  /* ── Sidebar: darkest layer ── */
  --sidebar: 30 24% 6%;
  --sidebar-foreground: 38 35% 85%;
  --sidebar-border: 34 24% 14%;
  --sidebar-primary: 20 65% 50%;
  --sidebar-primary-foreground: 38 83% 95%;
  --sidebar-accent: 34 24% 14%;
  --sidebar-accent-foreground: 38 30% 80%;
  --sidebar-ring: 20 65% 50%;

  /* Popover */
  --popover: 32 25% 12%;
  --popover-foreground: 39 50% 90%;
  --popover-border: 34 27% 20%;

  /* ── Primary: brighter rust for dark contrast ── */
  --primary: 20 65% 50%;
  --primary-foreground: 38 83% 96%;

  /* ── Secondary ── */
  --secondary: 33 20% 18%;
  --secondary-foreground: 38 35% 85%;

  /* ── Muted ── */
  --muted: 33 20% 18%;
  --muted-foreground: 36 18% 60%;

  /* ── Accent: deep rust tint ── */
  --accent: 20 40% 18%;
  --accent-foreground: 20 65% 70%;

  /* ── Destructive ── */
  --destructive: 0 45% 48%;
  --destructive-foreground: 38 83% 95%;

  /* ── Warning ── */
  --warning: 39 67% 55%;
  --warning-foreground: 30 33% 11%;

  /* ── Success ── */
  --success: 126 24% 52%;
  --success-foreground: 30 33% 11%;

  --input: 34 24% 20%;
  --ring: 20 65% 50%;

  /* ── Charts (brighter for dark bg) ── */
  --chart-1: 20 65% 55%;
  --chart-2: 126 25% 45%;
  --chart-3: 38 75% 58%;
  --chart-4: 205 40% 55%;
  --chart-5: 280 30% 55%;

  /* ── Shadows: heavier in dark — more dramatic depth ── */
  --shadow-2xs: 0px 1px 2px 0px rgba(0, 0, 0, 0.30);
  --shadow-xs:  0px 1px 3px 0px rgba(0, 0, 0, 0.36);
  --shadow-sm:  0px 1px 3px 0px rgba(0, 0, 0, 0.36), 0px 1px 2px -1px rgba(0, 0, 0, 0.24);
  --shadow:     0px 2px 6px 0px rgba(0, 0, 0, 0.36), 0px 1px 3px -1px rgba(0, 0, 0, 0.24);
  --shadow-md:  0px 4px 12px 0px rgba(0, 0, 0, 0.40), 0px 2px 4px -1px rgba(0, 0, 0, 0.24);
  --shadow-lg:  0px 8px 24px 0px rgba(0, 0, 0, 0.44), 0px 4px 6px -1px rgba(0, 0, 0, 0.24);
  --shadow-xl:  0px 16px 40px 0px rgba(0, 0, 0, 0.48), 0px 8px 10px -1px rgba(0, 0, 0, 0.24);
  --shadow-2xl: 0px 24px 60px 0px rgba(0, 0, 0, 0.56);

  /* ── Derived borders ── */
  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border:  hsl(from hsl(var(--sidebar-accent))  h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border:         hsl(from hsl(var(--primary))         h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border:       hsl(from hsl(var(--secondary))       h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border:           hsl(from hsl(var(--muted))           h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border:          hsl(from hsl(var(--accent))          h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border:     hsl(from hsl(var(--destructive))     h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}
```

- [ ] **Step 4: Verify the build**

Run: `cd client && bun run build`
Expected: builds cleanly, no CSS/Tailwind errors (Tailwind v4 validates `@theme` usage at build time — a typo'd variable name fails the build).

- [ ] **Step 5: Commit**

```bash
git add client/src/index.css
git commit -m "feat(design): replace default token palette with warm-retail system"
```

---

### Task 2: Font loading

**Files:**
- Modify: `client/index.html:12-15`

**Interfaces:**
- Consumes: nothing from Task 1 directly, but must ship in the same commit-adjacent state as Task 1 — the CSS references font-family names that don't exist until this task loads them.

- [ ] **Step 1: Replace the Google Fonts `<link>`**

In `client/index.html`, replace the existing font `<link>` (currently lines 12-15):

```html
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
```

with:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Verify fonts load**

Run: `cd client && bun run dev`, open the printed localhost URL in a browser, open devtools Network tab, filter for "fonts.googleapis" / "fonts.gstatic".
Expected: font requests for Fraunces, Work Sans, IBM Plex Mono succeed (200). Page text visibly renders in the new fonts (headings look serif, body looks like a grotesk sans, numbers monospace where already using `font-mono`/`tabular-nums`).

- [ ] **Step 3: Commit**

```bash
git add client/index.html
git commit -m "feat(design): load Fraunces/Work Sans/IBM Plex Mono"
```

---

### Task 3: Card primitive — border over shadow

**Files:**
- Modify: `client/src/components/ui/card.tsx:9-19`

**Interfaces:**
- Consumes: `--color-card-border` (Task 1).
- Produces: `Card` renders with no default shadow — every page using `<Card>` picks this up automatically, including Dashboard and POS in later tasks.

- [ ] **Step 1: Update the `Card` className**

In `client/src/components/ui/card.tsx`, change:

```tsx
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
```

to:

```tsx
    className={cn(
      "rounded-xl border border-card-border bg-card text-card-foreground",
      className
    )}
```

(Drops `shadow` — card separation now comes from the border alone, per spec. Uses the dedicated `card-border` token instead of the page-level `border` token for a subtler, surface-appropriate line.)

- [ ] **Step 2: Verify visually**

With `bun run dev` still running, open any page using `<Card>` (Dashboard once Task 6/7 land, or check now — Products page already uses cards). Confirm cards are separated by a thin border with no drop shadow beneath them, in both light and dark mode.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/card.tsx
git commit -m "feat(design): card separation via border, not shadow"
```

---

### Task 4: Retoken shared `StatusBadgeSales`

**Files:**
- Modify: `client/src/lib/utils.tsx:47-61`

**Interfaces:**
- Consumes: `--color-success`, `--color-warning`, `--color-destructive`, `--color-muted` (Task 1).
- Produces: `StatusBadgeSales({ status })` unchanged signature — Dashboard (Task 5) and, later, Sales.tsx (Plan 2) both already import and call this with no changes needed on their end.

- [ ] **Step 1: Replace the hardcoded color map**

In `client/src/lib/utils.tsx`, replace:

```tsx
export function StatusBadgeSales({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    DUE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

with:

```tsx
export function StatusBadgeSales({ status }: { status: string }) {
  // PAID/DUE/PARTIAL map to the three semantic states the palette
  // actually has (success/destructive/warning); CANCELLED is a closed,
  // non-urgent state, so it gets the quiet neutral treatment instead of
  // competing for attention with a status color.
  const map: Record<string, string> = {
    PAID: "bg-success/10 text-success",
    DUE: "bg-destructive/10 text-destructive",
    PARTIAL: "bg-warning/10 text-warning",
    CANCELLED: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}
```

(Also fixes a small pre-existing bug: the old code only capitalized the first letter, so `"PAID"` rendered as `"PAID"` not `"Paid"` — `.slice(1).toLowerCase()` actually produces sentence case now.)

- [ ] **Step 2: Verify the build**

Run: `cd client && bun run build`
Expected: builds cleanly, no type errors (function signature unchanged).

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/utils.tsx
git commit -m "fix(design): retoken StatusBadgeSales, fix sentence-case bug"
```

---

### Task 5: Dashboard — stat cards

**Files:**
- Modify: `client/src/pages/Dashboard.tsx:74-163`

**Interfaces:**
- Consumes: `--color-success`, `--color-destructive`, `--color-accent` (Task 1), `font-serif`/`font-mono` (Task 1/2).

- [ ] **Step 1: Drop the per-stat rainbow `color` field, unify icon chip styling**

In `client/src/pages/Dashboard.tsx`, the `stats` array (lines 74-110) currently assigns a different hardcoded Tailwind color to each stat's icon chip (`violet-100`/`blue-100`/`green-100`/`amber-100`) — purely decorative, no semantic meaning tied to any of the four stats. Replace the whole array with:

```tsx
  const stats = [
    {
      label: "Today's Revenue",
      value: formatCurrencyInBDT(satatData?.totalRevenueToday || 0),
      change: `${(statTrendData?.revenue.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.revenue.type === "UP",
      icon: DollarSign,
    },
    {
      label: "Today's Sales",
      value: satatData?.totalSalesToday || 0,
      change: `${(statTrendData?.sales.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.sales.type === "UP",
      icon: ShoppingBag,
    },
    {
      label: "Active Customers",
      value: satatData?.totalCustomers || 0,
      change: `${(statTrendData?.customers.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.customers.type === "UP",
      icon: Users,
    },
    {
      label: "Average Order Value",
      value: formatCurrencyInBDT(satatData?.averageOrderValue || 0),
      change: `${(statTrendData?.averageOrderValue.percentage || 0).toFixed(2)}%`,
      up: statTrendData?.averageOrderValue.type === "UP",
      icon: Package,
    },
  ];
```

- [ ] **Step 2: Update the stat card JSX**

Replace the stat card rendering block (lines 130-163):

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {stat.up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${stat.up ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs yesterday
                    </span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
```

with:

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-serif text-2xl font-semibold text-foreground mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {stat.up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span
                      className={`font-mono text-xs font-medium ${stat.up ? "text-success" : "text-destructive"}`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs yesterday
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-accent text-accent-foreground">
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
```

(`Card` no longer needs `className="border border-border"` — that's now `Card`'s own default per Task 3. Stat figures use `font-serif` per spec's "large stat-card figures where a serif treatment suits the emphasis." Trend arrow/percentage use the new `success`/`destructive` tokens instead of hardcoded `green-500`/`red-500`/`green-600`/`red-600`. Icon chip is now a single calm `accent` tint for all four stats instead of four arbitrary colors — no icon-in-circle decoration without meaning, per spec.)

- [ ] **Step 2: Verify visually**

`bun run dev`, view Dashboard in light and dark mode. Confirm: all four icon chips share one color, trend arrows are green/red via the new tokens (not the old hardcoded ones — check they still visually read as positive/negative), stat figures render in the serif font.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat(design): retoken Dashboard stat cards, drop decorative rainbow icons"
```

---

### Task 6: Dashboard — Weekly Sales chart

**Files:**
- Modify: `client/src/pages/Dashboard.tsx:1-38` (imports)
- Modify: `client/src/pages/Dashboard.tsx:165-231` (Weekly Sales `Card`)

**Interfaces:**
- Consumes: `ChartContainer`/`ChartTooltip`/`ChartTooltipContent` from `client/src/components/ui/chart.tsx` (existing, currently unused by this file), `--color-chart-1` (Task 1).

This task also adds a loading state (none exists today — the chart currently just renders empty if `weeklySalesGraphData` is `undefined`) and an empty state (no data for the week).

- [ ] **Step 1: Add imports**

In `client/src/pages/Dashboard.tsx`, replace the existing `recharts` import block (lines 14-25):

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
```

with (drops the raw `Tooltip` — replaced by `ChartTooltip` below; `ResponsiveContainer`/`PieChart`/`Pie` stay for now, removed in Task 7 once the category chart no longer needs them):

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
```

Also capture the weekly-sales query's `isFetching` flag — currently only `incomeTopProducts`/`incomeSalesHistory` destructure `isFetching`. Change:

```tsx
  const { data: incomeWeeklySalesGraph } = useGetData<{
    data: WeeklySalesEntry[];
  }>("/dashboard/get/weekly-sales-graph");
```

to:

```tsx
  const { data: incomeWeeklySalesGraph, isFetching: isWeeklySalesFetching } = useGetData<{
    data: WeeklySalesEntry[];
  }>("/dashboard/get/weekly-sales-graph");
```

- [ ] **Step 2: Define a chart config**

Immediately before the `export default function Dashboard()` line, add:

```tsx
const weeklySalesChartConfig = {
  sales: { label: "Revenue", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;
```

- [ ] **Step 3: Replace the Weekly Sales `Card`**

Replace the whole "Weekly Sales Chart" `Card` block (lines 168-231):

```tsx
        <Card className="xl:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Weekly Sales
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This Week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={weeklySalesGraphData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [`$${val}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
```

with:

```tsx
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-semibold">
                Weekly sales
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isWeeklySalesFetching ? (
              <Skeleton className="w-full h-[220px]" />
            ) : !weeklySalesGraphData || weeklySalesGraphData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm text-muted-foreground">No sales recorded this week</p>
                <p className="text-xs text-muted-foreground">New sales will appear here as they come in</p>
              </div>
            ) : (
              <ChartContainer config={weeklySalesChartConfig} className="aspect-auto h-[220px] w-full">
                <AreaChart
                  data={weeklySalesGraphData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontFamily: "var(--app-font-mono)", fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrencyInBDT(Number(value))}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
```

(The old tooltip formatted amounts as `$${val}` — a US dollar sign in an app that formats every other currency figure via `formatCurrencyInBDT`. Now consistent. Y-axis ticks get the mono font — they're numbers.)

- [ ] **Step 4: Verify visually**

`bun run dev`, view Dashboard. Confirm: chart area fills with the rust chart-1 color, hovering shows a themed tooltip (card background, border, correct currency formatting) instead of the old default Recharts white box. Temporarily test the empty state by changing the query key to a nonexistent endpoint or checking network tab for an empty response — confirm the "No sales recorded this week" message renders instead of a blank chart, then revert any test-only change.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat(design): restyle weekly sales chart, add empty/loading states"
```

---

### Task 7: Dashboard — Category breakdown (pie → horizontal bar)

**Files:**
- Modify: `client/src/pages/Dashboard.tsx` (imports, and the "Category Breakdown" `Card`, lines 233-283 as of Task 6's edits — re-check exact current line numbers before editing since Task 6 changed line counts in this file)

**Interfaces:**
- Consumes: `ChartContainer`/`ChartTooltip`/`ChartTooltipContent` (same as Task 6), `--color-chart-1..5` (Task 1).

The existing implementation renders a donut (`PieChart`) **and** a text list underneath showing the exact same data twice — the percentage list already does the job the pie is bad at (precise comparison across categories), so the pie is pure redundant decoration. Replacing both with a single horizontal bar list removes the duplication and reads faster, per spec's "reconsider chart types" scope.

- [ ] **Step 1: Update the `recharts` import block**

In `client/src/pages/Dashboard.tsx`, replace the import block left by Task 6:

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
```

with (drops `ResponsiveContainer`/`PieChart`/`Pie` — no longer used anywhere in this file once the category chart moves to `ChartContainer`+`BarChart` below; `Cell` stays, now used for per-bar coloring instead of per-slice; adds `BarChart`, `Bar`, `LabelList`):

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
```

- [ ] **Step 2: Delete the hardcoded `pieColors` array**

Remove line 39: `const pieColors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];` — colors now come from the `--chart-1..5` tokens via a chart config, matching Task 6's pattern.

- [ ] **Step 3: Add a chart config for category breakdown**

Next to `weeklySalesChartConfig` (added in Task 6, Step 2), add:

```tsx
const categoryChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];
```

- [ ] **Step 4: Capture `isFetching` for the category graph query**

Change:

```tsx
  const { data: incomeCategoryGraph } = useGetData<{
    data: CategorySalesEntry[];
  }>("/dashboard/get/category-graph");
```

to:

```tsx
  const { data: incomeCategoryGraph, isFetching: isCategoryGraphFetching } = useGetData<{
    data: CategorySalesEntry[];
  }>("/dashboard/get/category-graph");
```

- [ ] **Step 5: Replace the Category Breakdown `Card`**

Replace the "Category Breakdown" `Card` block:

```tsx
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Sales by Category
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This Week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-40 w-full mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryGraphData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryGraphData?.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryGraphData?.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: pieColors[i] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
```

with:

```tsx
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-semibold">
                Sales by category
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isCategoryGraphFetching ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-6" />
                ))}
              </div>
            ) : !categoryGraphData || categoryGraphData.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm text-muted-foreground">No category sales yet</p>
              </div>
            ) : (
              <ChartContainer
                config={{}}
                className="aspect-auto w-full"
                style={{ height: categoryGraphData.length * 36 }}
              >
                <BarChart
                  data={categoryGraphData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {categoryGraphData.map((_, i) => (
                      <Cell key={i} fill={categoryChartColors[i % categoryChartColors.length]} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      className="font-mono"
                      fill="hsl(var(--foreground))"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
```

This keeps `Cell` (still used for per-bar coloring) — add `LabelList` and `BarChart`/`Bar` to the `recharts` import block from Step 1.

- [ ] **Step 6: Verify visually**

`bun run dev`, view Dashboard. Confirm: category breakdown is now a horizontal bar per category, each bar a different token color, percentage labeled in mono at the bar's end, no leftover duplicate list underneath. Check loading (throttle network in devtools) and empty states.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat(design): replace category pie+duplicate-list with horizontal bar chart"
```

---

### Task 8: Point of Sale — stock badges, table hover, checkout summary

**Files:**
- Modify: `client/src/pages/PointOfSale.tsx:127-145` (`StockBadge`)
- Modify: `client/src/pages/PointOfSale.tsx:420` (product table row hover)
- Modify: `client/src/pages/PointOfSale.tsx:696-729` (footer totals)

**Interfaces:**
- Consumes: `--color-success`, `--color-warning`, `--color-destructive` (Task 1).

- [ ] **Step 1: Retoken `StockBadge`**

Replace:

```tsx
function StockBadge({ stock, status }: { stock: number; status: ProductTableRow["status"] }) {
  if (status === "OUT_OF_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
        Out
      </span>
    );
  if (status === "LOW_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600">
        {stock}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600">
      {stock}
    </span>
  );
}
```

with:

```tsx
function StockBadge({ stock, status }: { stock: number; status: ProductTableRow["status"] }) {
  if (status === "OUT_OF_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-destructive/10 text-destructive">
        Out
      </span>
    );
  if (status === "LOW_STOCK")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-warning/10 text-warning">
        {stock}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-success/10 text-success">
      {stock}
    </span>
  );
}
```

(Stock counts are numbers — added `font-mono`. "Out" is text, not a number, but keeping the same class on all three branches is simpler and harmless — mono renders "Out" fine.)

- [ ] **Step 2: Row hover as a tint of primary, not plain gray**

Per spec's table component pattern ("row hover in a tint of the primary rather than plain gray"), change the product table row's hover class. Replace:

```tsx
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
```

with:

```tsx
                      className="hover:bg-primary/5 transition-colors cursor-pointer"
```

- [ ] **Step 3: Retoken and mono-ify the checkout summary**

Replace (lines 696-729):

```tsx
          {/* Footer totals + charge */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-3 bg-card">
              <div className="space-y-1.5 text-sm">
                {totalDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{BDT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        -{BDT(totalDiscount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="tabular-nums">{BDT(total)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                <CreditCard className="w-4 h-4" />
                Charge {BDT(total)}
              </Button>
            </div>
```

with:

```tsx
          {/* Footer totals + charge */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-3 bg-card">
              <div className="space-y-1.5 text-sm">
                {totalDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">{BDT(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span className="font-mono tabular-nums">
                        -{BDT(totalDiscount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{BDT(total)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                <CreditCard className="w-4 h-4" />
                <span className="font-mono">Charge {BDT(total)}</span>
              </Button>
            </div>
```

- [ ] **Step 4: Verify visually**

`bun run dev`, open POS, add a product with a discount to the cart. Confirm stock badges show the new colors (rust-family success/warning/destructive, not emerald/amber), hovering a product row shows a rust tint instead of gray, and the checkout summary numbers render in monospace.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/PointOfSale.tsx
git commit -m "feat(design): retoken POS stock badges, table hover, checkout summary"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the client production build**

Run: `cd client && bun run build`
Expected: succeeds, no TypeScript or Tailwind errors.

- [ ] **Step 2: Run the full server test suite (must be untouched by this plan)**

Run: `cd server && bun test src/__tests__/**/*.test.ts`
Expected: same pass count as before this plan started (101/101 as of the last audit-fix session) — this plan touches no server code, so any change here indicates something went wrong.

- [ ] **Step 3: Manual visual pass — light mode**

`cd client && bun run dev`, open Dashboard and Point of Sale in a browser with system/app theme set to light. Check: page background is warm oat (not the old cool gray), primary buttons/accents are brick rust (not green), stat figures and section headings render in the serif font, all numeric values (stat figures, chart axes, prices, stock counts) render in monospace, both charts show the new palette and correct tooltip formatting, cards have a visible border and no drop shadow.

- [ ] **Step 4: Manual visual pass — dark mode**

Toggle to dark mode (or set `class="dark"` on `<html>` via devtools if there's no in-app toggle yet — check `client/src/components/Layout.tsx` and `client/src/main.tsx` for how dark mode is currently activated, since no toggle was found during original audit). Repeat the same checks as Step 3. Confirm rust primary is legibly brighter against the dark background (not muddy), and success/warning/destructive badges remain readable.

- [ ] **Step 5: Commit (if Step 3/4 surfaced any fixes)**

If the manual visual pass found anything (e.g. a contrast issue, a missed hardcoded color), fix it, re-verify, and commit with a message describing what was caught — e.g. `git commit -m "fix(design): improve rust-on-dark contrast on stat trend text"`.

---

## After this plan

Once Dashboard and POS are reviewed and approved, write **Plan 2** covering the remaining pages (Products, Product Details, Purchases, New Purchase, Customers, Sales — including `OrderStatusChart.tsx`'s own pie-vs-bar reconsideration, since that's the chart the original design brief specifically flagged — Admin, Settings, Login, not-found), applying the same token system (already shipped, no further foundation work needed) and catching page-specific visual rough edges as encountered, per the spec's rollout section.
