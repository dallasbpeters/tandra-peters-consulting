# Feature Specification: Branded Photo PDF Tool

**Feature Branch**: `001-photo-branded-pdf`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "A tool that can upload photos from a phone and output a Branded Generated PDF. Highly optimized to work on an iPhone, PWA, icons, splashscreen, fully tested, aria-compliant."

## Clarifications

### Session 2026-07-18

- Q: Where should this tool live, and how is access controlled? → A: An auth-gated route inside the existing tandra.me site, reusing the existing Google dashboard authentication and staff allowlist (not a standalone app, not public).
- Q: Where should the PDF branding (logo, colors, footer/contact) come from? → A: Managed in Sanity so Tandra can edit the logo, brand colors, and footer/contact text herself (Constitution Principle I).
- Q: May uploaded photos leave the device during PDF generation, and where do generated PDFs live? → A: Photos are used only to generate the PDF and are never retained. Server-backed handling (temporary photo blob + storing the finished PDF in Vercel Blob) is a Phase 2 approach; in v1 the PDF is generated for immediate on-device save/share with no server-side storage.
- Q: Is the PDF route protected by one shared password or a unique password/link per PDF? → A: Each generated PDF gets its own unique access link/password (per-report access), which staff can rotate or revoke individually. (Scoped to Phase 2 — see decision below.)
- Decision: PDF persistence in Vercel Blob and per-PDF password-protected shareable links are deferred to **Phase 2**. **v1 scope** is: add photos → generate branded PDF → save/share on the device. Photos remain transient and are never retained.
- Q: What is the report's page structure and content model (per `report-template.pdf`)? → A: Three pages — **Cover → Photo/body pages → Contact**. No "Recommendations" page. Each photo carries an optional caption and an optional per-photo data table whose **columns the inspector configures** (no built-in Cost column and no cost anywhere); photos may be grouped under named roof-section headings. The Contact page shows Birdcreek's phone, email, website, and address sourced from Sanity.
- Q: How should the live preview render so it's fast on iPhone yet matches the export? → A: A live **HTML/CSS preview** that mirrors the branded template and updates in real time as the user edits; the exported PDF is generated from that **same layout definition** so preview and output always match.
- Q: When should the live preview update as the user edits? → A: **Hybrid** — structural changes (adding, reordering, or removing photos or sections) update the preview instantly; text and table-cell edits update on a short debounce after the user pauses.
- Q: How should the Editor/Preview layout adapt across devices? → A: On phones, Editor and Preview are two full-width panes the user **swipes** between, with a visible **toggle/segmented control** as a non-gesture fallback; on wider screens they appear **side-by-side** (inputs left, preview right).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Turn phone photos into a branded PDF (Priority: P1)

A field user (Tandra / Birdcreek staff) stands on a job site with an iPhone, adds photos from the camera or photo library, and produces a single branded PDF they can save or share — all in one sitting, without a computer.

**Why this priority**: This is the entire reason the tool exists. Delivered on its own it is already a usable product: photos in, a professional branded PDF out. Every other story only enriches this core loop.

**Independent Test**: Open the tool on an iPhone, add several photos from the library, tap generate, and confirm a branded PDF is produced and can be saved to the device — with no other features present.

**Acceptance Scenarios**:

1. **Given** the tool is open with no photos, **When** the user adds photos from the photo library, **Then** each selected photo appears as a thumbnail in the working set in the order added.
2. **Given** at least one photo has been added, **When** the user taps "Generate PDF", **Then** a branded PDF containing those photos is produced and offered for saving/sharing.
3. **Given** photos captured on an iPhone (including HEIC and rotated shots), **When** the PDF is generated, **Then** every image appears upright and undistorted.
4. **Given** the user has generated a PDF, **When** they choose to save or share, **Then** the device's native save/share options are presented.
5. **Given** the user is editing on an iPhone, **When** they switch to the Preview pane (by swipe or toggle), **Then** they see a live branded preview reflecting their current photos and details that matches what the exported PDF will be.

---

### User Story 2 - Add report context and captions (Priority: P2)

The user labels the report — a title, the property address, and the date — and optionally adds a caption to individual photos, an optional per-photo details table (with columns they choose, e.g. Finding / Detail), an optional roof-section heading to group photos under, and an overall note, so the PDF reads as a real inspection summary rather than a bare photo dump.

**Why this priority**: Context turns a photo collection into a deliverable a client will trust. It is high-value but not required to prove the core loop, so it layers on top of P1.

**Independent Test**: Add photos, fill in a title/address/date, add a caption and a small configurable table (e.g. Finding / Detail) on one photo, group a couple of photos under a roof-section heading, generate, and confirm those details appear correctly placed on the branded PDF.

**Acceptance Scenarios**:

1. **Given** photos have been added, **When** the user enters a title, property address, and date, **Then** those details appear in the PDF header/cover area.
2. **Given** a photo in the working set, **When** the user adds a caption to it, **Then** the caption appears with that photo in the PDF.
3. **Given** no date is entered, **When** the PDF is generated, **Then** today's date is used by default.
4. **Given** a photo, **When** the user defines table columns and enters rows, **Then** that photo's details table renders with those columns beneath the photo; empty/blank tables are omitted rather than printed empty.
5. **Given** photos assigned to a roof-section heading, **When** the PDF is generated, **Then** those photos appear grouped under that section heading.

---

### User Story 3 - Install and run like a native iPhone app (Priority: P3)

The user installs the tool to their iPhone home screen, launches it full-screen from a branded icon with a branded splash screen, and can assemble and generate a report even on a weak or dropped connection while on a roof.

**Why this priority**: Field reliability and a native feel dramatically improve day-to-day usability, but the tool still delivers value in a browser tab without it — so it follows the core and content stories.

**Independent Test**: Install the tool to the iPhone home screen, confirm the branded icon and splash screen appear, launch it full-screen, enable Airplane Mode, and confirm the core assemble-and-generate flow still works.

**Acceptance Scenarios**:

1. **Given** the tool is open in the phone browser, **When** the user adds it to their home screen, **Then** a branded app icon is installed.
2. **Given** the installed app, **When** the user launches it, **Then** it opens full-screen (no browser chrome) and shows a branded splash screen while loading.
3. **Given** the app has been opened once, **When** the connection drops, **Then** the user can still add photos, enter details, generate the branded PDF, and save/share it.

---

### Edge Cases

- **HEIC / HEIF photos**: iPhone's default format must be accepted and rendered correctly in the PDF.
- **Rotated / EXIF-oriented photos**: images must appear upright, not sideways.
- **No photos added**: generation is blocked with clear guidance rather than producing an empty PDF.
- **Large sets / large images**: many high-resolution photos must not crash or freeze the phone; the tool degrades gracefully (e.g., resizing for the PDF).
- **App backgrounded mid-generation** (a call comes in): generation resumes or fails safely with a clear message, never a corrupt file.
- **Very long titles, addresses, or captions**: text wraps/truncates cleanly and never breaks the branded layout.
- **Connection lost during generation**: the PDF still completes if the core assets were already loaded.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to add photos from both the device camera and the device photo library.
- **FR-002**: System MUST accept the common iPhone photo formats (HEIC/HEIF and JPEG/PNG) and render them correctly in the output.
- **FR-003**: System MUST orient photos correctly using embedded image metadata so images are never displayed sideways or upside down.
- **FR-004**: Users MUST be able to reorder and remove photos in the working set before generating.
- **FR-005**: System MUST produce a branded PDF that applies the Birdcreek / Tandra Peters branding (logo, brand colors, and footer) consistently on every page. The branding (logo, brand colors, footer/contact text) MUST be sourced from Sanity so it is editable by Tandra without a developer, and changes there MUST be reflected in newly generated PDFs.
- **FR-006**: Users MUST be able to add report details — title, property address, date (defaulting to today), an optional overall note, and optional per-photo captions — and these MUST appear in the generated PDF.
- **FR-006a**: Users MUST be able to attach to each photo an optional details table with **user-configurable column headers** and one or more rows. There is no built-in Cost column and no cost concept in v1. Tables that are empty or entirely blank MUST be omitted from the PDF rather than rendered empty.
- **FR-006b**: Users MUST be able to group photos under an optional named roof-section heading, and grouped photos MUST render under that heading in the generated PDF.
- **FR-007**: System MUST let the user save the generated PDF to the device and share it through the device's native share options.
- **FR-008**: The tool MUST be installable to the iPhone home screen with a branded app icon and a branded splash/launch screen, and MUST launch full-screen (standalone, without browser chrome).
- **FR-009**: After first load, the installed app MUST support the full v1 flow offline — add photos, reorder/remove, enter details, generate the branded PDF, and save/share it — with no live network connection. (The Phase 2 server-backed storage/sharing that requires connectivity is out of scope for v1.)
- **FR-010**: Every interactive element MUST be fully operable with assistive technology (screen reader and keyboard/switch control), exposing correct name, role, and state, with managed focus and visible focus indicators, meeting WCAG 2.1 AA.
- **FR-011**: System MUST prevent PDF generation when no photos have been added and explain what the user needs to do.
- **FR-012**: System MUST show visible progress during generation and handle interruptions without producing a corrupt file.
- **FR-013**: The tool MUST live as an authenticated route within the existing tandra.me site and MUST restrict access to authorized staff by reusing the existing Google dashboard authentication and staff allowlist. Unauthenticated visitors MUST NOT be able to reach the tool.
- **FR-014**: The generated PDF's filename MUST be derived from the report title and date for easy identification.
- **FR-015**: Uploaded photos MUST be used only to produce the PDF and MUST NOT be retained afterward. v1 MUST NOT store photos or PDFs server-side — generation happens for immediate on-device save/share.
- **FR-016**: The generated report MUST follow the branded template structure (per `report-template.pdf`): a **cover** page, one or more **photo/body** pages, and a **contact** page — in that order. There MUST be no cost column and no recommendations page in v1. Body and contact pages MUST carry a running header/footer ("Roof Inspection Report — Birdcreek Roofing") with page numbers.
- **FR-017**: The cover MUST display the Birdcreek wordmark, the report title, an "Inspected by" line, and the report's title/address/date. The contact page MUST display Birdcreek's phone, email, website, and address, all sourced from Sanity (per FR-005) so they stay Tandra-editable.
- **FR-018**: The tool MUST provide a **live preview** of the branded report that reflects the current report details, photos, captions, configurable tables, and section headings. The preview MUST be an HTML/CSS rendering that mirrors the branded template and MUST share a single layout definition with the exported PDF, so the preview matches the generated output.
- **FR-018a**: The live preview MUST update **instantly** on structural changes (adding, reordering, or removing photos or sections) and on a **short debounce** after the user pauses for text and table-cell edits, staying responsive on a recent iPhone.
- **FR-019**: The interface MUST present an **Editor** pane (inputs) and a **Preview** pane. On phones these MUST be full-width panes the user can **swipe** between, plus a visible **toggle/segmented control** that switches panes without a gesture (accessibility fallback per FR-010). On wider screens they MUST appear **side-by-side** with inputs on the left and the preview on the right.

**Deferred to Phase 2 (not in v1)** — confirmed requirements that are explicitly out of scope for v1, which focuses on getting photos → branded PDF → save/share working:

- **FR-P2-001**: Generated PDFs are stored in Vercel Blob storage and retrievable only through a password-protected route — each PDF exposed as a unique, hard-to-guess shareable link that requires that PDF's own password to view/download.
- **FR-P2-002**: Each generated PDF has its own unique access credential (per-report password/link); authorized staff can rotate or revoke an individual PDF's access without a code deploy. Access credentials are stored securely (never in the client bundle or committed source, per Constitution Principle V).

### Key Entities _(include if feature involves data)_

- **Photo**: An image added by the user. Attributes: source (camera/library), display order, orientation, optional caption, optional roof-section grouping, and an optional Photo Details Table. Held only for the session to build the PDF and never retained afterward (v1 keeps them on-device; the Phase 2 flow uses a temporary blob deleted immediately after generation).
- **Photo Details Table**: An optional per-photo table with user-configurable column headers and one or more rows. No cost field / no built-in columns; omitted from the PDF when empty or entirely blank.
- **Report**: The assembled deliverable. Attributes: title, property address, date, optional overall note, optional named roof-section groupings, and an ordered collection of Photos.
- **Brand Profile**: The visual identity applied to output — logo, brand colors, footer text, and contact details (phone, email, website, address) used on the contact page. Authored and maintained in Sanity so it is Tandra-editable.
- **Branded PDF**: The generated output artifact — branded pages containing the report details and photos, with a descriptive filename. In v1 it is produced for immediate on-device save/share; persisting it in Vercel Blob behind a unique password-protected link is Phase 2.
- **Access Password** _(Phase 2)_: The per-PDF secret/link that gates access to a stored PDF. Stored securely (not in client code); rotatable or revocable by staff without a deploy.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A field user can go from opening the tool to a saved branded PDF of 10 photos in under 2 minutes on an iPhone.
- **SC-002**: 100% of output pages display the correct branding (logo, brand colors, and footer).
- **SC-003**: 100% of iPhone photos — including HEIC and rotated shots — appear upright and undistorted in the output.
- **SC-004**: The tool can be installed to the iPhone home screen and launches full-screen with a branded splash screen.
- **SC-005**: The full v1 flow — assemble, generate the branded PDF, and save/share — succeeds with no network connection after the first load.
- **SC-006**: The interface has zero critical or serious accessibility violations in an automated audit and every control is fully operable by screen reader.
- **SC-007**: Generating a report of up to 30 photos completes without crashing or freezing on a recent iPhone.
- **SC-008**: 90% of first-time users complete a report without assistance.
- **SC-009**: Automated tests cover the core generation flow and the accessibility paths and pass on every change (the "fully tested" bar).
- **SC-010**: Every generated report includes a branded cover page and a contact page showing Birdcreek's Sanity-sourced contact details, and any per-photo captions, configurable tables, and roof-section headings render correctly in their configured order.
- **SC-011**: On an iPhone, the user can switch between the Editor and Preview panes by both swipe and the toggle control; the preview reflects structural changes immediately and text edits within about a second of pausing, and the exported PDF matches the preview.

## Assumptions

- **Audience & access**: This is an internal field tool for Tandra / Birdcreek staff, delivered as an authenticated route inside the existing tandra.me site and gated by the existing Google dashboard authentication + staff allowlist (confirmed via clarification). It is not a standalone app and not a public, client-facing uploader.
- **Branding**: Uses the existing Birdcreek / Tandra Peters brand identity (logo, colors, contact footer), sourced from Sanity so it stays Tandra-editable (confirmed via clarification).
- **Primary device**: Optimized for recent iPhones; it should still function on desktop browsers but iPhone is the target experience.
- **Editor UX**: A two-pane editor — inputs and a live branded preview — shown side-by-side on wider screens and as swipeable panes (with a toggle fallback) on phones; the preview shares its layout with the exported PDF so they always match.
- **PDF layout** (from `report-template.pdf`): a branded **cover** (Birdcreek wordmark, "Roof Inspection Report" title, subtitle, "Inspected by" line, and the report title/address/date); **body** pages showing each photo with its optional caption and optional configurable details table, optionally grouped under roof-section headings; and a **contact** page with Birdcreek's phone, email, website, and address. A running header/footer ("Roof Inspection Report — Birdcreek Roofing") with page numbers repeats on body/contact pages. No cost column and no recommendations page in v1. The template PDF is a rough starting point whose leftover placeholder copy (marketing "Strategic Recommendations", "Insight Lab" disclaimer, "reallygreatsite.com") is not part of the output.
- **Delivery (v1)**: The generated PDF is saved to the device and shared via the native share sheet (AirDrop, Messages, Mail), with no server-side storage. **Phase 2** adds Vercel Blob persistence plus unique password-protected shareable links. Photos are never retained in either phase.
- **Scale**: Designed for typical inspections of up to ~30 photos; larger batches are out of scope for v1.
- **"Fully tested"** means an automated test suite covering the core flow and accessibility, run in continuous integration.
