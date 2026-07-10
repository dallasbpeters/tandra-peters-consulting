import qrcode from "qrcode-generator";

// ─── QR code SVG ────────────────────────────────────────────────────────────────
// Door hangers carry a scannable QR linking to the site / booking page. We render
// the QR as a crisp inline SVG (one path for all dark modules) so it stays sharp
// at any export size and composites cleanly through html-to-image.

/** Error-correction level: "M" balances density against scan reliability in print. */
const ERROR_CORRECTION = "M" as const;

export interface QrVector {
  path: string;
  size: number;
}

export const buildQrVector = (value: string, margin = 2): QrVector => {
  const qr = qrcode(0, ERROR_CORRECTION);
  qr.addData(value.trim() || " ");
  qr.make();

  const count = qr.getModuleCount();
  const size = count + margin * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        path += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
  }
  return { path, size };
};

/**
 * Build an SVG string for a QR encoding `value`.
 * @param margin - Quiet-zone width in modules (the spec recommends ≥4; 2 reads
 *   fine on screen and keeps the code visually larger).
 */
export const buildQrSvg = (
  value: string,
  fg: string,
  bg: string,
  margin = 2
): string => {
  const { path, size } = buildQrVector(value, margin);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/>` +
    `<path d="${path}" fill="${fg}"/>` +
    "</svg>"
  );
};

/** `data:image/svg+xml,...` URL suitable for an `<img>` `src`. */
export const buildQrDataUri = (
  value: string,
  fg: string,
  bg: string,
  margin = 2
): string =>
  `data:image/svg+xml,${encodeURIComponent(buildQrSvg(value, fg, bg, margin))}`;
