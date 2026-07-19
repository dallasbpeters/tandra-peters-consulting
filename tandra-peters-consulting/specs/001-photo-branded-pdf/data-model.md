# Phase 1 Data Model: Branded Photo PDF Tool

All entities are **client-side, in-session** state (v1 stores nothing server-side). `BrandProfile` is the only entity read from an external source (Sanity). Types are TypeScript-shaped for `src/lib/report-pdf/`.

## Entity overview

```
Report 1───* PhotoItem 1───0..1 DetailsTable
Report 1───* SectionHeading   (PhotoItem.sectionId → SectionHeading.id)
BrandProfile (singleton, from Sanity) ──▶ applied to Report at render time
LayoutModel (derived) ◀── built from Report + BrandProfile + tokens
```

## Report

The assembled deliverable being edited.

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Optional; drives cover + filename (FR-014). Trimmed; long values wrap/truncate in layout (Edge Cases). |
| `propertyAddress` | string | Optional; shown on cover. |
| `date` | ISO date string | Defaults to today when empty (US2 #3 / FR-006). |
| `overallNote` | string | Optional; rendered in body. |
| `sections` | `SectionHeading[]` | Ordered; may be empty. |
| `photos` | `PhotoItem[]` | Ordered; **≥1 required to generate** (FR-011). |

**State**: `draft` (editing) → `generating` (export in progress, FR-012) → `ready` (Blob produced, offer save/share). No persistence between sessions in v1.

## PhotoItem

A single image plus its optional annotations.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Client-generated stable key. |
| `sourceFile` | File/Blob | Original selection (camera/library). Never uploaded/retained (FR-015). |
| `processedImage` | Blob (JPEG) | Output of `image-pipeline`: upright (EXIF baked), downscaled (~2000px max edge), react-pdf-compatible (FR-002/FR-003). |
| `previewUrl` | string (objectURL) | For HTML preview; revoked on removal. |
| `order` | number | Display order; reorder/remove supported (FR-004). |
| `caption` | string | Optional (FR-006). |
| `sectionId` | string \| null | Optional link to a `SectionHeading` (FR-006b). |
| `table` | `DetailsTable` \| null | Optional per-photo table (FR-006a). |

**Lifecycle**: `added` → `processing` (pipeline) → `ready` | `error` (unsupported/ corrupt file → surfaced, not silent). Object URLs revoked on remove/unmount.

## DetailsTable

Optional per-photo table with user-defined columns.

| Field | Type | Rules |
| --- | --- | --- |
| `columns` | string[] | User-configurable headers (e.g. `["Finding","Detail"]`). **No built-in Cost column / no cost concept** (Clarification). |
| `rows` | string[][] | Each row aligns to `columns` length. |

**Rule**: A table that is empty or entirely blank is **omitted** from the PDF and preview (FR-006a / US2 #4).

## SectionHeading

A named group ("Roof Section 1", etc.) photos can be filed under.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Stable key. |
| `title` | string | Displayed as a section header; grouped photos render beneath it (FR-006b / US2 #5). |
| `order` | number | Section ordering. |

## BrandProfile (from Sanity)

Read-only branding content applied to every report. Sourced from Sanity (`reportBranding` singleton or reused `siteSettings`/`emailSignature`); see `contracts/sanity-report-branding.md`.

| Field | Type | Rules |
| --- | --- | --- |
| `logoUrl` | string | Birdcreek wordmark/logo (cover + header). Resolved via `src/sanity/image-url.ts`. |
| `footerText` | string | Running footer copy (FR-005). |
| `contact.phone` | string | Contact page (FR-017). |
| `contact.email` | string | Contact page. |
| `contact.website` | string | Contact page. |
| `contact.address` | string | Contact page. |
| `colors` | `{ primary; accent; text }` optional | Optional overrides; **default to `src/theme.ts`** tokens when unset (see plan Complexity Tracking). |

**Rule**: All branding must be Tandra-editable in Sanity (Principle I); newly edited values appear in subsequently generated reports (FR-005).

## LayoutModel (derived — the single layout source of truth)

Built by `layout-model.ts` from `Report` + `BrandProfile` + tokens; consumed by **both** `report-preview.tsx` (HTML) and `report-document.tsx` (PDF) so preview matches export (FR-018).

| Field | Type | Notes |
| --- | --- | --- |
| `pages` | `LayoutPage[]` | Ordered: `cover` → `body`(1..n) → `contact`. |
| `LayoutPage.kind` | `"cover" \| "body" \| "contact"` | Drives which blocks/header/footer render. |
| `LayoutPage.blocks` | `LayoutBlock[]` | e.g. `sectionHeader`, `photo`, `caption`, `table`, `note`, `contactInfo`, `coverTitle`. |
| `header` / `footer` | object | "Roof Inspection Report — Birdcreek Roofing" + page numbers on body/contact (FR-016). |
| `tokens` | object | Page size, margins, type scale, colors, fonts (shared). |

**Validation invariants**:

- No cost column/field anywhere; no recommendations page (v1 scope).
- Cover always present; contact always present; ≥1 body page requires ≥1 photo.
- Blank tables and empty sections are pruned during model build.
