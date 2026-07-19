<!--
SYNC IMPACT REPORT
==================
Version change: (unfilled template) → 1.0.0
Bump rationale: Initial ratification — template placeholders replaced with
  concrete, project-specific principles derived from documented conventions
  (AGENTS.md, stack facts). Treated as MAJOR (first real adoption).

Principles defined (5):
  I.   Content Lives in Sanity
  II.  Fix Root Causes, Verify by Running
  III. One Source of Truth for Design
  IV.  Tandra's Voice & Brand Integrity
  V.   Guard the Toolchain & Stack Boundaries

Added sections:
  - Technology & Architecture Constraints (Section 2)
  - Development Workflow & Quality Gates (Section 3)
  - Governance

Removed sections: none (all template placeholders resolved)

Templates reviewed for alignment:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate is derived
     from this file at runtime; no hardcoded principle names to update.
  ✅ .specify/templates/spec-template.md — no principle-specific references.
  ✅ .specify/templates/tasks-template.md — tests are OPTIONAL, consistent with
     Principle II (verification-by-running rather than mandatory TDD).
  ✅ .specify/templates/checklist-template.md — generic; no changes needed.

Runtime guidance file: AGENTS.md (repository memory) — remains the source of
  truth for operational details and MUST stay consistent with these principles.

Deferred TODOs: none. Ratification date set to initial adoption date.
-->

# Tandra Peters Consulting Constitution

## Core Principles

### I. Content Lives in Sanity

Editable content MUST be modeled in Sanity, not hardcoded in components. Copy, FAQs, headings, and imagery MUST be authored as Sanity documents/fields (Portable Text for rich text, Sanity image assets for images — never URL-only image fields) and surfaced through Visual Editing / Presentation. New user-facing text or media that a stakeholder might reasonably want to change MUST be wired end-to-end: schema (`studio-tandra-peters/`) → GROQ query → mapper → component prop.

Rationale: The site is a marketing site owned by a non-developer (Tandra). If content is hardcoded, she cannot maintain it, and every copy tweak becomes an engineering task.

### II. Fix Root Causes, Verify by Running

Bugs MUST be resolved at their root cause. Rewording an error message, hiding a failing UI state, or adjusting copy to mask a defect is PROHIBITED. Before any change is claimed "done", it MUST be verified by actually exercising it — run the dev server, load the affected page, and confirm the real result. Claims of completion without this verification are not acceptable.

Rationale: The team has repeatedly hit "nope / still doesn't work" regressions caused by surface-level fixes and unverified claims. Verified root-cause fixes are the only reliable path.

### III. One Source of Truth for Design

Repeating styles, design tokens, colors, and responsive breakpoints MUST be centralized in the theme/CSS layer (`src/theme.ts`, `src/styles/site-layout.css` and shared CSS). Layout CSS MUST NOT be duplicated across components, and `@media` rules MUST NOT be placed in inline React `style` objects (they silently do nothing). Icons MUST use `iconoir-react`; `lucide-react` MUST NOT be reintroduced. JS viewport detection MUST use the shared `useIsMobile` hook (`src/hooks/isMobile.ts`), called inside components — never a duplicated local hook or module-scope call.

Rationale: Duplicated and misplaced styling silently drifts and breaks responsive behavior; centralization keeps the UI consistent and maintainable.

### IV. Tandra's Voice & Brand Integrity

All site copy and FAQs MUST be written in Tandra's first person — never refer to her in the third person. Language MUST use natural roofer vocabulary Tandra would actually say on the job (e.g. "the inspection", not architectural jargon). The brand name MUST be spelled `Birdcreek` (one word, lowercase `c`) — never `BirdCreek`. The Central Texas service area MUST exclude Fort Worth / Tarrant County.

Rationale: The site's value is an authentic, personal voice and accurate local positioning; inconsistent voice or brand spelling undermines trust.

### V. Guard the Toolchain & Stack Boundaries

`pnpm` MUST be used for all installs and scripts — never `npm` or `yarn`. The stack is a Vite 6 + React 19 + TypeScript SPA; it MUST NOT be migrated toward Next.js (`next` / `next-sanity` MUST NOT be installed). Serverless handlers under `api/` MUST NOT import from `src/`; shared server logic lives in `api/lib/`. Deliberately removed dependencies (`lucide-react`, `@cesdk/cesdk-js`) MUST NOT be reinstalled. Secrets MUST NOT be committed or exposed to the client bundle; allowlists and tokens come from environment variables, never hardcoded source.

Rationale: The project's stability depends on a known, deliberate toolchain; undoing these decisions has repeatedly caused build breakage and regressions.

## Technology & Architecture Constraints

- Package manager: `pnpm`; lockfile is `pnpm-lock.yaml`. Dev server runs on port **3001** (`pnpm dev`); run site + Studio together with `pnpm dev:all`.
- CMS: Sanity Studio in `studio-tandra-peters/`; public client config in `src/`. Presentation / Visual Editing via `@sanity/assist`. Draft reads require `VITE_SANITY_API_READ_TOKEN`; the read-only `SANITY_API_TOKEN` cannot write.
- Hosting: Vercel; production domain `https://www.tandra.me/`. Contact form posts to `/api/contact` and syncs to Attio. PostHog is reverse-proxied via `t.tandra.me` and imported from `@posthog/react`.
- Typography pair is Hanken Grotesk Variable (headings/UI) + IBM Plex Serif (body). These MUST NOT be swapped.
- 3D / rendering: RoofInspection uses `@google/model-viewer` loaded lazily; `vite.config.ts` sets `resolve.dedupe: ['three']` to avoid duplicate Three.js.
- Environment hygiene: `vercel env pull` overwrites `.env.local` and drops local-only keys — back up or merge manually after pulling.

## Development Workflow & Quality Gates

- Before claiming completion, changes MUST pass type-checking and linting (ESLint / oxc) and be visually verified in the running app (see Principle II).
- The repository MUST be kept clean: one-off seed scripts, throwaway plugins, and experimental files MUST be removed once their purpose is served.
- Commits are created ONLY when the user explicitly requests them; never commit proactively, and never commit files that may contain secrets.
- Tests are OPTIONAL for a given change and MUST be added when explicitly requested; when present they MUST pass before the work is considered done.
- Any change that touches user-facing content MUST confirm the content is Sanity-editable (Principle I) rather than newly hardcoded.

## Governance

This constitution supersedes ad-hoc practices and prior conventions where they conflict. `AGENTS.md` remains the runtime operational guide and MUST be kept consistent with these principles; if the two diverge, this constitution wins and `AGENTS.md` MUST be updated.

Amendments MUST be documented in this file, version-bumped per semantic versioning, and dated:

- **MAJOR**: Removal or backward-incompatible redefinition of a principle or governance rule.
- **MINOR**: A new principle/section or materially expanded guidance.
- **PATCH**: Clarifications, wording, and non-semantic refinements.

All pull requests and reviews MUST verify compliance with these principles. Deviations MUST be justified in writing (e.g. in the PR description or the plan's Complexity Tracking section) and approved before merge.

**Version**: 1.0.0 | **Ratified**: 2026-07-18 | **Last Amended**: 2026-07-18
