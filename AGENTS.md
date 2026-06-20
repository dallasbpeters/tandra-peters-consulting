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

- Stack: Vite 6 + React 19 + TypeScript SPA on port **3001** (`pnpm dev`). This is NOT a Next.js project — do not install `next` or `next-sanity`. Package manager is `pnpm`; lockfile is `pnpm-lock.yaml`. Run site + studio together with `pnpm dev:all`.
- Sanity Studio lives in `studio-tandra-peters/`; public client config under `src/`. Presentation / Visual Editing is configured with `@sanity/assist`. Write operations require the CLI auth token from `~/.config/sanity/config.json` — the read-only `SANITY_API_TOKEN` env var cannot write. Set `SANITY_STUDIO_PREVIEW_URL=http://localhost:3001` in `studio-tandra-peters/.env.local` or Presentation won't connect locally. Vite reads **published** documents unless `VITE_SANITY_API_READ_TOKEN` enables drafts (local dev / Presentation). **`vercel env pull` overwrites `.env.local`** and drops local-only keys (`VITE_MAPBOX_ACCESS_TOKEN`, etc.) — back up or merge manually after pulling. Agent routes (`api/agent.ts`, `api/marketing-agent.ts`) map Sanity MCP tools with AI SDK v6 **`inputSchema`**, not `parameters`; `groq_query` accepts only `query` (no `params`). **Studio perf:** Presentation + `pnpm dev:all` refetches the full home GROQ on edits (debounced in `useSanityHomeContent`); for structure-only editing use `pnpm dev:studio` and/or `SANITY_STUDIO_DISABLE_PRESENTATION=true` in `studio-tandra-peters/.env.local`. Vision is off in local dev unless `SANITY_STUDIO_ENABLE_VISION=true`. Stale Vite cache: `pnpm --dir studio-tandra-peters dev:clean`.
- Deployed to Vercel; production domain is `https://www.tandra.me/`. Contact form posts to `/api/contact` (Vercel serverless) and syncs to Attio (CRM). PostHog is reverse-proxied via `t.tandra.me`. OG images via `plugins/ogImageComposite.ts` (custom Vite plugin) using `sharp`.
- Type pair is Hanken Grotesk Variable (headings/UI) + `IBM Plex Serif` (body); Space Grotesk was removed. Do not swap either.
- CE.SDK / `@cesdk/cesdk-js` (img.ly) was tried and deliberately removed due to watermark restrictions — do not reinstall. Remotion intro video (`TandraIntro`, `src/remotion/`): production copy from Sanity `tandraIntroVideo` via `pnpm video:render` (local) or `pnpm video:render:vercel` / `POST /api/render-tandra-intro` (Vercel Sandbox → Blob; `pnpm build:vercel` runs `scripts/create-remotion-snapshot.mjs`; manual snapshot: `pnpm video:snapshot`). Serverless handlers under `api/` must not import from `src/` — keep shared logic in `api/lib/` with `.js` extensions in import paths (see `contact.ts` comment). Remotion Studio (`pnpm video:studio`) requires inline `defaultProps` literals in `Root.tsx` — do not use `calculateMetadata` or CLI `--props` in studio mode (locks the props panel). Run `pnpm video:sync-copy` to pull CMS copy into Studio.
- The standalone `~/Development/remotion-tandra` social-ad compositions (`TandraStormSpot`, `TandraRoofValue`, `RoofScene` (3D), `CustomSlots`, `HelpingTexasHomeowners` — all 1080×1350 / 30fps) were ported INTO this repo under `src/remotion/ads/` (registered via `AdsCompositions.tsx` in `src/remotion/Root.tsx` alongside the 16:9 `TandraIntro`). Their assets live in `public/ads/` (resolved by `adsFile()` in `Clips.tsx`); `roof.glb` is shared at the public root (bare `staticFile("roof.glb")`, identical md5 to the model-viewer copy). The ads use NO Tailwind utility classes — only inline `var(--token)` styles — so the original `@theme` block was replaced by plain `:root` vars in `src/remotion/ads/ads.vars.css` (works in both the Remotion webpack bundle and the SPA preview; no `@remotion/tailwind-v4` webpack override needed). Original `@components`/`@composition`/`@utils` path aliases were rewritten to relative imports. `src/remotion/ads/three-jsx.d.ts` re-declares `@react-three/fiber`'s `react/jsx-runtime` JSX augmentation project-wide so `RoofModel.tsx`/`RoofScene.tsx` `<group>`/`<mesh>` JSX type-checks (a `/// <reference types="@react-three/fiber" />` directive alone does NOT load the runtime-module augmentation under `moduleResolution: bundler`). Ad copy is NOT CMS-backed — defaults live in `src/remotion/ads/adDefaults.ts` (single source of truth shared with the registry) and mirrored in `api/lib/ad-composition-defaults.ts` for renders (keep in sync). Ad-only deps added: `@react-three/fiber`, `@react-three/drei`, `@remotion/three`, `@remotion/fonts`, `@remotion/layout-utils`, `@remotion/light-leaks`, `@remotion/paths`, `@remotion/preload`, `@remotion/rounded-text-box`, `three-stdlib`, `@remotion/tailwind-v4` (dev).
- View/render any composition in Sanity Studio via the **Videos** tool (`studio-tandra-peters/components/RemotionVideoTool.tsx`, registered in `sanity.config.ts` `tools:` + `lazyStudioTools.tsx`). It embeds the SPA's chrome-less `/remotion-preview?id=<CompositionId>` route (`src/pages/RemotionPreviewPage.tsx`, standalone router entry in `App.tsx` OUTSIDE `RootLayout`) in an iframe (like `EmailPreviewTool`, origin from `SANITY_STUDIO_PREVIEW_URL`), and a "Render MP4" button POSTs `{ compositionId }` to `/api/render-tandra-intro` (origin from `SANITY_STUDIO_RENDER_API_URL` || preview origin). `src/remotion/registry.tsx` is the shared composition registry (id/component/dims/fps/duration/defaultProps; `sanityField:"tandraIntroVideo"` marks the only CMS-backed one — the preview merges live Sanity copy for it, ad defaults for the rest). `/api/render-tandra-intro` now accepts a `compositionId` (query or body; default `TandraIntro`): ads render from static defaults → Blob (no Sanity skip/patch); `TandraIntro` keeps the content-hash skip + `homePage.tandraIntroVideo.renderedVideoUrl` patch.
- `tsc`/`pnpm lint` is currently broken at config load (`tsconfig.json` sets `ignoreDeprecations: "6.0"` but installed `tsc` is `5.8.3`, which only accepts `"5.0"` → `error TS5103`); type-check with `pnpm exec tsc --noEmit --ignoreDeprecations 5.0`. ~42 pre-existing `iconoir-react` `ForwardRefExoticComponent` errors in `serviceIconMap.tsx`/`Stats.tsx`/`ContactBanner.tsx`/`spinner.tsx` are unrelated baseline noise. Some server-render `@remotion/{renderer,effects,licensing}` packages resolve to `4.0.477` from `~/node_modules` vs the project's `4.0.466` (`npx remotion versions`) — a pre-existing env condition; `remotion bundle` still succeeds.
- Service-area map is **Mapbox GL** (`src/components/Mapbox.tsx`, wrapped by `ServiceAreaMap.tsx`). A county only renders when it exists in **all three**: Sanity `homePage.serviceAreaMap.areas` (`countyKey`), `src/components/texasCounties.json` (metadata: `fips`/`key`/`name`/`city`; `cx`/`cy`/`d` are dead SVG leftovers), and `src/components/serviceAreas.json` (GeoJSON polygon, `properties.id` === the key/`geoid` === fips). Sanity lists more counties than have geometry, so several configured counties are silently invisible until their geometry is added. As of Jun 2026 the service area now **includes** Tarrant (Fort Worth), Dallas, and McLennan (Waco) — the prior "never include Tarrant/Fort Worth" rule is retired. `clientCount` is currently unused visually (flat fill, not a choropleth).
- Tandra Peters is a roofing consultant employed by Birdcreek Roofing; the site is a single-page marketing site with article sub-pages backed by Sanity `post` documents. Brand/design source-of-truth: `DESIGN.md`, `.impeccable.md`, `tandra-peters-content-style-guide.md`.
- RoofInspection component uses `@google/model-viewer` for 3D GLB rendering (`public/roof.glb`). Load it lazily via `import('@google/model-viewer')` in `Diagram.tsx` (not a separate `/public/model-viewer.min.js` script) so Vite shares one `three` instance with `shaders` — a vendored script bundle triggers `THREE.WARNING: Multiple instances of Three.js being imported`. `vite.config.ts` sets `resolve.dedupe: ['three']`. The component is **3D-only** (the 2D mode was removed). Chapters/labels/coords come from Sanity `homePage.roofInspection.hotspots` via `mapSanityHome` → `Home.tsx` (not `Rail.tsx` directly). Sanity `roofInspectionHotspot`: **`label`** = left rail nav; **`calloutTitle`** = hotspot popup headline — separate fields. Hotspots must be **slotted children** of `<model-viewer>` with `slot="hotspot-N"`, `data-position`, and `data-normal` (metres, model-specific — re-exporting `roof.glb` can shift world origin); filter chapters without `position3d` upstream before rendering `<RoofInspection.Hotspot>` to avoid React hooks violations. `model-viewer` caches slot positions — remount hotspots when coords change (Sanity `_key` + coord React `key`) and sync `data-position`/`data-normal` on prop change; do not backfill `position3d` from `CHAPTERS`/`data.ts` when Sanity hotspots exist. Publish Home page after coord edits (or use draft preview with read token). Hotspot callouts render via **React Portal** into `document.body` (not inside the slotted div), positioned from `getBoundingClientRect`; set `contain="none"` inline style on the `<model-viewer>` element so portaled cards escape all shadow DOM clipping. Camera attributes (`camera-orbit`, `camera-target`, `field-of-view`) must be set via `useState` initializers — never derive them from render-time state/context or React will silently overwrite imperative camera changes on every re-render. The `chapters` array in `Home.tsx` is rebuilt inline each render; use a `chaptersRef` in `Diagram.tsx` and keep it out of `useEffect` dependency arrays. `activeChapterId` (callout open/close — set by hover AND click) and `focusChapterId` (camera movement — set by rail clicks ONLY) are intentionally separate; hotspot hover must NEVER set `focusChapterId`. Context is split into two providers: `RoofInspectionContext` (chapters, activeChapterId — consumed by Hotspot and Rail) and `CameraContext` (focusChapterId, views, activeViewId — consumed by Diagram and Toolbar); this prevents Diagram from re-rendering on hover. Hotspot close uses a **module-level shared timer** (not per-instance `useRef`) so moving the cursor from one hotspot to another correctly cancels the pending close.
- Google auth: dashboard routes (SEO dashboard, Marketing Agent, Feature Builder) use `useGoogleDashboardAuth`; optional home-page section gating uses `GoogleAuthGate` toggled by `VITE_GOOGLE_AUTH_GATE_ENABLED` (footer invisible hit-target opens login modal). Marketing Agent and Feature Builder share `AgentChatPage`. Allowlist via `GOOGLE_ALLOWED_EMAILS` (server/API) and `VITE_GOOGLE_ALLOWED_EMAILS` (client) — never hardcode allowed emails in source.
- Form inputs use `@awesome.me/webawesome` (WebAwesome component library). React wrapper props are camelCase (`withClear` not `with-clear`). `WaOption` visible text goes in **children** (default slot), NOT the `label` prop — omitting children renders empty/invisible options. Set `--wa-color-focus` explicitly; it does NOT auto-derive from `--wa-color-brand`. Import from the React wrapper path (e.g. `dist/react/select/index.js`), not the raw component path. PostHog is imported from `@posthog/react` (not `posthog-js/react`).
- Roof **cost estimator** is a standalone page at `/estimate` (`src/pages/EstimatorPage.tsx` → `src/components/Estimator.tsx`, a multi-step `motion` wizard), NOT a homepage section. The homepage links to it via a `ContactBanner` (`CONTACT_BANNER_ESTIMATOR` preset in `contactBannerPresets.ts`, rendered in `Home.tsx` after Testimonials; banner copy overridable from the CMS). Config lives in the **`estimatorPage` Sanity singleton** (`studio-tandra-peters/schemaTypes/documents/estimatorPage.ts`, registered in `index.ts` + `structure.ts` SINGLETONS) — questions are `estimatorQuestion`/`estimatorOption` objects (`schemaTypes/objects/`). Read via `ESTIMATOR_PAGE_QUERY` → `useSanityEstimatorPage` → `mapEstimatorPageContent` (`src/sanity/mapEstimatorPage.ts`); starter content/pricing/SEO fallbacks in `src/lib/estimator.ts` (also holds `computeEstimate`/`formatRange`). **Pricing model:** the one question flagged `drivesSquareFootage` supplies `sqftMidpoint`; estimate = `sqft × (baseRatePerSqft + Σ pricePerSqftAdd) + baseFee + Σ flatAdd`, then widened by `rangeSpreadPercent` (±%). Output is **ALWAYS a range** ("here's roughly what you'll spend"), never a single number — by product requirement. Email-the-estimate posts to `/api/estimate` (Vercel `api/estimate.ts` + dev mirror `plugins/viteEstimateDevApi.ts`, registered in `vite.config.ts`); shared logic `server/email/estimateSubmission.ts` renders two react-email variants from `server/email/estimateEmail.tsx` (`visitor` copy + `lead` to `CONTACT_NOTIFICATION_TO`) via Resend and upserts the visitor to the Sanity contact list (reuses `upsertContactLead`). Mirrors the `/api/contact` pattern exactly.
- ESLint: `scripts/**/*.{js,mjs,cjs}` must use `globals.node` in `eslint.config.ts` (browser globals cause false `'process' is not defined` errors). Pre-commit ESLint runs with `--no-warn-ignored` so ignored files like `public/model-viewer.min.js` do not fail the hook.

## Videos Tool (Sanity Studio)

The **Videos tool** (`studio-tandra-peters/components/RemotionVideoTool.tsx`) lets editors preview, edit, and render all Remotion compositions from within Sanity Studio. Use `pnpm dev:tool` to run both the site dev server (port 3001) and the Studio together.

**Live editing:** When an ad composition (non-CMS) is selected, a right panel shows editable fields grouped by scene/section. Changes are sent to the preview iframe via `postMessage` and update the Player live. The preview origin is set by `SANITY_STUDIO_PREVIEW_URL` env var (works remotely on Vercel).

**RoofScene camera positioning:** The RoofScene editor includes per-chapter camera config fields (`azimuthal`, `polar`, `radius`, `targetX/Y/Z`) and hotspot position fields. The camera configs in `adDefaults.ts` (`ROOF_SCENE_DEFAULTS.chapters`) control where each chapter's camera points. Adjust these values in the right panel to dial in the 3D roof walkthrough. The camera config defaults from the original standalone repo target the model after its `rotateX(-PI/2) * scale(0.05)` transform — if the model is positioned differently in the Player vs Studio, those values may need tuning. The `RoofScene` component itself lives in `src/remotion/ads/RoofScene.tsx`; the R3F `ThreeCanvas` requires a `<Suspense>` boundary around its children for `useGLTF` to resolve in the Player context.

**PostMessage protocol:** Studio tool sends `{ type: "remotion:updateProps", props: {...} }` to the preview iframe. Preview page (`src/pages/RemotionPreviewPage.tsx`) listens on `window.message` and merges received props into the Player's `inputProps`.

**Editor schema:** Editable fields per composition live in `src/remotion/ads/editSchemas.ts`. Each entry defines sections with fields (type: text/textarea/boolean/select/number). For RoofScene, each chapter's camera + hotspot is listed as its own section with numeric inputs.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `pnpm dlx ultracite fix` before committing to ensure compliance.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
