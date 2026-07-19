# Tasks: Branded Photo PDF Tool

**Input**: Design documents from `/specs/001-photo-branded-pdf/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — the spec requests "fully tested" (SC-009), so Vitest + axe test tasks are part of each story.

**App root**: `/Users/dallas/Development/tandra-peters-consulting` (spec tooling lives in the nested `tandra-peters-consulting/` folder; all code paths below are repo-root-relative). Package manager is **pnpm**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (setup, foundational, polish have no story label)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, deps, and route wiring.

- [x] T001 Install dependencies with pnpm: `pnpm add vite-plugin-pwa heic2any` and `pnpm add -D vitest-axe` (confirm `@react-pdf/renderer` already present)
- [x] T002 [P] Create feature directories: `src/lib/report-pdf/`, `src/components/report-pdf/`, and an empty `src/styles/report-pdf.css`
- [x] T003 [P] Create `src/lib/report-pdf/tokens.ts` exporting report layout tokens (page size US Letter, margins, type scale, fonts, colors) derived from `src/theme.ts`
- [x] T004 Create stub page `src/pages/report-pdf-page.tsx` (placeholder), register route `path: "report"` in `src/app.tsx` (inside `RootLayout` children), and add `/report` to `src/lib/backend-routes.ts` for backend theming/nav

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared branding, image, layout-model, and dual-renderer plumbing all stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Add `reportBranding` singleton schema in `studio-tandra-peters/schemaTypes/documents/reportBranding.ts` (logo, footerText, phone, email, website, address, optional colorPrimary/Accent/Text) and register it in `studio-tandra-peters/schemaTypes/index.ts` + add singleton to `studio-tandra-peters/structure.ts` (documentId `reportBranding`), per `contracts/sanity-report-branding.md`
- [x] T006 [P] Add the `reportBranding` GROQ projection (resolve `logo.asset->url`) to `src/sanity/queries.ts`
- [x] T007 Add `mapReportBranding()` → `BrandProfile` in `src/sanity/map-sanity-home.tsx` (colors default to `src/theme.ts` when unset; graceful when doc missing) — depends on T006
- [x] T008 [P] Implement `src/lib/report-pdf/image-pipeline.ts`: HEIC→JPEG via `heic2any`, EXIF orientation baked via `createImageBitmap(blob,{imageOrientation:"from-image"})` → canvas downscale (~2000px max edge) → JPEG blob
- [x] T009 [P] Implement `src/lib/report-pdf/filename.ts`: derive PDF filename from report title + date (FR-014)
- [x] T010 Implement `src/lib/report-pdf/layout-model.ts` core: build `LayoutModel` (cover → photo body → contact pages, running header/footer, page numbers) from `Report` + `BrandProfile` + tokens — depends on T003
- [x] T011 Implement `src/components/report-pdf/report-preview.tsx` (HTML/CSS renderer of `LayoutModel` core blocks) + styles in `src/styles/report-pdf.css` — depends on T010
- [x] T012 Implement `src/components/report-pdf/report-document.tsx` (`@react-pdf/renderer` renderer of `LayoutModel` core blocks) and register fonts via the `src/lib/ad-canvas-fonts.ts` `?url` woff2 pattern — depends on T010
- [x] T013 Implement auth gate in `src/pages/report-pdf-page.tsx` using `useGoogleDashboardAuth` inline pattern (sign-in card when no token; editor container when authed) — depends on T004

**Checkpoint**: Branding, image pipeline, layout model, both renderers, and the auth-gated shell exist — story work can begin.

---

## Phase 3: User Story 1 - Turn phone photos into a branded PDF (Priority: P1) 🎯 MVP

**Goal**: On an iPhone, add photos, see a live branded preview, generate the Cover→Photos→Contact PDF, and save/share it.

**Independent Test**: Open `/report`, add several library photos (incl. HEIC + rotated), generate, and confirm a branded PDF is produced upright and saveable — no captions/tables/sections/PWA needed.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T014 [P] [US1] Unit test `image-pipeline` (orientation baked, HEIC branch, downscale cap) in `src/lib/report-pdf/__tests__/image-pipeline.test.ts`
- [x] T015 [P] [US1] Unit test `layout-model` core (cover + photo + contact pages, page numbers) in `src/lib/report-pdf/__tests__/layout-model.test.ts`
- [x] T016 [P] [US1] Unit test `filename` derivation in `src/lib/report-pdf/__tests__/filename.test.ts`
- [x] T017 [P] [US1] Component test editor: add/reorder/remove photos; Generate blocked when no photos (FR-011) in `src/components/report-pdf/__tests__/editor-pane.test.tsx`
- [x] T018 [P] [US1] Component test `pane-switcher`: swipe + toggle + keyboard tablist in `src/components/report-pdf/__tests__/pane-switcher.test.tsx`
- [x] T019 [P] [US1] axe test: zero critical/serious violations on editor + preview (SC-006) in `src/components/report-pdf/__tests__/a11y.test.tsx`

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement `src/components/report-pdf/pane-switcher.tsx`: swipeable Editor/Preview panes + accessible tablist toggle; side-by-side on wide screens via shared `useIsMobile` (`src/hooks/isMobile.ts`) (FR-019)
- [x] T021 [P] [US1] Implement `src/components/report-pdf/editor-pane.tsx`: report fields (title, address, date defaulting to today), photo add via `<input type="file" accept="image/*" capture>` (camera + library), thumbnail list with reorder/remove (FR-001/FR-004/FR-006)
- [x] T022 [US1] Wire photo intake through `image-pipeline` (store `processedImage` + `previewUrl`, revoke object URLs on remove) in `editor-pane.tsx` — depends on T021, T008
- [x] T023 [US1] Compose `src/pages/report-pdf-page.tsx`: EditorPane + ReportPreview inside PaneSwitcher; local `Report` state; read `BrandProfile` from Sanity context — depends on T013, T020, T021, T011
- [x] T024 [US1] Implement Generate in `report-pdf-page.tsx`: build `LayoutModel` → dynamically import and render `report-document` to a Blob, with visible progress and no-corruption handling (FR-012) — depends on T012, T010
- [x] T025 [US1] Implement Save/Share: `navigator.share({files})` with `<a download>` fallback, filename from `filename.ts` (FR-007/FR-014) — depends on T024, T009
- [x] T026 [US1] Ensure cover (logo, "Roof Inspection Report", "Inspected by", title/address/date) and contact page (Sanity phone/email/website/address) render in BOTH preview and PDF (FR-016/FR-017) — depends on T011, T012, T007
- [x] T027 [US1] Edge handling in editor/pipeline: unsupported/corrupt image surfaced (not silent), large-set downscale, long title/caption wrap-truncate (spec Edge Cases) — depends on T022

**Checkpoint**: US1 is a fully functional MVP — photos in, branded PDF out, save/share, on-device.

---

## Phase 4: User Story 2 - Add report context and captions (Priority: P2)

**Goal**: Add title/address/date/note, per-photo captions, an optional configurable-column table per photo, and roof-section grouping.

**Independent Test**: Add photos, set a caption + a `Finding/Detail` table on one, group two photos under a section, generate, and confirm all render correctly; blank tables are omitted; empty date defaults to today.

### Tests for User Story 2 ⚠️

- [x] T028 [P] [US2] Unit test `layout-model` content: caption/table blocks, blank-table omission (FR-006a), section grouping/pruning (FR-006b) in `src/lib/report-pdf/__tests__/layout-model-content.test.ts`
- [x] T029 [P] [US2] Component test configurable table editor (add/edit columns + rows, no cost column) in `src/components/report-pdf/__tests__/photo-item-editor.test.tsx`
- [x] T030 [P] [US2] Component test section create + assign photos grouping in `src/components/report-pdf/__tests__/sections.test.tsx`

### Implementation for User Story 2

- [x] T031 [US2] Extend `src/lib/report-pdf/layout-model.ts` with caption, configurable `DetailsTable` (no cost), and section grouping; prune blank/empty tables and empty sections — depends on T010
- [x] T032 [P] [US2] Extend `src/components/report-pdf/report-preview.tsx` to render caption/table/section blocks — depends on T031
- [x] T033 [P] [US2] Extend `src/components/report-pdf/report-document.tsx` to render caption/table/section blocks (parity with preview) — depends on T031
- [x] T034 [US2] Implement `src/components/report-pdf/photo-item-editor.tsx`: caption input + configurable-columns table editor + section assignment — depends on T021
- [x] T035 [US2] Add section management UI (create/name/order sections; assign photos) to `editor-pane.tsx` — depends on T034
- [x] T036 [US2] Wire overall note field + today-default date into the model (FR-006) — depends on T031

**Checkpoint**: US1 and US2 both work independently; the report reads as a real inspection summary.

---

## Phase 5: User Story 3 - Install and run like a native iPhone app (Priority: P3)

**Goal**: Installable PWA — branded icon + splash, full-screen standalone, and the full flow works offline after first load.

**Independent Test**: Add `/report` to the iPhone home screen, launch full-screen with splash, enable Airplane Mode, and complete add→generate→save offline.

### Tests for User Story 3 ⚠️

- [x] T037 [P] [US3] Test manifest config (scope/start_url `/report`, required icons present, standalone display) and SW registration config in `src/__tests__/pwa.test.ts`

### Implementation for User Story 3

> **Scope decision (user):** US3 shipped as **manifest-only** — no `vite-plugin-pwa` / service worker, to avoid scoping risk to existing routes and Sanity Presentation. The manifest + iOS meta tags are injected on the `/report` route only via `src/components/report-pdf/use-installable-manifest.ts` with `public/report.webmanifest`. This gives the installable home-screen icon + standalone/splash behavior (US3 #1/#2). Offline precaching (T041/SC-005) is **deferred** with the service worker; the on-device generate/save flow itself needs no network.

- [x] T038 [US3] ~~Add `vite-plugin-pwa`~~ → **manifest-only**: `public/report.webmanifest` (scope/start_url `/report`, reused `public/` icons, theme-color, standalone display) injected via `use-installable-manifest.ts` (no SW, no framework change)
- [x] T039 [P] [US3] iOS install/standalone meta tags (`apple-mobile-web-app-*`, `theme-color`) injected on `/report` via `use-installable-manifest.ts`; reuses existing `public/` icons
- [x] T040 [US3] ~~Register service worker~~ → **descoped** (manifest-only decision); manifest/meta injection is scoped to `/report` and mounts/cleans up per-route so existing routes and Sanity Presentation are unaffected
- [ ] T041 [US3] ~~Offline precaching~~ → **deferred** with the service worker (manifest-only). On-device generate/save needs no network; full offline app-shell precache is a follow-up if desired (FR-009/SC-005)

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T042 [P] Add edge/perf coverage: 30-photo generation smoke test (SC-007) and backgrounding-safety note in `src/lib/report-pdf/__tests__/generation-smoke.test.ts`
- [x] T043 [P] Confirm `src/styles/report-pdf.css` centralizes tokens and contains NO inline `@media` in React styles (Constitution III) — verified: `@media` lives only in `report-pdf.css`
- [x] T044 Type-check + lint pass: `tsc --noEmit` clean and `oxlint` clean on all feature files (the repo's real gate is ultracite/oxlint + tsc; the `check:types`/`check:lint` npm scripts are pre-existing broken stubs — no `eslint.config.*`, and `check:types` passes an unsupported glob)
- [x] T045 Full `vitest run` — 408 tests across 40 files pass, incl. component + axe (SC-009)
- [~] T046 Automatable validation done: production `vite build` + prerender succeed, `/report` serves 200 in the running dev server with clean transform/logs, lazy PDF chunks emitted, manifest served. **Real-iPhone checks remain (manual): HEIC decode on-device, share sheet, home-screen install + splash** — cannot be automated here
- [x] T047 Repo cleanliness: removed install-troubleshooting clutter — reverted `pnpm-workspace.yaml` `sharp: true`, dropped unused `node-addon-api` and `vite-plugin-pwa` from `package.json` + lockfile (manifest-only needs neither). No scratch files were created.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**.
- **User Stories (Phase 3–5)**: all depend on Foundational; then proceed in priority order (P1 → P2 → P3) or in parallel if staffed.
- **Polish (Phase 6)**: depends on the desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on US2/US3. MVP.
- **US2 (P2)**: after Foundational; extends the layout model + renderers + editor from US1's building blocks but is independently testable.
- **US3 (P3)**: after Foundational; PWA config is largely orthogonal to US1/US2.

### Within Each Story

- Tests written first and failing → then implementation.
- `layout-model` before renderers; renderers before page composition; editor before generate; generate before save/share.

### Parallel Opportunities

- Setup: T002, T003 in parallel.
- Foundational: T005, T006, T008, T009 in parallel (T007 after T006; T010 after T003; T011/T012 after T010; T013 after T004).
- US1 tests T014–T019 in parallel; impl T020 and T021 in parallel.
- US2 tests T028–T030 in parallel; T032 and T033 in parallel after T031.
- US3: T039 parallel with T038-dependent tasks.

---

## Parallel Example: User Story 1

```bash
# Tests (write first, expect fail):
Task: "Unit test image-pipeline in src/lib/report-pdf/__tests__/image-pipeline.test.ts"
Task: "Unit test layout-model core in src/lib/report-pdf/__tests__/layout-model.test.ts"
Task: "Unit test filename in src/lib/report-pdf/__tests__/filename.test.ts"
Task: "Component test pane-switcher in src/components/report-pdf/__tests__/pane-switcher.test.tsx"

# Then parallel implementation:
Task: "Implement pane-switcher.tsx"
Task: "Implement editor-pane.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 →
2. **STOP & VALIDATE**: photos → branded PDF → save/share on an iPhone → demo.

### Incremental Delivery

- Setup + Foundational → US1 (MVP, demo) → US2 (context/tables/sections, demo) → US3 (PWA install/offline, demo). Each story adds value without breaking prior.

---

## Notes

- No new `api/` endpoint in v1 (on-device generation; auth reuses existing Google verification). Vercel Blob persistence + per-PDF password links are **Phase 2**.
- [P] = different files, no incomplete dependencies.
- Commit after each task or logical group (only when the user asks to commit).
- Verify tests fail before implementing; verify the running app before "done".
