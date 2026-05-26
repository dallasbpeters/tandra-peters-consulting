# Agent Memory — Tandra Peters Consulting

## Learned User Preferences

- Use `pnpm` for all installs and scripts; never substitute `npm` or `yarn`.
- Fix the root cause of bugs — do not paper over errors by rewording the error message or UI copy.
- Verify a change actually works (run the dev server, hit the page, check the result) before claiming it is done; the user repeatedly returns with "nope / still doesn't work".
- Do not leave clutter in the repo — remove one-off seed scripts, throwaway plugins, or experimental files after they're done being used.
- Write site copy and FAQs in Tandra's first-person voice; never refer to her in the third person.
- Brand spelling is `Birdcreek` (one word, lowercase `c`) — never `BirdCreek`.
- Use `iconoir-react` for icons; do not introduce `lucide-react` (it was deliberately removed).
- Centralize repeating styles, tokens, and responsive breakpoints in CSS/theme (`src/theme.ts`, `site-layout.css`); never duplicate layout CSS across components or put `@media` rules in inline React styles — they silently do nothing.
- Treat content as editable in Sanity: prefer Portable Text + Visual Editing over hardcoded strings or URL-only image fields.
- Smooth-scroll for in-page nav (single-page site); use CSS view transitions for cross-page navigation.
- Use natural roofer vocabulary in copy and component naming — avoid architectural jargon Tandra wouldn't say on the job (e.g. "the walk" → "the inspection").
- Use shared `src/hooks/isMobile.ts` (`useIsMobile(breakpoint?)`) for JS viewport detection — do not duplicate local mobile hooks in components; hooks must be called inside components, never at module scope.

## Learned Workspace Facts

- Stack: Vite 6 + React 19 + TypeScript SPA. This is NOT a Next.js project — do not install `next` or `next-sanity`.
- Package manager is `pnpm`; lockfile is `pnpm-lock.yaml`. Run site + studio together with `pnpm dev:all`.
- Sanity Studio lives in `studio-tandra-peters/`; public client config under `src/`. Presentation / Visual Editing is configured with `@sanity/assist`. Write operations require the CLI auth token from `~/.config/sanity/config.json` — the read-only `SANITY_API_TOKEN` env var cannot write.
- Deployed to Vercel; production domain is `https://www.tandra.me/`. Contact form posts to `/api/contact` (Vercel serverless) and syncs to Attio (CRM). PostHog is reverse-proxied via `t.tandra.me`. OG images via `plugins/ogImageComposite.ts` (custom Vite plugin) using `sharp`.
- Type pair is Manrope (headings/UI) + `Instrument Serif` (body); Space Grotesk was removed. Do not swap either.
- CE.SDK / `@cesdk/cesdk-js` (img.ly) was tried and deliberately removed due to watermark restrictions — do not reinstall.
- Central Texas service-area map uses D3 + topojson (`src/components/serviceAreaMap.tsx`) and reads counties from Sanity. Fort Worth / Tarrant County is NOT in Tandra's service area — never include it.
- Tandra Peters is a roofing consultant employed by Birdcreek Roofing; the site is a single-page marketing site with article sub-pages backed by Sanity `post` documents. Brand/design source-of-truth: `DESIGN.md`, `.impeccable.md`, `tandra-peters-content-style-guide.md`.
- RoofInspection component uses `@google/model-viewer` for 3D GLB rendering (`public/roof.glb`). The library is loaded via a `<script>` tag in `index.html` — it is NOT an npm package and must NOT be imported via Vite or `import`. The component is **3D-only** (the 2D mode was removed). Hotspots must be **slotted children** of `<model-viewer>` with `slot="hotspot-N"`, `data-position`, and `data-normal` 3D coords (meters); filter chapters without `position3d` upstream before rendering `<RoofInspection.Hotspot>` to avoid React hooks violations. Hotspot callouts render via **React Portal** into `document.body` (not inside the slotted div), positioned from `getBoundingClientRect`; set `contain="none"` inline style on the `<model-viewer>` element so portaled cards escape all shadow DOM clipping. Camera attributes (`camera-orbit`, `camera-target`, `field-of-view`) must be set via `useState` initializers — never derive them from render-time state/context or React will silently overwrite imperative camera changes on every re-render. The `chapters` array in `Home.tsx` is rebuilt inline each render; use a `chaptersRef` in `Diagram.tsx` and keep it out of `useEffect` dependency arrays. `activeChapterId` (callout open/close — set by hover AND click) and `focusChapterId` (camera movement — set by rail clicks ONLY) are intentionally separate; hotspot hover must NEVER set `focusChapterId`. Context is split into two providers: `RoofInspectionContext` (chapters, activeChapterId — consumed by Hotspot and Rail) and `CameraContext` (focusChapterId, views, activeViewId — consumed by Diagram and Toolbar); this prevents Diagram from re-rendering on hover. Hotspot close uses a **module-level shared timer** (not per-instance `useRef`) so moving the cursor from one hotspot to another correctly cancels the pending close.
- Internal dashboard routes (SEO dashboard, Marketing Agent, Feature Builder) are gated by `useGoogleDashboardAuth` (Google Identity); Marketing Agent and Feature Builder share `AgentChatPage`. Allowlist enforced via `GOOGLE_ALLOWED_EMAILS` (server/API) and `VITE_GOOGLE_ALLOWED_EMAILS` (client) env vars — never hardcode allowed emails in source.
- Form inputs use `@awesome.me/webawesome` (WebAwesome component library). React wrapper props are camelCase (`withClear` not `with-clear`). `WaOption` visible text goes in **children** (default slot), NOT the `label` prop — omitting children renders empty/invisible options. Set `--wa-color-focus` explicitly; it does NOT auto-derive from `--wa-color-brand`. Import from the React wrapper path (e.g. `dist/react/select/index.js`), not the raw component path. PostHog is imported from `@posthog/react` (not `posthog-js/react`).
- ESLint: `scripts/**/*.{js,mjs,cjs}` must use `globals.node` in `eslint.config.ts` (browser globals cause false `'process' is not defined` errors). Pre-commit ESLint runs with `--no-warn-ignored` so ignored files like `public/model-viewer.min.js` do not fail the hook.
