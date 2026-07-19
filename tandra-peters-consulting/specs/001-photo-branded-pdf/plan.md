# Implementation Plan: Branded Photo PDF Tool

**Branch**: `001-photo-branded-pdf` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-photo-branded-pdf/spec.md`

## Summary

An auth-gated route inside the existing tandra.me SPA where Birdcreek staff turn iPhone photos into a branded, multi-page **Roof Inspection Report** PDF (Cover → Photo/body pages → Contact) and save/share it — all on-device. The screen is a two-pane editor: inputs on the left and a **live branded preview** on the right, presented as swipeable panes (with a toggle fallback) on phones and side-by-side on wider screens. The report layout is defined **once** as a normalized layout model + shared design tokens; that model is rendered to HTML for the live preview and to PDF via `@react-pdf/renderer` for export, so preview and output match. The tool installs as a PWA (branded icon + splash, offline-capable) and meets WCAG 2.1 AA. Vercel Blob persistence and per-PDF password links are **Phase 2** (out of scope here).

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2, Vite 6.4 (SPA).

**Primary Dependencies**: `react-router-dom` v7 (routing); `@react-pdf/renderer` `^4.5.1` (already installed — PDF export); `@fontsource-variable/hanken-grotesk`

- `@fontsource/ibm-plex-serif` (fonts); Sanity client (branding content); `iconoir-react` (icons); shared `useIsMobile` hook. **To add**: `vite-plugin-pwa` (manifest + service worker) and `heic2any` (HEIC→JPEG decode). All installs via **pnpm**.

**Storage**: None server-side in v1. Photos and the generated PDF are held only in-session in the browser (object URLs / in-memory) and are never uploaded or retained. Branding content (logo, footer, contact, optional colors) is read from Sanity. (Vercel Blob = Phase 2.)

**Testing**: Vitest + Testing Library (jsdom) — already configured (`vitest.config.ts`, `src/test/setup.tsx`). Accessibility assertions via `axe-core` (add `vitest-axe`/`jest-axe`). Real-device iPhone verification is manual per Constitution Principle II.

**Target Platform**: Mobile Safari on recent iPhones (primary); modern desktop browsers (secondary). Installable PWA (standalone display).

**Project Type**: Web SPA feature (client-only for v1; reuses existing serverless auth verification). No new `api/` endpoint in v1.

**Performance Goals**: Live preview updates instantly on structural changes and within ~1s of pausing on text/table edits (FR-018a/SC-011); a 10-photo report goes from open to saved PDF in under 2 minutes (SC-001); up to 30 photos generate without crashing on a recent iPhone (SC-007).

**Constraints**: Fully on-device generation, offline-capable after first load (FR-009/SC-005); WCAG 2.1 AA (FR-010); swipe must have a non-gesture fallback (FR-019); no photo/PDF retention (FR-015); preview must match export (FR-018); no secrets in client (Constitution V).

**Scale/Scope**: Internal tool; single-user sessions; ~1–30 photos per report; one new route + ~1 Sanity singleton + one site-wide PWA service worker.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| I. Content Lives in Sanity | PASS (with 1 justified deviation) | Logo, footer, and contact details for the report are sourced from Sanity (extends `siteSettings` / reuses `emailSignature`+`contactSection`). Report **brand colors** default to `src/theme.ts` tokens with optional Sanity overrides — see Complexity Tracking. |
| II. Fix Root Causes, Verify by Running | PASS | Plan mandates running the dev server on port 3001 and exercising the tool on an iPhone (or responsive emulation) before "done"; quickstart.md defines the runnable checks. |
| III. One Source of Truth for Design | PASS | Report layout tokens (page size, margins, type scale, colors) centralized in one `report-pdf` tokens module derived from `src/theme.ts`; preview CSS lives in a dedicated stylesheet (no inline `@media`); icons via `iconoir-react`; responsive logic via shared `useIsMobile`. |
| IV. Tandra's Voice & Brand Integrity | PASS | Static UI/report copy is first-person and roofer-natural; brand spelled `Birdcreek`; "Roof Inspection Report" wording matches the template; no Fort Worth/Tarrant references. |
| V. Guard the Toolchain & Stack Boundaries | PASS | `pnpm` only; stays Vite SPA (no Next.js); no reinstalled removed deps; no new `api/` handler importing from `src/`; allowlist/tokens stay in env; PWA via `vite-plugin-pwa` (not a framework migration). |

**Feature-specific gate — "fully tested" (SC-009)**: The spec explicitly requests tests, so automated Vitest + axe coverage of the core generation flow and accessibility paths is REQUIRED for this feature (overriding the default that tests are optional).

**Result**: PASS. One bounded deviation (Sanity-editable report colors) is documented in Complexity Tracking. No blocking violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-photo-branded-pdf/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── sanity-report-branding.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (existing)
└── tasks.md             # Created later by /speckit-tasks
```

> Note: spec tooling lives in the nested `tandra-peters-consulting/` folder, but all application code below lives at the **repo root** `/Users/dallas/Development/tandra-peters-consulting`.

### Source Code (repository root)

```text
src/
├── app.tsx                              # ADD route "/report" (inside RootLayout)
├── lib/
│   ├── backend-routes.ts                # ADD "/report" for backend theming/nav
│   └── report-pdf/
│       ├── tokens.ts                    # page size, margins, type scale, colors (from theme.ts)
│       ├── layout-model.ts              # normalized report → pages/blocks (single layout source)
│       ├── image-pipeline.ts            # HEIC→JPEG (heic2any), EXIF orient, downscale
│       └── filename.ts                  # title+date → PDF filename (FR-014)
├── pages/
│   └── report-pdf-page.tsx              # route page: auth gate + two-pane editor shell
├── components/
│   └── report-pdf/
│       ├── pane-switcher.tsx            # swipe + toggle/segmented control (FR-019)
│       ├── editor-pane.tsx              # report fields, photo list, per-photo editor
│       ├── photo-item-editor.tsx        # caption + configurable table + section heading
│       ├── report-preview.tsx           # HTML/CSS renderer of layout-model (preview)
│       └── report-document.tsx          # @react-pdf/renderer renderer of layout-model (export)
├── styles/
│   └── report-pdf.css                   # preview/report styles + tokens (no inline @media)
├── sanity/
│   ├── queries.ts                       # ADD report-branding projection
│   └── map-sanity-home.tsx              # ADD mapReportBranding()
└── hooks/
    └── isMobile.ts                      # REUSE useIsMobile

studio-tandra-peters/
└── schemaTypes/
    ├── documents/reportBranding.ts      # NEW singleton (logo, footer, contact, optional colors)
    ├── index.ts                         # register schema
    └── structure.ts                     # add singleton list item

public/                                  # existing PWA icons reused; add iOS splash images
vite.config.ts                           # ADD vite-plugin-pwa (manifest scoped to /report)
index.html                               # ADD/confirm apple-touch + splash link tags
```

**Structure Decision**: Single Vite SPA (no backend split). The feature is a new auth-gated route composed of a client-only editor + on-device PDF export, plus one Sanity singleton for branding content and a site-wide PWA service worker scoped so "install" targets the tool. It follows existing repo conventions: routes in `src/app.tsx` + `src/lib/backend-routes.ts`, auth via `useGoogleDashboardAuth`, Sanity schema→query→mapper→prop, and PDF via the already-present `@react-pdf/renderer`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Report **brand colors** editable in Sanity (touches Principle III "design tokens live in theme.ts") | Clarification Q2: Tandra must be able to edit the report's logo/colors/footer herself. The PDF is _output/content_ she owns, not the site's UI design system. | Hardcoding colors only in `theme.ts` would block Tandra from adjusting report branding without a developer (violates Principle I for this content). Mitigation: colors **default** to `theme.ts` tokens (single source of default truth); Sanity only provides optional overrides, keeping the site UI unaffected. |
| Site-wide PWA **service worker** (feature scoped to one route, SW is global) | A PWA/offline install inherently requires a global service worker; there is no per-route SW. | A route-only offline hack is not possible. Mitigation: manifest `scope`/`start_url` target `/report`; Workbox `navigateFallbackDenylist` excludes `/api/*`; precache limited to app shell + tool assets + fonts so existing dashboards and Sanity Presentation are unaffected. |
