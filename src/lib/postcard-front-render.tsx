import { toBlob } from "html-to-image";

import { blobToDataUrl, getAdCanvasFontEmbedCss } from "./ad-canvas-fonts";
import { buildQrDataUri } from "./qr-code";

/**
 * Renders a saved Ad Builder creative (`config` JSON: `canvasElements` + the
 * `creative` state) into a print-resolution PNG data URL for the postcard PDF.
 *
 * The Ad Builder persists a structured layer model (text/image/logo/rect/band/
 * qr) with percentage geometry, so it can be re-rendered at any size. Rather
 * than embedding the ~320px `captureThumb()` raster (which pixelates when blown
 * up to a 6×9 card), this rebuilds the layers offscreen at 300 DPI and captures
 * them with html-to-image — text/logo stay crisp and the hero photo is pulled
 * at print width. Mirrors the server's `buildStructuredFrontHtml` so the
 * downloaded PDF matches the mailed piece.
 */

/** Longest edge (px) requested for the hero photo — 6×9 at 300 DPI. */
const PRINT_MAX_IMAGE_WIDTH = 2775;
/** Print DPI for the offscreen render. */
const PRINT_DPI = 300;

const CARD_DIMS_IN: Record<string, { heightIn: number; widthIn: number }> = {
  "4x6": { heightIn: 4, widthIn: 6 },
  "6x9": { heightIn: 6, widthIn: 9 },
};

interface BaseElement {
  height: number | null;
  kind: string;
  opacity: number;
  width: number;
  x: number;
  y: number;
}

interface ParsedConfig {
  backgroundColor: string;
  canvasElements: Record<string, unknown>[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

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
  const creative = asRecord(record.creative);
  return {
    backgroundColor: stringOr(creative.backgroundColor, "#092a1d"),
    canvasElements: canvasElements.map(asRecord),
  };
};

const LOGO_PATHS: Record<string, string> = {
  "horizontal-white": "/BC_Horizontal_White.svg",
  "vertical-white": "/BC_Vertical_White.svg",
};

/** Request the hero photo at print resolution from Sanity/Unsplash CDNs. */
const withPrintWidth = (src: string): string => {
  let host = "";
  try {
    host = new URL(src, window.location.origin).hostname;
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

const baseOf = (element: Record<string, unknown>): BaseElement => ({
  height:
    typeof element.height === "number" && Number.isFinite(element.height)
      ? element.height
      : null,
  kind: stringOr(element.kind, ""),
  opacity: numberOr(element.opacity, 1),
  width: numberOr(element.width, 0),
  x: numberOr(element.x, 0),
  y: numberOr(element.y, 0),
});

const wrapperStyle = (base: BaseElement, index: number): string =>
  [
    "position:absolute",
    `left:${base.x}%`,
    `top:${base.y}%`,
    `width:${base.width}%`,
    base.height === null ? null : `height:${base.height}%`,
    `opacity:${base.opacity}`,
    `z-index:${index + 1}`,
    "overflow:hidden",
  ]
    .filter(Boolean)
    .join(";");

/** cqw → px. Font sizes/padding/radius are authored as percent of card width. */
const cqwPx = (value: number, widthPx: number): string =>
  `${(value * (widthPx / 100)).toFixed(2)}px`;

const renderText = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number,
  widthPx: number
): string => {
  const background = element.background;
  const style = [
    wrapperStyle(base, index),
    `color:${stringOr(element.color, "#ffffff")}`,
    `font-family:${stringOr(element.fontFamily, "sans-serif")}`,
    `font-size:${cqwPx(numberOr(element.fontSize, 4), widthPx)}`,
    `font-weight:${numberOr(element.fontWeight, 600)}`,
    `font-style:${stringOr(element.fontStyle, "normal")}`,
    `line-height:${numberOr(element.lineHeight, 1.1)}`,
    `letter-spacing:${numberOr(element.letterSpacing, 0)}em`,
    `text-align:${stringOr(element.textAlign, "left")}`,
    `text-transform:${stringOr(element.textTransform, "none")}`,
    `padding:${cqwPx(numberOr(element.paddingY, 0), widthPx)} ${cqwPx(
      numberOr(element.paddingX, 0),
      widthPx
    )}`,
    `border-radius:${cqwPx(numberOr(element.borderRadius, 0), widthPx)}`,
    typeof background === "string" ? `background:${background}` : null,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "box-sizing:border-box",
  ]
    .filter(Boolean)
    .join(";");
  return `<div style="${style}">${escapeHtml(stringOr(element.text, ""))}</div>`;
};

const renderImage = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number,
  resolvedSrc: string
): string => {
  if (!resolvedSrc) {
    return "";
  }
  const objectFit = stringOr(element.objectFit, "cover");
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="" src="${escapeHtml(resolvedSrc)}" ` +
    `style="width:100%;height:100%;object-fit:${objectFit};display:block;"/>` +
    "</div>"
  );
};

const renderLogo = (
  base: BaseElement,
  index: number,
  resolvedSrc: string
): string => {
  if (!resolvedSrc) {
    return "";
  }
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="Birdcreek Roofing" src="${escapeHtml(resolvedSrc)}" ` +
    'style="width:100%;height:auto;display:block;"/>' +
    "</div>"
  );
};

const renderRect = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number,
  widthPx: number
): string => {
  const fill = stringOr(element.fill, "#000000");
  const radius = cqwPx(numberOr(element.borderRadius, 0), widthPx);
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

const renderQr = (
  element: Record<string, unknown>,
  base: BaseElement,
  index: number
): string => {
  const dataUri = buildQrDataUri(
    stringOr(element.value, "https://www.tandra.me"),
    stringOr(element.fgColor, "#000000"),
    stringOr(element.bgColor, "#ffffff")
  );
  return (
    `<div style="${wrapperStyle(base, index)}">` +
    `<img alt="QR code" src="${dataUri}" ` +
    'style="width:100%;height:auto;aspect-ratio:1/1;display:block;"/>' +
    "</div>"
  );
};

const renderElement = (
  element: Record<string, unknown>,
  index: number,
  widthPx: number,
  resolvedSrcs: Map<number, string>
): string => {
  const base = baseOf(element);
  switch (base.kind) {
    case "text": {
      return renderText(element, base, index, widthPx);
    }
    case "image": {
      return renderImage(element, base, index, resolvedSrcs.get(index) ?? "");
    }
    case "logo": {
      return renderLogo(base, index, resolvedSrcs.get(index) ?? "");
    }
    case "rect": {
      return renderRect(element, base, index, widthPx);
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

const waitForImage = (img: HTMLImageElement): Promise<void> => {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }
  // Image load is a callback API; a Promise wrapper is required.
  // oxlint-disable-next-line promise/avoid-new
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
};

/**
 * Fetch an image URL and return it as a same-document data URL. Inlining every
 * image BEFORE html-to-image captures the node means the export canvas never
 * touches an external origin — so it can't be tainted (which would make
 * `toBlob` throw) and no external SVG silently fails to load.
 */
const fetchAsDataUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      return "";
    }
    return await blobToDataUrl(await response.blob());
  } catch {
    return "";
  }
};

/** Resolve every image/logo layer's src to an inlined data URL, keyed by index. */
const resolveLayerSrcs = async (
  elements: Record<string, unknown>[]
): Promise<Map<number, string>> => {
  const entries = await Promise.all(
    elements.map(async (element, index): Promise<[number, string] | null> => {
      const kind = stringOr(element.kind, "");
      if (kind === "image") {
        const src = stringOr(element.src, "");
        return src ? [index, await fetchAsDataUrl(withPrintWidth(src))] : null;
      }
      if (kind === "logo") {
        const variant = stringOr(element.variant, "horizontal-white");
        const path = LOGO_PATHS[variant] ?? LOGO_PATHS["horizontal-white"];
        return [index, await fetchAsDataUrl(path)];
      }
      return null;
    })
  );
  return new Map(entries.filter((entry): entry is [number, string] => !!entry));
};

const waitForImages = async (node: HTMLElement): Promise<void> => {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(images.map(waitForImage));
};

/**
 * Render the saved creative `config` to a print-resolution PNG data URL, or
 * `null` when the config has no structured layers (caller falls back to the
 * stored thumbnail).
 */
export const renderPostcardFrontToDataUrl = async (
  config: string | undefined,
  size: string
): Promise<string | null> => {
  const parsed = parseConfig(config);
  if (!parsed) {
    return null;
  }
  const dims = CARD_DIMS_IN[size] ?? CARD_DIMS_IN["6x9"];
  const widthPx = Math.round(dims.widthIn * PRINT_DPI);
  const heightPx = Math.round(dims.heightIn * PRINT_DPI);

  const resolvedSrcs = await resolveLayerSrcs(parsed.canvasElements);
  const layers = parsed.canvasElements
    .map((element, index) =>
      renderElement(element, index, widthPx, resolvedSrcs)
    )
    .join("");

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    "pointer-events:none",
    `width:${widthPx}px`,
    `height:${heightPx}px`,
    "overflow:hidden",
    `background:${parsed.backgroundColor}`,
  ].join(";");
  container.innerHTML = layers;
  document.body.append(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
    await waitForImages(container);
    const fontEmbedCSS = await getAdCanvasFontEmbedCss();
    const blob = await toBlob(container, {
      backgroundColor: parsed.backgroundColor,
      canvasHeight: heightPx,
      canvasWidth: widthPx,
      fontEmbedCSS,
      height: heightPx,
      pixelRatio: 1,
      skipAutoScale: true,
      type: "image/png",
      width: widthPx,
    });
    if (!blob) {
      return null;
    }
    return await blobToDataUrl(blob);
  } catch {
    return null;
  } finally {
    container.remove();
  }
};
