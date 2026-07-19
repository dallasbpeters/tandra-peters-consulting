# Quickstart & Validation: Branded Photo PDF Tool

Runnable checks that prove the feature works end-to-end. Details live in [plan.md](./plan.md), [data-model.md](./data-model.md), and [contracts/](./contracts/sanity-report-branding.md).

## Prerequisites

- Node + **pnpm** (never npm/yarn).
- Repo root: `/Users/dallas/Development/tandra-peters-consulting`.
- `.env.local` with Google auth allowlist (`VITE_GOOGLE_ALLOWED_EMAILS` / server `GOOGLE_ALLOWED_EMAILS`) and Sanity read config already present.
- New deps installed: `pnpm add vite-plugin-pwa heic2any` (and a dev a11y test helper, e.g. `pnpm add -D vitest-axe`). `@react-pdf/renderer` is already present.

## Setup & run

```bash
pnpm install
pnpm dev            # site on http://localhost:3001
# optional: pnpm dev:all  (site + Sanity Studio together)
```

Sign in at `/report` with an allowlisted Google account (same gate as `/seo`, `/marketing`).

## Validation scenarios

Map to spec User Stories (US) and Success Criteria (SC).

### 1. Core loop — photos → branded PDF (US1 / SC-001, SC-002, SC-003)

1. Open `/report`, authenticate.
2. Add several photos (camera + library). Confirm thumbnails appear in order (US1 #1).
3. Include at least one **HEIC** and one **rotated** photo — confirm both appear upright/undistorted in the preview (US1 #3 / SC-003).
4. Tap **Generate** → a branded PDF (Cover → photos → Contact) is produced and the save/share options appear (US1 #2, #4). Verify Birdcreek logo/footer on every page (SC-002) and the filename derives from title+date (FR-014).
5. Timebox: from open to saved PDF of ~10 photos in **under 2 minutes** (SC-001).

### 2. Report context, tables, sections (US2 / SC-010)

1. Enter title / address / date; leave date empty once and confirm today is used (US2 #3).
2. Add a caption and a **configurable table** (e.g. columns `Finding`, `Detail`) to a photo; confirm it renders beneath that photo (US2 #4). Leave a table blank and confirm it is **omitted** (FR-006a).
3. Create a roof-section heading, assign 2 photos, confirm they render grouped under it (US2 #5).
4. Confirm the Contact page shows Birdcreek phone/email/website/address from Sanity (FR-017); edit a value in Studio and regenerate to see it update (FR-005).

### 3. Live preview + swipe/split (SC-011 / FR-018, FR-018a, FR-019)

1. On iPhone width: confirm Editor and Preview are swipeable panes **and** a toggle/segmented control switches them without a gesture (FR-019).
2. Confirm structural changes (add/reorder/remove photo, add section) update the preview **instantly**; text/table edits update within ~1s of pausing (FR-018a).
3. Confirm the exported PDF matches the preview (FR-018 / SC-011).
4. On desktop width: confirm side-by-side layout (inputs left, preview right).

### 4. PWA install + offline (US3 / SC-004, SC-005)

1. Add `/report` to the iPhone home screen → branded icon installs (US3 #1).
2. Launch from the icon → full-screen standalone + branded splash (US3 #2 / SC-004).
3. Enable Airplane Mode → add photos, enter details, **generate**, and save/share fully offline (US3 #3 / SC-005).

### 5. Accessibility (SC-006 / FR-010)

1. Run the automated suite (below) — **zero** critical/serious axe violations.
2. Manual VoiceOver pass: every control has a name/role/state; pane switch and photo reorder are keyboard/switch operable; focus is managed on pane change.

### 6. Edge cases (spec Edge Cases / FR-011, FR-012)

- Generate with **no photos** → blocked with clear guidance (FR-011).
- 30-photo report → completes without crashing/freezing (SC-007).
- Very long title/caption → wraps/truncates, layout intact.
- Backgrounding mid-generation → resumes or fails cleanly, never a corrupt file (FR-012).

## Automated tests

```bash
pnpm test:run          # vitest (unit + component + axe)
pnpm check:types       # tsc --noEmit
pnpm check:lint        # eslint .
```

Expected: image-pipeline, layout-model, and filename unit tests pass; editor and pane-switcher component tests pass; axe reports no critical/serious issues; the layout-model structural snapshot is stable (SC-009).

## Definition of done (per Constitution Principle II)

- `pnpm check:types`, `pnpm check:lint`, and `pnpm test:run` all pass.
- The tool has been exercised in the **running** app (dev server on 3001) and, for the platform-specific pieces (HEIC, offline, share sheet, install/splash), on a **real iPhone** — not just asserted.
