import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Connect, Plugin } from "vite";
import sharp from "sharp";

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(pluginDir, "..");

const svgName = "roofline.svg";

/**
 * libvips/Sharp does not reliably rasterize modern CSS color functions like
 * `oklch(...)` inside SVG text/shape fills, so OG assets use plain sRGB values.
 */
const OG_COLORS = {
  background: "#143029",
  title: "#f7f6f1",
  subtitle: "#d7e7de",
} as const;

/**
 * Share image routes → [width, height].
 * - Facebook / primary Open Graph: 1200×630 (1.91:1)
 * - LinkedIn published spec: 1200×627
 * - Twitter/X summary_large_image: 2:1 → 1200×600
 */
const SHARE_ROUTES: Record<string, readonly [number, number]> = {
  "/og-image.png": [1200, 630],
  "/og-image-linkedin.png": [1200, 627],
  "/twitter-image.png": [1200, 600],
};

/**
 * Flat everglade card + type only. Roof mark comes only from `roofline.svg`.
 */
const buildCardSvg = (w: number, h: number) => {
  const titleFs = Math.max(90, Math.round(h * 0.083));
  const subFs = Math.max(40, Math.round(h * 0.035));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${OG_COLORS.background}"/>
       <g transform="matrix(11.266663,0,0,19.467461,86.306376,-63.057365)">
        <path d="M77.136,26.153L77.136,34.829L57.862,34.829L57.862,16.279L77.136,26.153Z" style="fill:rgb(148,113,218);"/>
    </g>
    <g transform="matrix(11.437328,0,0,11.266663,303.896939,70.443415)">
        <path d="M21.098,-0.924L37.974,16.279L-6.327,16.279L-6.327,-0.924L21.098,-0.924Z" style="fill:#0b1c18;"/>
    </g>
    <g transform="matrix(12.824398,0,0,15.080385,18.012686,-271.376249)">
        <path d="M39.227,34.829L39.227,58.775L22.294,58.775L22.294,44.375L39.227,34.829Z" style="fill:#0b1c18;"/>
    </g>
  <text x="50%" y="64%" text-anchor="middle" fill="${OG_COLORS.title}" font-size="${titleFs}" font-weight="700" font-family="Arial, Helvetica, sans-serif">Tandra Peters</text>
  <text x="50%" y="74%" text-anchor="middle" fill="${OG_COLORS.subtitle}" font-size="${subFs}" font-family="Arial, Helvetica, sans-serif">Birdcreek Roofing Consultant · Austin, Texas</text>
</svg>`;
};

async function renderSharePng(
  root: string,
  w: number,
  h: number,
): Promise<Buffer | null> {
  const svgPath = path.join(root, "public", svgName);
  if (!fs.existsSync(svgPath)) {
    return null;
  }

  const cardPng = await sharp(Buffer.from(buildCardSvg(w, h), "utf8"))
    .resize(w, h)
    .png()
    .toBuffer();

  return sharp(cardPng)
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/**
 * Dev: GET `/og-image.png`, `/og-image-linkedin.png`, `/twitter-image.png`.
 * Build: writes the same files under `dist/`.
 */
export const ogImageComposite = (): Plugin => ({
  name: "og-image-composite",
  enforce: "pre",
  configureServer(server) {
    server.middlewares.use((async (req, res, next) => {
      const pathname = req.url?.split("?")[0] ?? "";
      const dims = SHARE_ROUTES[pathname];
      if (!dims) {
        next();
        return;
      }
      try {
        const [w, h] = dims;
        const buffer = await renderSharePng(projectRoot, w, h);
        if (!buffer) {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.end(buffer);
      } catch {
        next();
      }
    }) as Connect.NextHandleFunction);
  },
  async closeBundle() {
    const outDir = path.join(projectRoot, "dist");
    await fs.promises.mkdir(outDir, { recursive: true });

    for (const [route, [w, h]] of Object.entries(SHARE_ROUTES)) {
      const name = path.basename(route);
      const buffer = await renderSharePng(projectRoot, w, h);
      if (!buffer) {
        continue;
      }
      await fs.promises.writeFile(path.join(outDir, name), buffer);
    }
  },
});
