import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Connect, Plugin } from 'vite';
import sharp from 'sharp';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(pluginDir, '..');

const svgName = 'roofline.svg';

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
  '/og-image.png': [1200, 630],
  '/og-image-linkedin.png': [1200, 627],
  '/twitter-image.png': [1200, 600],
};

/**
 * Flat everglade card + type only. Roof mark comes only from `roofline.svg`.
 */
const buildCardSvg = (w: number, h: number) => {
  const titleFs = Math.max(90, Math.round(h * 0.083));
  const subFs = Math.max(40, Math.round(h * 0.035));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#001a10"/>
  <text x="50%" y="64%" text-anchor="middle" fill="#ffffff" font-size="${titleFs}" font-weight="700" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Tandra Peters</text>
  <text x="50%" y="74%" text-anchor="middle" fill="#749986" font-size="${subFs}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">BirdCreek Roofing consultant · Austin, Texas</text>
</svg>`;
};

async function renderSharePng(
  root: string,
  w: number,
  h: number,
): Promise<Buffer | null> {
  const svgPath = path.join(root, 'public', svgName);
  if (!fs.existsSync(svgPath)) {
    return null;
  }

  const cardPng = await sharp(Buffer.from(buildCardSvg(w, h), 'utf8'))
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
    .composite([{ input: overlay, left, top: roofTop, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/**
 * Dev: GET `/og-image.png`, `/og-image-linkedin.png`, `/twitter-image.png`.
 * Build: writes the same files under `dist/`.
 */
export const ogImageComposite = (): Plugin => ({
  name: 'og-image-composite',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use(
      (async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
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
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'no-store');
          res.end(buffer);
        } catch {
          next();
        }
      }) as Connect.NextHandleFunction,
    );
  },
  async closeBundle() {
    const outDir = path.join(projectRoot, 'dist');
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
