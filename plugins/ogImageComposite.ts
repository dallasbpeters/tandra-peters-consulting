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

/** `roofline.svg` width as a fraction of canvas width. */
const ROOFLINE_WIDTH_RATIO = 0.42;

/**
 * Roof graphic: distance from the **top edge** of the image (pixels).
 * Larger = lower on the card; smaller = closer to the top.
 */
const ROOFLINE_TOP_PX = 120;

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
       <g id="Teledyne" transform="matrix(0.188683,0,0,0.188683,8.424006,12.925165)">
            <g transform="matrix(2.474844,0,0,4.276237,-71.247941,-69.040451)">
                <path d="M77.136,26.153L77.136,34.829L57.862,34.829L57.862,16.279L77.136,26.153Z" style="fill:rgb(148,113,218);"/>
            </g>
            <g transform="matrix(2.512332,0,0,2.474844,-23.451832,-39.715568)">
                <path d="M21.098,-0.924L37.974,16.279L-6.327,16.279L-6.327,-0.924L21.098,-0.924Z" style="fill:#FFFFFF;"/>
            </g>
            <g transform="matrix(2.817017,0,0,3.312569,-86.249385,-114.799935)">
                <path d="M39.227,34.829L39.227,58.775L22.294,58.775L22.294,44.375L39.227,34.829Z" style="fill:#FFFFFF;"/>
            </g>
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

  const overlayWidth = Math.round(w * ROOFLINE_WIDTH_RATIO);
  const overlay = await sharp(svgPath)
    .resize({
      width: overlayWidth,
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const overlayMeta = await sharp(overlay).metadata();
  const ow = overlayMeta.width ?? overlayWidth;
  /** Horizontally centered. */
  const left = Math.max(0, Math.round((w - ow) / 2));
  const roofTop = Math.max(0, ROOFLINE_TOP_PX);

  return sharp(cardPng)
    .composite([{ input: overlay, left, top: roofTop, blend: "over" }])
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
