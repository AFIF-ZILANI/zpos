# UI/UX Redesign — Design Spec

## Goal

The app (client/, 11 pages on shadcn/ui + Tailwind v4) is functionally solid post-audit but visually generic — the default shadcn look (green primary, DM Sans, gray surfaces) reads as templated rather than a considered product. This spec defines a distinct visual language and applies it across the app, including the Dashboard's charts, without changing the underlying page structure or navigation.

## Scope

**In scope:**
- A new design token system (color, type, shape/spacing) replacing the current defaults
- Component-level restyle: cards, buttons, badges/status pills, tables, forms
- Chart restyle + interaction improvements (tooltips, empty/loading states) + reconsidering chart type where a pie chart is the wrong fit
- Rollout across all 11 pages, starting with Dashboard + Point of Sale as the flagship pair
- Visual/UX rough edges caught and fixed page-by-page during rollout (inconsistent spacing, alignment, missing empty/loading states) — not a separate audit

**Out of scope (explicitly deferred by user's answers):**
- Navigation structure / page organization / sidebar shape — stays as-is
- New features or workflow changes — this is a visual pass, not a UX re-engineering pass
- The backend/security audit (`docs/PRE_LAUNCH_AUDIT.md`) — already complete, unrelated to this work

## Design direction

Selected via visual comparison (three directions shown, refined once against `frontend-design` skill guidance to avoid the most common AI-generated-design cliché — warm cream + terracotta + generic serif was the initial pick and was deliberately pulled away from that exact formula):

**"Warm Retail, refined"** — confident and tactile rather than corporate-SaaS, grounded in retail/ledger vernacular (receipt printing → monospace numerals) rather than generic warmth.

## Design tokens

### Color — light (primary mode; POS is used at a counter, likely bright environment)

| Token | Hex | Use |
|---|---|---|
| `background` | `#e9dfc9` | page background — warm oat, not stark cream |
| `card` | `#faf5ea` | card/surface fill |
| `border` | `#e2d5b8` | card borders, dividers, table rules |
| `foreground` (ink) | `#241b12` | primary text |
| `muted-foreground` | `#6b5c42` | secondary text, labels |
| `primary` | `#a8431d` | brand accent — brick rust, more saturated than the cliché pastel terracotta |
| `primary-foreground` | `#fdf6ea` | text/icons on primary |
| `success` | `#3a5a3d` / bg `#e2ede2` | in-stock, positive trend, paid status |
| `destructive` | `#8b2e2e` / bg `#f4e1de` | low stock, negative trend, errors |

### Color — dark

| Token | Hex |
|---|---|
| `background` | `#1c1712` |
| `card` | `#251e16` |
| `border` | `#3a2f21` |
| `foreground` | `#f2e9d8` |
| `primary` | `#d2652e` (brightened for contrast against dark bg) |

Success/destructive tokens shift the same way — desaturate the bg tint, brighten the foreground, same hue family.

### Typography

Three families, each with one clear job (per `frontend-design` guidance — not decoration, not a mismatched pairing):

- **Fraunces** (variable, optical sizing) — display: page titles, section headings, large stat-card figures where a serif treatment suits the emphasis.
- **Work Sans** — UI: nav, labels, buttons, form fields, table body text, everything read at speed.
- **IBM Plex Mono** — all numeric data without exception: prices, quantities, stat figures, table amounts, invoice/barcode numbers. Ties to receipt/ledger printing — specific to a POS, not decorative monospace.

Sentence case throughout — no all-caps labels (a flagged AI-design tell). No eyebrow labels, no em-dash-joined meta strings.

### Shape / spacing

- Radius: 10–16px scaled by element size (buttons smaller, cards larger) — not one radius applied uniformly regardless of hierarchy.
- Card separation via 1px warm-toned border, not drop shadow (avoids the generic "SaaS card kit" look flagged in the design guidance).
- Existing 8px spacing scale (Tailwind default) retained.

## Component patterns

- **Stat cards** — sentence-case label, mono figure, trend line with color-coded arrow (success/destructive tokens). No decorative icon-in-circle unless the icon carries real meaning.
- **Status badges/pills** (stock level, sale payment status, invite status) — small mono-numeral pills on success/warning/destructive token backgrounds, replacing default shadcn `Badge` variants.
- **Tables** — tabular-numeral alignment on every numeric column (right-aligned, mono), quieter header row (muted-foreground, no fill), row hover as a tint of `primary` rather than plain gray.
- **Buttons** — primary: rust fill. Secondary: bordered, no fill (quiet). No new button variants beyond what shadcn's `Button` already supports — just retokened.
- **Forms** — warm-toned borders and focus ring (derived from `primary`) instead of the current default blue-ish ring.

## Charts (Dashboard: weekly sales area chart, order-status chart)

- **Restyle**: recolor to the new chart palette (rust, muted green, deep gold, dusty blue, plum — derived from the token system, not Recharts' saturated defaults), axis/legend text in Work Sans, gridlines quieted to the `border` token.
- **Interaction**: replace the default Recharts tooltip with a themed custom tooltip; add a real empty state (message + icon, not a blank chart area) for zero-data ranges; skeleton shimmer instead of a spinner while loading (`Skeleton` component already exists in the codebase).
- **Type reconsideration**: the order-status **pie chart** is a weak fit — pies are hard to compare precisely past 2-3 slices. Default plan: replace with a horizontal or stacked bar (reads faster, pairs naturally with mono numerals for the counts). Final call made once implementing against real data shape — if order-status realistically only ever has 2-3 states, a pie may still be defensible and this gets revisited in-place rather than forced.

## Rollout order

1. **Foundation**: token system in `index.css` (`@theme` block + light/dark `:root`/`.dark` values), font loading, retoken shared primitives (`Button`, `Card`, `Badge`, `Table`, form inputs) in `client/src/components/ui/`.
2. **Flagship pair**: Dashboard (proves the language against data-dense stat cards + tables + both charts) and Point of Sale (proves it against the core workflow screen — cart, product grid, checkout modal). User reviews both before continuing.
3. **Full rollout**: remaining pages in one continuous pass — Products, Product Details, Purchases, New Purchase, Customers, Sales, Admin, Settings, Login, not-found — applying the same retoken components plus catching page-specific visual rough edges as encountered.

## Testing / verification

- Dev server (`bun run dev` in `client/`) checked visually in the browser at each stage — light and dark mode both — not just a production build check. Visual work is verified by looking at it.
- Production build (`bun run build`) run before each rollout stage is considered done, same as prior sessions in this project.
- No new automated tests expected for this work (it's presentation-layer restyling of existing, already-tested data flows) — existing server/client test suites must continue passing unchanged.

## Open questions / risks

- Exact hex tuning for accessible contrast (WCAG AA) on the rust-on-oat and rust-on-dark combinations needs a contrast check during implementation, not just eyeballing.
- Fraunces variable font adds a font-loading dependency (Google Fonts, or self-hosted) — self-host under `client/public/fonts/` to avoid a runtime dependency on Google's CDN for a production POS terminal; decide at implementation time.
