# Phase 0 Research: Branded Photo PDF Tool

All decisions below are constrained by: on-device (no server) generation, offline-capable, iPhone-first, WCAG 2.1 AA, and "preview must match export".

## 1. Preview + export architecture (how to satisfy FR-018 "single layout definition")

**Decision**: One **normalized layout model** (`layout-model.ts`) + one shared **tokens** module are the single source of layout truth. Two thin presenters consume them: an **HTML/CSS** `report-preview.tsx` for the live preview and a `@react-pdf/renderer` `report-document.tsx` for export.

**Rationale**:

- Clarification Q1 explicitly chose an HTML/CSS live preview (smoothest on iPhone) with the PDF "generated from the same layout on export."
- `@react-pdf/renderer` `^4.5.1` is **already installed and used** in `src/components/desk/postcard-pdf.tsx`, is pure client-side (offline-capable), and produces a `Blob` we can name (FR-014) and hand to the native share sheet.
- Driving both renderers from one model + tokens keeps it DRY and makes parity a matter of matching geometry/fonts, not maintaining two layouts.

**Alternatives considered**:

- **`@react-pdf/renderer` `<PDFViewer>` for the preview too** (perfect parity, one renderer): rejected as the _default_ because its canvas/iframe preview re-renders the whole PDF on every edit and is sluggish on mobile — contradicts the "live" swipe UX and FR-018a instant structural updates. Kept as a fallback if HTML/PDF parity drift proves unmanageable.
- **`html-to-image` + rasterize to PDF** (already in repo via `ad-canvas-editor`): rejected — rasterized text is not selectable/accessible, bloats file size, and degrades on large photo sets.
- **`window.print()` / print stylesheet**: rejected as primary — cannot hand a named `File` to `navigator.share()` on iOS, and offers little filename control.
- **Server-side Puppeteer/Playwright render**: rejected — violates on-device + offline v1 constraints (FR-009/FR-015).

**Parity-drift mitigation**: shared page geometry (US Letter, 96dpi preview / 72pt PDF mapping), shared spacing/type tokens, identical embedded fonts, and a structural snapshot test over the layout model. `@react-pdf`'s flexbox subset maps cleanly to the preview CSS we author.

## 2. Fonts in the PDF (Hanken Grotesk Variable + IBM Plex Serif)

**Decision**: Register fonts with `@react-pdf/renderer` `Font.register()` using the woff2 files imported via Vite `?url`, following the existing pattern in `src/lib/ad-canvas-fonts.ts`. Use a **static-weight** IBM Plex Serif (400/700) and a static instance of Hanken Grotesk for headings/UI.

**Rationale**: `@react-pdf/renderer` does not support variable-font axes; it needs concrete weight files. The repo already imports these woff2 assets; reuse the `?url` → fetch → embed approach. Preview uses the normal `@fontsource` CSS.

**Alternatives**: bundling variable fonts (unsupported by react-pdf); base64 inlining at build (heavier bundle) — rejected in favor of `?url` + lazy fetch.

## 3. iPhone photo intake — HEIC, EXIF orientation, large images

**Decision**:

- **HEIC/HEIF**: convert to JPEG in-browser with **`heic2any`** (libheif WASM) when the file type is HEIC and the browser can't natively decode it.
- **Orientation + downscale + format-normalize**: run every accepted image through `createImageBitmap(blob, { imageOrientation: "from-image" })` → draw to a `<canvas>` capped at a max long edge (~2000px) → export JPEG (quality ~0.85). This yields upright, right-sized, react-pdf-compatible images.
- Do the work in a small util (`image-pipeline.ts`); process lazily/off the main thread where possible to keep the UI responsive (SC-007).

**Rationale**: `@react-pdf/renderer` embeds PNG/JPEG only, so HEIC must be converted; EXIF orientation must be baked in because react-pdf ignores it; downscaling prevents multi-photo memory spikes on iPhone.

**Alternatives**: relying on Safari's native HEIC `<img>` display (works for preview but not for react-pdf embedding); server-side conversion (violates on-device) — rejected.

## 4. PWA — installability, splash, offline, without disrupting the wider SPA

**Decision**: Add **`vite-plugin-pwa`** (Workbox) with:

- A web app manifest reusing existing `public/` icons (`pwa-192/512`, `maskable-icon-512x512`, `apple-touch-icon-180x180`); **`scope`/`start_url` targeting `/report`** so "Add to Home Screen" installs the tool.
- iOS splash via `apple-touch-startup-image` link tags (generated with the already present `@vite-pwa/assets-generator` / `pnpm generate-pwa-assets`).
- `registerType: "autoUpdate"`, `workbox.navigateFallbackDenylist` excluding `/api/*`, and precache limited to the app shell + `/report` assets + fonts.

**Rationale**: A service worker is inherently global; scoping the manifest and precache keeps existing dashboards, the marketing site, and Sanity Presentation unaffected while still delivering install + offline for the tool (FR-008/FR-009).

**Alternatives**: hand-rolled SW (more maintenance, easy to break the multi-route SPA); no offline (fails SC-005) — rejected.

**Risk/verify**: Confirm the SW does not cache-trap Sanity Presentation/dev (disable SW in dev, or `devOptions.enabled: false`) and does not interfere with the many existing routes; verify on a real iPhone.

## 5. Save / share the PDF on iOS

**Decision**: Prefer **Web Share API level 2** — build a `File` from the react-pdf `Blob` and call `navigator.share({ files: [file], title })`; fall back to a download link (`<a download=...>`) when file-share is unsupported. Filename from `filename.ts` (title + date, FR-014).

**Rationale**: On modern iOS Safari, sharing a PDF `File` surfaces the native share sheet (AirDrop/Messages/Mail/Save to Files), matching FR-007 and the Delivery assumption. The download fallback covers desktop and older browsers.

## 6. Accessibility approach (WCAG 2.1 AA) for the swipe/split editor

**Decision**: Implement the pane switcher as an accessible **tablist** (segmented control with `role="tab"`/`tabpanel`, arrow-key support) layered over the swipe gesture, so the gesture is never the only way to switch (FR-019). Manage focus on pane change, expose a polite live region announcing "Preview updated", label all inputs, and make photo reordering keyboard-operable (up/down controls, not drag-only). Automated `axe` checks + manual VoiceOver pass.

**Rationale**: Satisfies FR-010/FR-019/SC-006; drag-only reorder and gesture-only navigation are classic AA failures.

## 7. Sanity report-branding content model

**Decision**: Add a small **`reportBranding` singleton** (or extend `siteSettings`) holding: `logo` (image), `footerText` (string/blockContent), and contact fields `phone`, `email`, `website`, `address`. Add optional `brandColors` (primary/accent/text) that **default to `src/theme.ts`** when unset. Resolve image URLs with the repo's existing `src/sanity/image-url.ts` helper (not `@sanity/image-url`). Wire schema → GROQ projection (`queries.ts`) → mapper (`map-sanity-home.tsx`) → props.

**Rationale**: Keeps report branding Tandra-editable (Clarification Q2, Principle I) while the site design system stays in `theme.ts` (Principle III); reuses the established schema/query/mapper pipeline. Reusing `emailSignature` (already has phone/email/website + logo) is a viable shortcut if we prefer not to add a doc.

## 8. Testing strategy ("fully tested", SC-009)

**Decision**: Vitest + Testing Library (jsdom), already configured. Cover:

- **Unit**: `image-pipeline` (orientation baked in, HEIC branch, downscale caps), `layout-model` (cover/section/photo/table blocks, empty-table omission, section grouping), `filename` derivation.
- **Component**: editor (add/reorder/remove photos, caption + configurable table edit, section grouping), pane switcher (swipe + toggle, keyboard), generate-blocked when no photos.
- **Accessibility**: `axe` (via `vitest-axe`/`jest-axe`) on editor + preview; zero critical/serious violations (SC-006).
- **Parity**: structural snapshot of the layout model shared by both renderers.
- **Manual**: real-iPhone verification of capture, HEIC, offline generate, share sheet, and install/splash (Principle II) — documented in quickstart.md.

**Rationale**: PDF pixel-parity is impractical to assert in jsdom; asserting the shared model + a11y + flow logic gives high confidence, with manual device checks for the platform-specific pieces.
