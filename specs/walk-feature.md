---
name: Desk Walk — Per-Home Canvass Tracking
description: Mobile-first view where a canvasser walks a saved canvass target/zone and tracks each home — status, notes, and non-PII property info. Addresses come from the existing RentCast desk-audience pipeline; per-home visit state persists to Sanity with an offline-friendly local queue.
targets:
  - src/pages/walk-session-page.tsx
  - src/components/desk/walk/**
  - src/hooks/use-walk-homes.ts
  - src/lib/desk-walk.ts
  - src/lib/desk-walk-sheet.ts
  - api/desk-walk.ts
  - api/desk-homes.ts
  - api/lib/desk-walk.ts
  - api/lib/desk-direct-mail.ts
  - studio-tandra-peters/schemaTypes/documents/desk-walk-visit.ts
  - src/styles/desk.css
status: draft
---

# Desk Walk — Per-Home Canvass Tracking

## 1. Purpose

A NEW, highly **mobile-optimized** view where a canvasser opens a saved canvass target ("zone") and works it **door by door**: see every home in the zone, open one home, **set a status**, **jot notes**, and **view non-PII property info** (address + roof/age signals). Built for one-handed field use on a phone.

Derived from the analyzed competitor demo ("THRESH — Win The Door") plus this repo's existing desk-audience + saved-target groundwork.

### Hard constraints

- **Privacy (project rule):** NEVER display homeowner personal names. Show the address and property attributes only. RentCast owner name is fetched by the pipeline for deliverability but MUST be stripped before reaching the client.
- **Voice:** natural roofer vocabulary (no architectural jargon). "the walk", "knocked", "come back", "left a door hanger".
- Package manager `pnpm`; icons `iconoir-react`; inputs `@awesome.me/webawesome` (camelCase props, `WaOption` text in children); no barrel files; kebab-case filenames; styles centralized in `src/styles/desk.css` (no inline `@media`).

### Reconciliation with existing files

- `src/lib/desk-walk-sheet.ts` — existing **neighborhood-level** CSV export ("Walk sheet" button). KEEP it unchanged; the per-home walk is a new, richer layer. The new `src/lib/desk-walk.ts` holds per-home logic (do not overload the CSV file).
- `sketches/the-walk.html` / `sketches/where-i-walk.html` — despite the names, these are marketing sketches (roof-anatomy diagram; service-area map), NOT the canvasser walk UI. Borrow their **design tokens/interaction feel** only (kicker+hairline, serif display / sans UI, tap-to-expand cards, reduced-motion guard). See Open Question O1.

## 2. Per-home data model

### 2.1 Home (roster item — from RentCast, read-only, non-PII)

| Field | Type | Source | Notes |
| --- | --- | --- | --- |
| `homeKey` | string | RentCast `id`, else `sha1(lower(addressLine1) | zip)` | stable id; covers homes with no RentCast id |
| `address` | string | `formattedAddress`/composed | displayed |
| `addressLine1`,`city`,`state`,`zip` | string | RentCast | structured |
| `latitude`,`longitude` | number | RentCast | map pin |
| `yearBuilt` | number \| null | RentCast | drives roof-age signal |
| `homeAge` | number \| null | derived (`currentYear - yearBuilt`) | display |
| `squareFootage`,`propertyType` | number/string \| null | RentCast | optional attributes |
| `ownerOccupied` | boolean \| null | RentCast | targeting signal (not a name) |
| **`ownerName`** | — | **STRIPPED** | never sent to client |

Roof-age display: use `homeAge`/`yearBuilt` directly; when null, fall back to the zone's `medianYearBuilt`/`medianHomeAge` already stored on the target's `neighborhoods[]`. No true roof-replacement date exists in the source.

### 2.2 Visit (user-entered, persisted)

| Field                   | Type           | Notes                          |
| ----------------------- | -------------- | ------------------------------ |
| `homeKey`               | string         | matches roster item            |
| `targetId`              | string         | parent `deskCanvassTarget._id` |
| `status`                | enum (below)   | required                       |
| `notes`                 | string (≤1400) | optional                       |
| `followUpDate`          | date           | optional                       |
| `updatedAt`,`createdAt` | datetime       | server-set                     |
| `createdBy`             | string         | Google email                   |

### 2.3 Status set (recommended — confirm in O2)

Single per-home enum, roofer-natural, distilled from the demo's two vocabularies:

- `not-started` — Not knocked yet (default)
- `no-answer` — Nobody home
- `talked` — Spoke with the homeowner
- `not-interested` — Declined
- `come-back` — Callback / return later (pairs with `followUpDate`)
- `left-material` — Door hanger / letter dropped
- `booked` — Inspection booked (success)
- `skip` — Do not contact (rental / no-solicitation / hostile)

Each status has a label + color token in `src/components/desk/constants.ts` (reuse the `desk-status--*` CSS pattern already used by saved targets).

## 3. Screens & flows (mobile-first)

### Flow

1. **Entry** — From the Desk canvassing planner, each `SavedTargetCard` (`src/components/desk/neighborhood-row.tsx`) gains a **"Walk area"** primary button next to the existing "Use area" / "Walk sheet". It routes to `/desk/walk/:targetId`. (The existing "Use area" behavior is unchanged.)
2. **Roster (list + map)** — `walk-session-page` loads the target + roster.
   - Sticky top: zone name, **progress** (`N of M knocked`, count by status).
   - **Map** (reuse `DeskAreaMap`) with a pin per home, colored by status; tapping a pin opens that home.
   - **List** below/beside: one row per home = address + roof-age chip + status pill. Large tap targets (min 44px). Sort by "walking order" (nearest-first or as-returned) and filter by status.
   - Toggle: List ⇄ Map (bottom segmented control on mobile).
3. **Per-home detail (bottom sheet)** — tapping a row/pin opens a **bottom sheet** (mobile) / side panel (desktop):
   - Address, roof-age / year-built, property attributes (NO name).
   - **Status control** — large chip grid (one tap sets status; optimistic).
   - **Notes** — `WaTextarea`, placeholder "What happened at the door…".
   - **Follow-up date** — date input, shown when status = `come-back`.
   - Prev / Next home stepper to move without closing.
4. **Progress overview** — header summary + a compact status breakdown; a "Done for today" affordance returns to the planner. Optionally export the worked roster (extend `desk-walk-sheet.ts` with a per-home CSV variant).

### Mobile interactions

- Bottom sheet with drag-to-dismiss; status chips are thumb-sized.
- Swipe left/right inside the sheet = prev/next home (optional, O4).
- Sticky bottom action bar for the primary status.
- Offline-friendly: see §4.3.

### Edge cases

- Zone has 0 matched homes (missing coords / polygon over no homes) → empty state mirroring `AddressPreviewModal` copy.
- Roster capped at `ADDRESS_LIST_HARD_CAP` (750) → show "showing first 750" note.
- Polygon zones: RentCast is radius-only → **post-filter roster with point-in-polygon** (server copy of `pointInRing` from `src/lib/desk-geo.ts`).
- Home with no `yearBuilt` → hide roof-age chip, fall back to zone median.
- Not signed in / not on Google allowlist → gated like `/api/desk-targets`.
- Duplicate addresses → dedupe by `homeKey` (same key as `collectSubmitRecipients`).

## 4. Data source & persistence

### 4.1 Roster (addresses) — reuse existing pipeline

Extend `api/lib/desk-direct-mail.ts` with `collectHomeRoster(payload)` reusing `resolveQueryNeighborhoods` + `fetchMatchedProperties`, returning FULL per-home records (parse `id`, `yearBuilt`, `latitude/longitude`, attributes) **minus owner name**. New handler `POST /api/desk-homes` (Google-auth gated, same shape as `/api/desk-direct-mail`) → `{ ok, homes[], capped, total }`. Dev mirror plugin modeled on `plugins/vite-desk-direct-mail-api.ts`, registered in `vite.config.ts`.

### 4.2 Visit state — persist to **Sanity** (matches repo pattern)

Follow `/api/desk-targets` + `api/lib/desk-targets.ts` exactly:

- New Sanity doc `deskWalkVisit`, **one doc per home**, deterministic id `drafts.deskWalkVisit.${targetId}.${homeKey}` so `createOrReplace` upserts idempotently without clobbering siblings (do NOT store a giant array on `deskCanvassTarget`).
- New `POST /api/desk-walk` with actions `list` (by `targetId`) and `upsert`. Google-auth gated; `SANITY_WRITE_TOKEN`/`SANITY_API_WRITE_TOKEN`. Dev mirror plugin like the direct-mail one.
- Reads go through the API (auth-gated drafts), NOT `useSanityQuery` (that's for public content). Client hook mirrors `use-canvass-targets.ts`.
- Server merges roster (RentCast) ⊕ visits (Sanity) by `homeKey`.

### 4.3 Offline-friendliness (mobile)

Local optimistic layer in `use-walk-homes.ts`: write each status/notes change to `localStorage` immediately (queue), reflect in UI instantly, POST to `/api/desk-walk` in the background, and flush the queue on reconnect (`online` event). Roster is also cached per target so re-opening works without a network round trip.

## 5. Connection to existing Desk flow

- Entry is the **saved canvass target** (`deskCanvassTarget`), created by the existing planner. "Use area" (reopen in builder) is unchanged; "Walk area" is the new door-by-door mode.
- Reuses `useCanvassTargets`, `useAreaIntel`, `DeskAreaMap`, `desk-format` helpers, `canvassStatus*` conventions.
- Route added under `RootLayout` children in `src/app.tsx` (lazy import), path `desk/walk/:targetId`.

## 6. New files (repo conventions)

| File | Purpose |
| --- | --- |
| `src/pages/walk-session-page.tsx` | Route page (`/desk/walk/:targetId`), lazy-registered in `src/app.tsx` |
| `src/components/desk/walk/walk-session.tsx` | Orchestrator: header, progress, list⇄map toggle |
| `src/components/desk/walk/home-roster-list.tsx` | Scrollable home list |
| `src/components/desk/walk/home-row.tsx` | One home row (address + roof-age chip + status pill) |
| `src/components/desk/walk/home-detail-sheet.tsx` | Bottom sheet / side panel: attributes + status chips + notes + follow-up |
| `src/components/desk/walk/walk-progress.tsx` | Progress summary + status breakdown |
| `src/hooks/use-walk-homes.ts` | Roster load + visit upsert + optimistic/offline queue |
| `src/lib/desk-walk.ts` | Types, status enum/labels, homeKey + merge helpers (client) |
| `api/desk-homes.ts` | Serverless roster endpoint (RentCast, non-PII) |
| `api/desk-walk.ts` | Serverless visit list/upsert endpoint |
| `api/lib/desk-walk.ts` | Sanity read/write for `deskWalkVisit` (like `api/lib/desk-targets.ts`) |
| `plugins/vite-desk-homes-api.ts`, `plugins/vite-desk-walk-api.ts` | Dev mirrors (register in `vite.config.ts`) |
| `studio-tandra-peters/schemaTypes/documents/desk-walk-visit.ts` | Sanity schema (register in `index.ts` + structure) |
| CSS additions in `src/styles/desk.css` | Walk view + bottom-sheet + status chip styles |

Extend (do not fork): `api/lib/desk-direct-mail.ts` (`collectHomeRoster`), `src/components/desk/constants.ts` (walk status labels/order), `src/lib/desk-walk-sheet.ts` (optional per-home CSV variant).

## 7. Tests

- [@test](../src/lib/desk-walk.test.ts) — homeKey derivation (with/without RentCast id), roster⊕visit merge, status label map.
- [@test](../api/lib/desk-walk.test.ts) — upsert idempotency (deterministic `_id`), owner-name stripping, polygon post-filter, cap handling.

## 8. Open questions / decisions

- **O1.** The two `sketches/*walk*.html` files are marketing pages, not the walk UI. Confirm we design fresh from the demo + design tokens (assumed), or is there another intended sketch?
- **O2.** Confirm the §2.3 status set (single 8-value enum) vs. the demo's split (knock-outcome + pipeline). Any status that must map to CRM/lead stages?
- **O3.** OK to persist per-home notes/status in Sanity `deskWalkVisit` drafts (auth-gated, no names)? Any retention limit?
- **O4.** Offline scope for v1: full offline queue + roster cache (recommended), or online-only responsive? Swipe navigation in scope?
- **O5.** RentCast plan: confirm the properties response reliably returns `yearBuilt`/attributes for the target areas (owner name intentionally discarded).
- **O6.** Should the worked roster be exportable (per-home CSV) or is on-screen progress enough for v1?

## 9. Assumed decisions for v1 build (adjustable)

- **O1** → design fresh from the demo + shared design tokens.
- **O2** → ship the 8-value enum above; no CRM stage mapping in v1.
- **O3** → persist to auth-gated Sanity `deskWalkVisit` drafts; no retention limit yet.
- **O4** → full offline queue + roster cache in v1; swipe navigation deferred to a follow-up.
- **O5** → assume RentCast returns `yearBuilt`/attributes; gracefully degrade when null.
- **O6** → on-screen progress for v1; per-home CSV export as a low-risk extra if cheap.
