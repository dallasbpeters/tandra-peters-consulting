/**
 * Renders a saved Ad Builder creative (a STRUCTURED document of text/image/logo
 * layers) into full-size postcard-front HTML for print/mail providers.
 *
 * Why this exists: the Ad Builder persists each creative as a JSON `config`
 * holding `canvasElements` (the direct-manipulation layer model) plus the
 * `creative` state (including the ORIGINAL hero-photo URL). Previously the Lob
 * front was the ~320px `captureThumb()` raster; wrapping that tiny raster in
 * full-bleed HTML let Lob accept it, but Lob then upscaled the 320px image to
 * 2775×1875 → heavy pixelation.
 *
 * Rendering the structured doc as HTML instead means Lob rasterizes it at
 * 300 DPI: the headline/phone text and the SVG logo stay razor-sharp (vector),
 * and the hero photo is pulled from its full-resolution source (Sanity/Unsplash)
 * rather than the downscaled thumbnail. Only the photo depends on source
 * resolution, and we request it at print width.
 *
 * Server-only, dependency-light, and PURE (no network): given a config string
 * and target dimensions it returns a deterministic HTML string, which makes it
 * trivially testable and lets Lob/PostGrid share one high-res front path.
 */
import qrcode from "qrcode-generator";

/** Longest edge (px) we request for the hero photo — 6x9 full-bleed at 300 DPI. */
const PRINT_MAX_IMAGE_WIDTH = 2775;
const QR_ERROR_CORRECTION = "M" as const;
const QR_QUIET_ZONE_MODULES = 2;

/** Absolute origin that hosts the public logo SVGs (Lob fetches them by URL). */
const publicAssetOrigin = (): string =>
  (process.env.DESK_PUBLIC_ORIGIN?.trim() || "https://www.tandra.me").replace(
    /\/+$/,
    ""
  );

const LOGO_PATHS: Record<string, string> = {
  "horizontal-white": "/BC_Horizontal_White.svg",
  "vertical-white": "/BC_Vertical_White.svg",
};

const HTML_ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_ESCAPE_RE = /[&<>"']/g;
const escapeHtml = (value: string): string =>
  value.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPES[char] ?? char);

// The stored font families use the fontsource variable names; map them to the
// Google Fonts family names that the print HTML loads via <link> so Lob's
// renderer resolves them.
const FONT_FAMILY_ALIASES: [RegExp, string][] = [
  [/Hanken Grotesk Variable/g, "Hanken Grotesk"],
  [/Caveat Variable/g, "Caveat"],
];
const normalizeFontFamily = (family: string): string => {
  let next = family;
  for (const [pattern, replacement] of FONT_FAMILY_ALIASES) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  "family=Bebas+Neue&" +
  "family=Caveat:wght@400..700&" +
  "family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&" +
  "family=IBM+Plex+Serif:ital,wght@0,400;0,600;0,700;1,400;1,600&" +
  "display=swap";

// ─── Structural element model (mirrors src/lib/ad-canvas-doc.ts) ──────────────
// Serverless code cannot import from src/, and the config is our own JSON, so we
// read the fields defensively rather than sharing the client types.

interface BaseElement {
  height: number | null;
  id: string;
  kind: string;
  opacity: number;
  width: number;
  x: number;
  y: number;
}

interface ParsedConfig {
  canvasElements: unknown[];
  creative: Record<string, unknown>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

/**
 * Parse the saved config, returning the layer array and creative state, or null
 * when the config is missing/old (no structured layers) so the caller can fall
 * back to the raster-wrapping path.
 */
const parseConfig = (config: string | undefined): ParsedConfig | null => {
  if (!config?.trim()) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(config);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  const canvasElements = record.canvasElements;
  if (!(Array.isArray(canvasElements) && canvasElements.length > 0)) {
    return null;
  }
  return { canvasElements, creative: asRecord(record.creative) };
};

/** Request the hero photo at print resolution from Sanity/Unsplash CDNs. */
const withPrintWidth = (src: string): string => {
  let host = "";
  try {
    host = new URL(src).hostname;
  } catch {
    return src;
  }
  const isSanity = host === "cdn.sanity.io";
  const isUnsplash =
    host === "images.unsplash.com" || host === "plus.unsplash.com";
  if (!(isSanity || isUnsplash)) {
    return src;
  }
  const separator = src.includes("?") ? "&" : "?";
  const params = isSanity
    ? `w=${PRINT_MAX_IMAGE_WIDTH}&fit=max&auto=format`
    : `w=${PRINT_MAX_IMAGE_WIDTH}&q=80`;
  return `${src}${separator}${params}`;
};

interface RenderContext {
  /** Card aspect ratio (width / height) — relates height% to width-cqw units. */
  canvasAspect: number;
  /** Physical size of 1 cqw unit, in inches (1% of the card box width). */
  cqwIn: number;
}

/** cqw → inches. Font sizes/padding/radius are authored as cqw (percent width). */
const cqw = (value: number, ctx: RenderContext): string =>
  `${(value * ctx.cqwIn).toFixed(4)}in`;

// Shrink-to-fit for fixed-height text boxes. Mirrors src/lib/ad-text-fit.ts
// (serverless code cannot import from src/); keep the two in sync.
const AVG_CHAR_WIDTH_EM = 0.55;
const MIN_FIT_FONT_SIZE = 0.8;
const MAX_FIT_ITERATIONS = 8;
const NEWLINE_RE = /\r?\n/;

const estimateWrappedLineCount = (
  text: string,
  boxWidth: number,
  fontSize: number,
  letterSpacing: number
): number => {
  if (boxWidth <= 0 || fontSize <= 0) {
    return 1;
  }
  const charWidthCqw =
    fontSize * (AVG_CHAR_WIDTH_EM + Math.max(0, letterSpacing));
  if (charWidthCqw <= 0) {
    return 1;
  }
  let lines = 0;
  for (const rawLine of text.split(NEWLINE_RE)) {
    const chars = rawLine.trim().length;
    lines += Math.max(1, Math.ceil((chars * charWidthCqw) / boxWidth));
  }
  return Math.max(1, lines);
};

interface TextFitInput {
  boxHeight: number | null;
  boxWidth: number;
  canvasAspect: number;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  text: string;
}

const fitTextFontSize = (input: TextFitInput): number => {
  const {
    boxHeight,
    boxWidth,
    canvasAspect,
    fontSize,
    letterSpacing,
    lineHeight,
    text,
  } = input;
  if (
    boxHeight === null ||
    boxHeight <= 0 ||
    boxWidth <= 0 ||
    canvasAspect <= 0 ||
    fontSize <= 0 ||
    text.trim().length === 0
  ) {
    return fontSize;
  }
  const availableCqw = boxHeight / canvasAspect;
  let size = fontSize;
  for (let iteration = 0; iteration < MAX_FIT_ITERATIONS; iteration += 1) {
    const lines = estimateWrappedLineCount(text, boxWidth, size, letterSpacing);
    const neededCqw = lines * size * lineHeight;
    if (neededCqw <= availableCqw || size <= MIN_FIT_FONT_SIZE) {
      break;
    }
    size = Math.max(
      MIN_FIT_FONT_SIZE,
      size * Math.sqrt(availableCqw / neededCqw)
    );
  }
  return size;
};

const baseOf = (element: Record<string, unknown>): BaseElement => ({
  height:
    typeof element.height === "number" && Number.isFinite(element.height)
      ? element.height
      : null,
  id: stringOr(element.id, ""),
  kind: stringOr(element.kind, ""),
  opacity: numberOr(element.opacity, 1),
  width: numberOr(element.width, 0),
  x: numberOr(element.x, 0),
  y: numberOr(element.y, 0),
});

const wrapperStyle = (base: BaseElement, index: number, clip = true): string =>
  [
    "position:absolute",
    `left:${base.x}%`,
    `top:${base.y}%`,
    `width:${base.width}%`,
    base.height === null ? null : `height:${base.height}%`,
    `opacity:${base.opacity}`,
    `z-index:${index + 1}`,
    // Images/rects/bands crop to their box; text must never clip (it wraps).
    clip ? "overflow:hidden" : "overflow:visible",
  ]
    .filter(Boolean)
    .join(";");

const renderText = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number,
  ctx: RenderContext
): string => {
  const background = element.background;
  const fontSize = numberOr(element.fontSize, 4);
  const letterSpacing = numberOr(element.letterSpacing, 0);
  const lineHeight = numberOr(element.lineHeight, 1.1);
  // Shrink a fixed-height text box so its wrapped copy fits (no-op for the usual
  // auto-height text). Text never clips — it wraps and grows.
  const fittedSize = fitTextFontSize({
    boxHeight: base.height,
    boxWidth: base.width,
    canvasAspect: ctx.canvasAspect,
    fontSize,
    letterSpacing,
    lineHeight,
    text: stringOr(element.text, ""),
  });
  const textStyle = [
    wrapperStyle(base, index, false),
    `color:${stringOr(element.color, "#ffffff")}`,
    `font-family:${normalizeFontFamily(stringOr(element.fontFamily, "sans-serif"))}`,
    `font-size:${cqw(fittedSize, ctx)}`,
    `font-weight:${numberOr(element.fontWeight, 600)}`,
    `font-style:${stringOr(element.fontStyle, "normal")}`,
    `line-height:${lineHeight}`,
    `letter-spacing:${letterSpacing}em`,
    `text-align:${stringOr(element.textAlign, "left")}`,
    `text-transform:${stringOr(element.textTransform, "none")}`,
    `padding:${cqw(numberOr(element.paddingY, 0), ctx)} ${cqw(numberOr(element.paddingX, 0), ctx)}`,
    `border-radius:${cqw(numberOr(element.borderRadius, 0), ctx)}`,
    typeof background === "string" ? `background:${background}` : null,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "box-sizing:border-box",
  ]
    .filter(Boolean)
    .join(";");
  return `<div style="${textStyle}">${escapeHtml(stringOr(element.text, ""))}</div>`;
};

const renderImage = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number
): string => {
  const src = stringOr(element.src, "");
  if (!src) {
    return "";
  }
  const objectFit = stringOr(element.objectFit, "cover");
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="" src="${escapeHtml(withPrintWidth(src))}" ` +
    `style="width:100%;height:100%;object-fit:${objectFit};display:block;"/>` +
    "</div>"
  );
};

const renderLogo = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number
): string => {
  const variant = stringOr(element.variant, "horizontal-white");
  const path = LOGO_PATHS[variant] ?? LOGO_PATHS["horizontal-white"];
  const src = `${publicAssetOrigin()}${path}`;
  // Logo wrappers are auto-height: let the SVG keep its aspect ratio. SVG is
  // vector, so Lob rasterizes it razor-sharp at 300 DPI regardless of scale.
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="Birdcreek Roofing" src="${escapeHtml(src)}" ` +
    'style="width:100%;height:auto;display:block;"/>' +
    "</div>"
  );
};

const renderRect = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number,
  ctx: RenderContext
): string => {
  const fill = stringOr(element.fill, "#000000");
  const radius = cqw(numberOr(element.borderRadius, 0), ctx);
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<div style="width:100%;height:100%;background:${fill};border-radius:${radius};"></div>` +
    "</div>"
  );
};

const renderBand = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number
): string => {
  const colors = Array.isArray(element.colors)
    ? element.colors.filter(
        (color): color is string => typeof color === "string"
      )
    : [];
  const stops = colors.length > 0 ? colors.join(",") : "#092a1d,#217d57";
  const angle = element.rotate === true ? "270deg" : "90deg";
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<div style="width:100%;height:100%;background:linear-gradient(${angle},${stops});"></div>` +
    "</div>"
  );
};

const buildQrSvg = (value: string, fg: string, bg: string): string => {
  const qr = qrcode(0, QR_ERROR_CORRECTION);
  qr.addData(value.trim() || " ");
  qr.make();
  const count = qr.getModuleCount();
  const size = count + QR_QUIET_ZONE_MODULES * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        path += `M${col + QR_QUIET_ZONE_MODULES} ${row + QR_QUIET_ZONE_MODULES}h1v1h-1z`;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/>` +
    `<path d="${path}" fill="${fg}"/></svg>`
  );
};

const renderQr = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number
): string => {
  const svg = buildQrSvg(
    stringOr(element.value, "https://www.tandra.me"),
    stringOr(element.fgColor, "#000000"),
    stringOr(element.bgColor, "#ffffff")
  );
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="QR code" src="${dataUri}" ` +
    'style="width:100%;height:auto;aspect-ratio:1/1;display:block;"/>' +
    "</div>"
  );
};

const renderElement = (
  raw: unknown,
  index: number,
  ctx: RenderContext
): string => {
  const element = asRecord(raw);
  const base = baseOf(element);
  switch (base.kind) {
    case "text": {
      return renderText(element, base, index, ctx);
    }
    case "image": {
      return renderImage(element, base, index);
    }
    case "logo": {
      return renderLogo(element, base, index);
    }
    case "rect": {
      return renderRect(element, base, index, ctx);
    }
    case "band": {
      return renderBand(element, base, index);
    }
    case "qr": {
      return renderQr(element, base, index);
    }
    default: {
      return "";
    }
  }
};

export interface StructuredFrontResult {
  html?: string;
  ok: boolean;
}

export interface StructuredFrontOptions {
  /** Card box height in inches (trim, or trim+bleed for providers that bleed). */
  heightIn: number;
  /** Card box width in inches (trim, or trim+bleed for providers that bleed). */
  widthIn: number;
}

/**
 * Build a print-resolution postcard front from a saved Ad Builder `config`.
 *
 * The layers are painted onto a card-sized, `overflow:hidden` box whose
 * background is the creative's background color (so a full-bleed photo fills the
 * card and any bleed margin is on-brand). Text and the logo are real vector
 * content; the photo is linked at print width. Returns `{ ok: false }` when the
 * config has no structured layers so the caller can fall back to the legacy
 * raster-wrapping front.
 */
export const buildStructuredFrontHtml = (
  config: string | undefined,
  options: StructuredFrontOptions
): StructuredFrontResult => {
  const parsed = parseConfig(config);
  if (!parsed) {
    return { ok: false };
  }
  const ctx: RenderContext = {
    canvasAspect: options.widthIn / options.heightIn,
    cqwIn: options.widthIn / 100,
  };
  const background = stringOr(parsed.creative.backgroundColor, "#092a1d");
  const layers = parsed.canvasElements
    .map((element, index) => renderElement(element, index, ctx))
    .join("");
  const html =
    `<!doctype html><html><head><meta charset="utf-8"/>` +
    `<link rel="preconnect" href="https://fonts.googleapis.com"/>` +
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>` +
    `<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}"/>` +
    `<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{margin:0;padding:0;}</style>` +
    `</head>` +
    `<body style="margin:0;width:${options.widthIn}in;height:${options.heightIn}in;` +
    `position:relative;overflow:hidden;background:${background};">${
      layers
    }</body></html>`;
  return { html, ok: true };
};
