# Agent Memory — Tandra Peters Consulting

## Learned User Preferences

- Use `pnpm` for all installs and scripts; never substitute `npm` or `yarn`.
- Fix the root cause of bugs — do not paper over errors by rewording the error message or UI copy.
- Verify a change actually works (run the dev server, hit the page, check the result) before claiming it is done; the user repeatedly returns with "nope / still doesn't work".
- Do not leave clutter in the repo — remove one-off seed scripts, throwaway plugins, or experimental files after they're done being used.
- Write site copy and FAQs in Tandra's first-person voice; never refer to her in the third person.
- Brand spelling is `Birdcreek` (one word, lowercase `c`) — never `BirdCreek`.
- Use `iconoir-react` for icons; do not introduce `lucide-react` (it was deliberately removed).
- Centralize repeating styles and tokens (`src/theme.ts`, design tokens) instead of duplicating CSS across components.
- Treat content as editable in Sanity: prefer Portable Text + Visual Editing over hardcoded strings or URL-only image fields.
- Smooth-scroll for in-page nav (single-page site); use CSS view transitions for cross-page navigation.
- Use natural roofer vocabulary in copy and component naming — avoid architectural jargon Tandra wouldn't say on the job (e.g. "the walk" → "the inspection").
- Responsive breakpoints must live in CSS files (`site-layout.css`); never put `@media` rules in inline React styles — they silently do nothing.

## Learned Workspace Facts

- Stack: Vite 6 + React 19 + TypeScript SPA. This is NOT a Next.js project — do not install `next` or `next-sanity`.
- Package manager is `pnpm`; lockfile is `pnpm-lock.yaml`. Run site + studio together with `pnpm dev:all`.
- Sanity Studio lives in `studio-tandra-peters/` (its own workspace); the public site Sanity client config lives under `src/`.
- Deployed to Vercel; production domain is `https://www.tandra.me/`. Contact form posts to `/api/contact` (Vercel serverless function).
- Contact submissions sync to Attio (CRM); Zapier was rejected for daily-send limits. PostHog is reverse-proxied via `t.tandra.me`.
- Sanity Presentation / Visual Editing is configured; the AI Context button and `@sanity/assist` are installed in Studio.
- OG images are generated via `plugins/ogImageComposite.ts` (custom Vite plugin) using `sharp`.
- Type pair is Manrope (headings/UI) + `Instrument Serif` (body); Space Grotesk was removed. Do not swap either.
- CE.SDK / `@cesdk/cesdk-js` (img.ly) was tried and deliberately removed due to watermark restrictions — do not reinstall.
- Central Texas service-area map uses D3 + topojson (`src/components/serviceAreaMap.tsx`) and reads counties from Sanity. Fort Worth / Tarrant County is NOT in Tandra's service area — never include it.
- Brand/design source-of-truth files at project root: `DESIGN.md`, `.impeccable.md`, `tandra-peters-content-style-guide.md` — consult these before changing UI copy, colors, or visual language.
- Tandra Peters is a roofing consultant employed by Birdcreek Roofing; the site is a single-page marketing site with article sub-pages backed by Sanity `post` documents.
- RoofInspection component uses `@google/model-viewer` for 3D GLB rendering (`public/roof.glb`). The library is loaded via a `<script>` tag in `index.html` — it is NOT an npm package and must NOT be imported via Vite or `import`. The component is **3D-only** (the 2D mode was removed). Hotspots must be **slotted children** of `<model-viewer>` with `slot="hotspot-N"`, `data-position`, and `data-normal` 3D coords (meters); filter chapters without `position3d` upstream before rendering `<RoofInspection.Hotspot>` to avoid React hooks violations. The `model-viewer` shadow DOM container needs `overflow: visible` so hotspot tooltips are not clipped.
- Sanity write operations (creating/updating/mutating documents) require the CLI auth token from `~/.config/sanity/config.json` — the project's read-only `SANITY_API_TOKEN` env var cannot write; use the CLI token when populating or seeding Sanity data.
