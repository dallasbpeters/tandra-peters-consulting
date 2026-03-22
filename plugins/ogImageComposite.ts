import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Connect, Plugin } from 'vite';
import sharp from 'sharp';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(pluginDir, '..');

const svgName = 'roofline.svg';

/** Standard share image size (no AI base art — built from vectors + your roofline only). */
const OG_W = 1200;
const OG_H = 630;

/** `roofline.svg` width as a fraction of canvas. */
const ROOFLINE_WIDTH_RATIO = 0.42;
const ROOFLINE_TOP_PX = 100;

/**
 * Flat everglade card + type only. No decorative roof shape — that comes solely from `roofline.svg`.
 */
const buildCardSvg = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#001a10"/>
  <text x="50%" y="64%" text-anchor="middle" fill="#ffffff" font-size="120" font-weight="700" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Tandra Peters</text>
  <text x="50%" y="74%" text-anchor="middle" fill="#749986" font-size="42" font-family="system-ui, -apple-system, Segoe UI, sans-serif">BirdCreek Roofing Consultant · Austin, Texas</text>
</svg>`;

async function renderOgImagePng(root: string): Promise<Buffer | null> {
  const svgPath = path.join(root, 'public', svgName);
  if (!fs.existsSync(svgPath)) {
    return null;
  }

  const cardPng = await sharp(Buffer.from(buildCardSvg(), 'utf8'))
    .resize(OG_W, OG_H)
    .png()
    .toBuffer();

  const overlayWidth = Math.round(OG_W * ROOFLINE_WIDTH_RATIO);
  const overlay = await sharp(svgPath)
    .resize({
      width: overlayWidth,
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const overlayMeta = await sharp(overlay).metadata();
  const ow = overlayMeta.width ?? overlayWidth;
  const left = Math.max(0, Math.round((OG_W - ow) / 2));

  return sharp(cardPng)
    .composite([{ input: overlay, left, top: ROOFLINE_TOP_PX, blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/**
 * Dev: GET /og-image.png serves the generated share image.
 * Build: writes dist/og-image.png (no `og-image-base.png`; roof art is only `public/roofline.svg`).
 */
export const ogImageComposite = (): Plugin => ({
  name: 'og-image-composite',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use(
      (async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        if (pathname !== '/og-image.png') {
          next();
          return;
        }
        try {
          const buffer = await renderOgImagePng(projectRoot);
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
    const outPath = path.join(projectRoot, 'dist', 'og-image.png');
    const buffer = await renderOgImagePng(projectRoot);
    if (!buffer) {
      return;
    }
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, buffer);
  },
});
