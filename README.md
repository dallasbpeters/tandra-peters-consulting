# Tandra Peters Consulting

Marketing site for [tandra.me](https://www.tandra.me/) — Vite + React SPA, Sanity CMS, Vercel deployment.

## Run locally

**Prerequisites:** Node.js, [pnpm](https://pnpm.io/)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy env vars from [`.env.example`](.env.example) to `.env.local` (see comments there for Sanity, Mapbox, PostHog, etc.).

3. Start the site and Sanity Studio together:

   ```bash
   pnpm dev:all
   ```

   - Site: http://localhost:3001
   - Studio: http://localhost:3333

## Scaffold Sanity schema + query + component

Use the interactive scaffolder when you need a new Sanity-backed component without re-prompting an LLM each time:

```bash
pnpm scaffold:sanity-component
```

It will generate and register:

- a Sanity schema type in `studio-tandra-peters/schemaTypes/(documents|objects)`
- schema registration in `studio-tandra-peters/schemaTypes/index.ts`
- GROQ query helpers in `src/sanity/generated/`
- a mapper in `src/sanity/generated/`
- a React component stub in `src/components/generated/`

After scaffolding, wire the generated query + mapper + component into the page where you want it rendered.

When extending `homePage`, the script can also auto-wire Birdcreek video fields into:

- `src/sanity/queries.ts`
- `src/sanity/mapSanityHome.tsx`
- `src/pages/Home.tsx`

Use field names like `vimeoUrl` / `birdcreekVimeoUrl` and `title` / `birdcreekVideoTitle` to trigger that flow.

## Deploy (Vercel)

Production builds use `pnpm build:vercel` (configured in [`vercel.json`](vercel.json)). That script:

1. Builds the Vite site and Sanity Studio into `dist/`
2. Bundles the Remotion project and creates a **Vercel Sandbox snapshot** (see below)

Do not set `SKIP_REMOTION_SNAPSHOT=1` on Production unless you are deliberately bypassing snapshot creation during a build emergency.

## Sanity GA dashboard plugin (non-Next setup)

This project uses `sanity-plugin-ga-dashboard` without Next.js.

- Studio plugin is registered in `studio-tandra-peters/sanity.config.ts`.
- API endpoint is served by `api/analytics.ts` (Vercel serverless).
- Local dev endpoint is served by `plugins/viteAnalyticsApi.ts` via `pnpm dev` / `pnpm dev:all`.

Required server env vars for analytics data:

- `GA_PROPERTY_ID`
- `GA_SERVICE_ACCOUNT_EMAIL`
- `GA_PRIVATE_KEY`

Required CORS allowlist for Studio origins (production):

- `GA_DASHBOARD_ALLOWED_ORIGINS`

Example:

`GA_DASHBOARD_ALLOWED_ORIGINS=https://on6anif3y43e3t03oiwrgp30.sanity.studio,https://www.tandra.me`

Notes:

- In local dev, `/api/analytics` allows `http://localhost:3333` and `http://127.0.0.1:3333` by default.
- In production, if `GA_DASHBOARD_ALLOWED_ORIGINS` is missing, cross-origin Studio requests are rejected.

---

## Remotion intro video (`TandraIntro`)

The featured intro video is a Remotion composition in [`src/remotion/`](src/remotion/). On-screen copy comes from **Home page → Tandra intro video** in Sanity so it can be edited in Presentation.

### Local development

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `pnpm video:studio`    | Open Remotion Studio to preview the composition |
| `pnpm video:sync-copy` | Pull CMS copy into Studio defaults (`Root.tsx`) |
| `pnpm video:still`     | Render a single preview frame                   |
| `pnpm video:render`    | Render MP4 locally via Remotion CLI             |

**Studio note:** Remotion Studio requires inline `defaultProps` literals in `Root.tsx`. Run `pnpm video:sync-copy` after editing copy in Sanity — do not rely on `calculateMetadata` or CLI `--props` in studio mode (it locks the props panel).

Local renders read Sanity via `SANITY_API_READ_TOKEN` or `VITE_SANITY_API_READ_TOKEN` in `.env.local` (see [`.env.example`](.env.example)).

### Production renders (Vercel Sandbox → Blob)

On each deploy, [`scripts/create-remotion-snapshot.mjs`](scripts/create-remotion-snapshot.mjs):

1. Bundles Remotion with `remotion bundle`
2. Creates a Vercel Sandbox, uploads the bundle, and takes a snapshot
3. Stores snapshot metadata in Vercel Blob at `snapshot-cache/{VERCEL_DEPLOYMENT_ID}.json`

At render time, [`POST /api/render-tandra-intro`](api/render-tandra-intro.ts):

1. Fetches latest copy from Sanity (`homePage.tandraIntroVideo`, drafts when token is set)
2. Restores the sandbox snapshot for the current deployment
3. Renders `TandraIntro` in the sandbox (~1–2 minutes)
4. Uploads the MP4 to Vercel Blob at `videos/tandra-intro/{timestamp}.mp4`
5. Saves the public URL on Sanity `homePage.tandraIntroVideo.renderedVideoUrl` (homepage reads this first)
6. Returns JSON with the public `url`, `size`, `copySource`, and `sanityUpdated`

The homepage featured video prefers `homePage.tandraIntroVideo.renderedVideoUrl` over the Home page video upload in Sanity.

The function has a 300s timeout (`vercel.json`).

#### Vercel setup

1. **Blob store** — attach a Vercel Blob store to the project. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.
2. **Sanity token** (optional) — set `SANITY_API_READ_TOKEN` on Vercel so renders include draft copy before publish.
3. **Sanity write token** — set `SANITY_WRITE_TOKEN` (or `SANITY_API_WRITE_TOKEN`) so successful renders update `homePage.tandraIntroVideo.renderedVideoUrl` for the homepage.
4. **Render auth** (recommended) — set `RENDER_VIDEO_SECRET` on Production/Preview/Development. When set, requests must include:

   ```http
   Authorization: Bearer <RENDER_VIDEO_SECRET>
   ```

   Or header `x-render-secret: <RENDER_VIDEO_SECRET>`.

#### Trigger a production render

From your machine (reads `RENDER_VIDEO_SECRET` from `.env.local`):

```bash
pnpm video:render:vercel -- --url https://www.tandra.me
```

Or with curl:

```bash
curl -X POST https://www.tandra.me/api/render-tandra-intro \
  -H "Authorization: Bearer $RENDER_VIDEO_SECRET" \
  -H "Content-Type: application/json"
```

Example response:

```json
{
  "url": "https://….public.blob.vercel-storage.com/videos/tandra-intro/….mp4",
  "size": 14478025,
  "compositionId": "TandraIntro",
  "copySource": "sanity-draft-or-published",
  "documentId": "homePage",
  "sanityUpdated": true
}
```

#### Manual snapshot (local debugging)

If you need to recreate a sandbox snapshot outside a Vercel build:

```bash
pnpm video:snapshot
```

Requires `BLOB_READ_WRITE_TOKEN` in `.env.local` (pull from Vercel after linking the Blob store).

### Remotion env vars (summary)

| Variable                   | Where                        | Purpose                                        |
| -------------------------- | ---------------------------- | ---------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN`    | Vercel (auto) / `.env.local` | Blob uploads + snapshot metadata               |
| `SANITY_API_READ_TOKEN`    | Vercel / `.env.local`        | Include draft CMS copy in renders              |
| `SANITY_WRITE_TOKEN`       | Vercel / `.env.local`        | Save rendered video URL to Sanity after render |
| `RENDER_VIDEO_SECRET`      | Vercel / `.env.local`        | Auth for `/api/render-tandra-intro`            |
| `SKIP_REMOTION_SNAPSHOT=1` | Vercel build env only        | Skip snapshot step (emergency bypass)          |

See [`.env.example`](.env.example) for the full list of project environment variables.
