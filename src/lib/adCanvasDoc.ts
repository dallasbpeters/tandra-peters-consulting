import type { CreativeState, LogoVariant } from "./adCreative";
import type { FontPresetId } from "./adCreativeTemplates";

// ─── Element model ────────────────────────────────────────────────────────────
// Geometry is stored as percentages of the canvas: x/width relative to canvas
// width, y/height relative to canvas height. Text font sizes are in cqw so they
// scale with the canvas at any export size.

export type CanvasElementKind = "text" | "image" | "logo" | "rect" | "qr";

export type TextAlign = "left" | "center" | "right";

type CanvasElementBase = {
  id: string;
  kind: CanvasElementKind;
  name: string;
  x: number;
  y: number;
  width: number;
  /** null = auto height (text and logo elements size to content) */
  height: number | null;
  opacity: number;
  locked: boolean;
};

export type TextCanvasElement = CanvasElementBase & {
  kind: "text";
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  /** cqw units — percent of canvas width */
  fontSize: number;
  lineHeight: number;
  /** em units */
  letterSpacing: number;
  textAlign: TextAlign;
  textTransform: "none" | "uppercase";
  color: string;
  background: string | null;
  /** cqw units */
  paddingX: number;
  paddingY: number;
  borderRadius: number;
};

export type ImageCanvasElement = CanvasElementBase & {
  kind: "image";
  src: string;
  objectFit: "cover" | "contain";
};

export type LogoCanvasElement = CanvasElementBase & {
  kind: "logo";
  variant: LogoVariant;
};

export type RectCanvasElement = CanvasElementBase & {
  kind: "rect";
  fill: string;
  /** cqw units */
  borderRadius: number;
};

export type QrCanvasElement = CanvasElementBase & {
  kind: "qr";
  /** URL or text the QR encodes. */
  value: string;
  /** Dark-module color. */
  fgColor: string;
  /** Quiet-zone / background color. */
  bgColor: string;
};

export type CanvasElement =
  | TextCanvasElement
  | ImageCanvasElement
  | LogoCanvasElement
  | RectCanvasElement
  | QrCanvasElement;

export type CanvasGuide = { axis: "x" | "y"; position: number };

let idCounter = 0;
export const createElementId = () => `cel-${Date.now().toString(36)}-${idCounter++}`;

// Stable ids for elements seeded from creative copy fields so panel edits can
// keep flowing into the canvas.
export const ROLE_IDS = {
  image: "role-image",
  logo: "role-logo",
  panel: "role-panel",
  tint: "role-tint",
  eyebrow: "role-eyebrow",
  headline: "role-headline",
  headlineAccent: "role-headline-accent",
  body: "role-body",
  cta: "role-cta",
  footerBar: "role-footer-bar",
  footnote: "role-footnote",
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const CANVAS_FONT_FAMILIES = [
  { label: "IBM Plex Serif", css: '"IBM Plex Serif", serif' },
  { label: "Hanken Grotesk", css: '"Hanken Grotesk Variable", sans-serif' },
  { label: "Bebas Neue", css: '"Bebas Neue", sans-serif' },
  { label: "Caveat", css: '"Caveat Variable", cursive' },
] as const;

type FontPair = { headline: string; body: string; headlineWeight: number };

const FONT_PAIRS: Record<FontPresetId, FontPair> = {
  "brand-serif": {
    headline: '"IBM Plex Serif", serif',
    body: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 400,
  },
  "clean-sans": {
    headline: '"Hanken Grotesk Variable", sans-serif',
    body: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 750,
  },
  condensed: {
    headline: '"Bebas Neue", sans-serif',
    body: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 400,
  },
  caveat: {
    // fontsource-variable registers the family as "Caveat Variable".
    headline: '"Caveat Variable", cursive',
    body: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 600,
  },
};

export const getFontPair = (id: FontPresetId): FontPair =>
  FONT_PAIRS[id] ?? FONT_PAIRS["brand-serif"];

// ─── Element factories ────────────────────────────────────────────────────────

const baseText = (
  overrides: Partial<TextCanvasElement> & Pick<TextCanvasElement, "id" | "name" | "text">,
): TextCanvasElement => ({
  kind: "text",
  x: 10,
  y: 40,
  width: 80,
  height: null,
  opacity: 1,
  locked: false,
  fontFamily: '"Hanken Grotesk Variable", sans-serif',
  fontWeight: 600,
  fontStyle: "normal",
  fontSize: 4,
  lineHeight: 1.1,
  letterSpacing: 0,
  textAlign: "center",
  textTransform: "none",
  color: "#ffffff",
  background: null,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  ...overrides,
});

export const createTextElement = (text: string): TextCanvasElement =>
  baseText({
    id: createElementId(),
    name: "Text",
    text,
    x: 20,
    y: 44,
    width: 60,
    fontSize: 5,
    color: "#ffffff",
  });

/** Default destination for a fresh QR — the public site. */
export const DEFAULT_QR_VALUE = "https://www.tandra.me";

export const createQrElement = (value = DEFAULT_QR_VALUE): QrCanvasElement => ({
  id: createElementId(),
  kind: "qr",
  name: "QR code",
  x: 60,
  y: 60,
  width: 26,
  // Square: null height lets the wrapper size to the 1:1 SVG.
  height: null,
  opacity: 1,
  locked: false,
  value,
  fgColor: "#000000",
  bgColor: "#ffffff",
});

export const createRectElement = (fill: string): RectCanvasElement => ({
  id: createElementId(),
  kind: "rect",
  name: "Shape",
  x: 30,
  y: 38,
  width: 40,
  height: 24,
  opacity: 1,
  locked: false,
  fill,
  borderRadius: 1,
});

// ─── Seeding from creative state ──────────────────────────────────────────────
// Each layout reproduces one of the original template designs. Geometry is in
// percentages of the canvas; font sizes are cqw. Template size presets
// (headlineSize etc.) are stored as percentages where 100 = base size.

/** Everything a layout recipe needs to seed its elements. */
type SeedContext = {
  creative: CreativeState;
  fonts: FontPair;
  /** Headline size multiplier from the template preset (100 → 1). */
  hs: number;
  /** Body size multiplier from the template preset (100 → 1). */
  bs: number;
  /** CTA size multiplier from the template preset (100 → 1). */
  cs: number;
};

/**
 * Cover-fit photo element with the stable image role id.
 * @param src - Image URL from the creative state
 * @param geo - Position and size as percentages of the canvas
 */
const seedImageEl = (
  src: string,
  geo: { x: number; y: number; width: number; height: number },
): ImageCanvasElement => ({
  id: ROLE_IDS.image,
  kind: "image",
  name: "Photo",
  ...geo,
  opacity: 1,
  locked: false,
  src,
  objectFit: "cover",
});

/**
 * Logo element with auto height so the SVG keeps its aspect ratio.
 * @param geo - Position and width as percentages of the canvas
 */
const seedLogoEl = (
  creative: CreativeState,
  geo: { x: number; y: number; width: number },
): LogoCanvasElement => ({
  id: ROLE_IDS.logo,
  kind: "logo",
  name: "Logo",
  ...geo,
  height: null,
  opacity: 1,
  locked: false,
  variant: creative.logoVariant,
});

/**
 * Solid fill rectangle used for panels, tints, and footer bars.
 * @param id - Stable role id (see {@link ROLE_IDS}) so syncing can find it
 * @param opacity - 0–1; below 1 renders as a tint over the photo
 */
const seedRectEl = (
  id: string,
  name: string,
  geo: { x: number; y: number; width: number; height: number },
  fill: string,
  opacity = 1,
): RectCanvasElement => ({
  id,
  kind: "rect",
  name,
  ...geo,
  opacity,
  locked: false,
  fill,
  borderRadius: 0,
});

/**
 * Footer contact band + footnote line shared by the original designs.
 * Returns an empty array when the creative has no footnote copy.
 * @param textX - Left inset of the footnote text, in canvas percent (also
 *   mirrored on the right)
 */
const seedFooterEls = (ctx: SeedContext, textX: number): CanvasElement[] => {
  const { creative, fonts } = ctx;
  const text = [creative.footnote, creative.footnote2].filter(Boolean).join("  ·  ");
  if (!text) return [];
  return [
    seedRectEl(
      ROLE_IDS.footerBar,
      "Footer bar",
      { x: 0, y: 89, width: 100, height: 11 },
      creative.backgroundColor,
    ),
    baseText({
      id: ROLE_IDS.footnote,
      name: "Footer",
      text,
      x: textX,
      y: 92.8,
      width: 100 - textX * 2,
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: 2.6,
      letterSpacing: 0.1,
      textAlign: "left",
      textTransform: "uppercase",
      color: creative.textColor,
    }),
  ];
};

/**
 * Plain bold phone-number line — the originals don't use a pill.
 * @returns The CTA text element, or `null` when the creative has no CTA copy
 */
const seedPhoneCta = (ctx: SeedContext, geo: { x: number; y: number; width: number }) => {
  const { creative, fonts, cs } = ctx;
  if (!creative.cta) return null;
  return baseText({
    id: ROLE_IDS.cta,
    name: "CTA",
    text: creative.cta,
    ...geo,
    fontFamily: fonts.body,
    fontWeight: 800,
    fontSize: 6 * cs,
    letterSpacing: 0.02,
    textAlign: "left",
    color: creative.textColor,
  });
};

/**
 * Supporting copy. Short lines ("I can help!") get the script-style italic
 * serif accent treatment from the originals; paragraphs stay readable.
 * @returns The body text element, or `null` when the creative has no body copy
 */
const seedBodyCopy = (ctx: SeedContext, geo: { x: number; y: number; width: number }) => {
  const { creative, bs } = ctx;
  if (!creative.body) return null;
  const isScriptLine = creative.body.length <= 24;
  return baseText({
    id: ROLE_IDS.body,
    name: "Supporting copy",
    text: creative.body,
    ...geo,
    fontFamily: '"IBM Plex Serif", serif',
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: (isScriptLine ? 7 : 3.4) * bs,
    lineHeight: isScriptLine ? 1.1 : 1.4,
    textAlign: "left",
    color: isScriptLine ? creative.headlineAccentColor || creative.textColor : creative.textColor,
  });
};

/**
 * Uppercase display headline in the template's headline font.
 * @param fontSize - Final size in cqw — pass the recipe's base size already
 *   multiplied by `ctx.hs`
 */
const seedHeadlineEl = (
  ctx: SeedContext,
  geo: { x: number; y: number; width: number },
  fontSize: number,
): TextCanvasElement =>
  baseText({
    id: ROLE_IDS.headline,
    name: "Headline",
    text: ctx.creative.headline,
    ...geo,
    fontFamily: ctx.fonts.headline,
    fontWeight: ctx.fonts.headlineWeight,
    fontSize,
    lineHeight: 0.98,
    textAlign: "left",
    textTransform: "uppercase",
    color: ctx.creative.headlineColor || ctx.creative.textColor,
  });

/**
 * "Roof damage?" recipe — full photo hero, left-aligned copy stack over the
 * image, logo top-right, contact band along the bottom.
 */
const seedHeroFooter = (ctx: SeedContext): CanvasElement[] => {
  const { creative, hs } = ctx;
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push(seedImageEl(creative.imageUrl, { x: 0, y: 0, width: 100, height: 100 }));
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { x: 64, y: 5, width: 30 }));
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { x: 7, y: 13, width: 70 }, 12.5 * hs));
  }
  const body = seedBodyCopy(ctx, { x: 7, y: 42, width: 60 });
  if (body) elements.push(body);
  const cta = seedPhoneCta(ctx, { x: 7, y: 55, width: 60 });
  if (cta) elements.push(cta);
  elements.push(...seedFooterEls(ctx, 7));

  return elements;
};

/**
 * "After the storm?" / "Texas roofs" recipe — solid brand panel on the left
 * holding the copy stack, photo filling the right column.
 */
const seedStormSplit = (ctx: SeedContext): CanvasElement[] => {
  const { creative, fonts, hs } = ctx;
  const elements: CanvasElement[] = [];

  elements.push(
    seedRectEl(
      ROLE_IDS.panel,
      "Panel",
      { x: 0, y: 0, width: 58, height: 100 },
      creative.backgroundColor,
    ),
  );
  if (creative.imageUrl) {
    elements.push(seedImageEl(creative.imageUrl, { x: 58, y: 0, width: 42, height: 100 }));
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { x: 5, y: 5, width: 26 }));
  }
  if (creative.eyebrow) {
    elements.push(
      baseText({
        id: ROLE_IDS.eyebrow,
        name: "Eyebrow",
        text: creative.eyebrow,
        x: 5,
        y: 19,
        width: 48,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 2.6,
        letterSpacing: 0.14,
        textAlign: "left",
        textTransform: "uppercase",
        color: creative.headlineAccentColor || creative.textColor,
      }),
    );
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { x: 5, y: 24, width: 50 }, 9.5 * hs));
  }
  const body = seedBodyCopy(ctx, { x: 5, y: 52, width: 47 });
  if (body) elements.push(body);
  const cta = seedPhoneCta(ctx, { x: 5, y: 66, width: 50 });
  if (cta) elements.push(cta);
  elements.push(...seedFooterEls(ctx, 5));

  return elements;
};

/**
 * "Storm damage" recipe — full-bleed photo under a heavy brand-color tint,
 * copy stacked top-left.
 */
const seedStormOverlay = (ctx: SeedContext): CanvasElement[] => {
  const { creative, hs } = ctx;
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push(seedImageEl(creative.imageUrl, { x: 0, y: 0, width: 100, height: 100 }));
  }
  elements.push(
    seedRectEl(
      ROLE_IDS.tint,
      "Tint",
      { x: 0, y: 0, width: 100, height: 100 },
      creative.backgroundColor,
      0.55,
    ),
  );
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { x: 64, y: 6, width: 30 }));
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { x: 7, y: 15, width: 64 }, 12 * hs));
  }
  const body = seedBodyCopy(ctx, { x: 7, y: 44, width: 60 });
  if (body) elements.push(body);
  const cta = seedPhoneCta(ctx, { x: 7, y: 57, width: 60 });
  if (cta) elements.push(cta);
  elements.push(...seedFooterEls(ctx, 7));

  return elements;
};

/**
 * "Ask me about storm damage" recipe — photo behind a light tint plus a denser
 * left fade panel, with a two-tone headline (last line in the accent color).
 */
const seedGradientPanel = (ctx: SeedContext): CanvasElement[] => {
  const { creative, hs } = ctx;
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push(seedImageEl(creative.imageUrl, { x: 0, y: 0, width: 100, height: 100 }));
  }
  elements.push(
    seedRectEl(
      ROLE_IDS.tint,
      "Tint",
      { x: 0, y: 0, width: 100, height: 100 },
      creative.backgroundColor,
      0.35,
    ),
    seedRectEl(
      ROLE_IDS.panel,
      "Panel fade",
      { x: 0, y: 0, width: 64, height: 100 },
      creative.backgroundColor,
      0.8,
    ),
  );
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { x: 6, y: 6, width: 26 }));
  }

  // The original sets the last headline line in the accent color, so split the
  // headline into a white element and an accent element.
  if (creative.headline) {
    const lines = creative.headline.split("\n").filter((line) => line.trim().length > 0);
    const headlineSize = 8.5 * hs;
    if (lines.length >= 2) {
      const leadLines = lines.slice(0, -1);
      const accentLine = lines[lines.length - 1];
      elements.push(
        seedHeadlineEl(
          { ...ctx, creative: { ...creative, headline: leadLines.join("\n") } },
          {
            x: 6,
            y: 32,
            width: 58,
          },
          headlineSize,
        ),
        baseText({
          id: ROLE_IDS.headlineAccent,
          name: "Headline accent",
          text: accentLine,
          x: 6,
          y: 32 + leadLines.length * headlineSize * 1.02,
          width: 58,
          fontFamily: ctx.fonts.headline,
          fontWeight: ctx.fonts.headlineWeight,
          fontSize: headlineSize,
          lineHeight: 0.98,
          textAlign: "left",
          textTransform: "uppercase",
          color: creative.headlineAccentColor || creative.headlineColor,
        }),
      );
    } else {
      elements.push(seedHeadlineEl(ctx, { x: 6, y: 32, width: 58 }, headlineSize));
    }
  }

  const body = seedBodyCopy(ctx, { x: 6, y: 54, width: 56 });
  if (body) elements.push(body);
  const cta = seedPhoneCta(ctx, { x: 6, y: 62, width: 56 });
  if (cta) elements.push(cta);
  elements.push(...seedFooterEls(ctx, 6));

  return elements;
};

/**
 * Fallback recipe for layouts without a bespoke composition — centered copy
 * stack with a pill CTA over the full-bleed photo.
 */
const seedClassic = (ctx: SeedContext): CanvasElement[] => {
  const { creative, fonts, hs, bs, cs } = ctx;
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push(seedImageEl(creative.imageUrl, { x: 0, y: 0, width: 100, height: 100 }));
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { x: 74, y: 4, width: 22 }));
  }
  if (creative.eyebrow) {
    elements.push(
      baseText({
        id: ROLE_IDS.eyebrow,
        name: "Eyebrow",
        text: creative.eyebrow,
        x: 10,
        y: 7,
        width: 80,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 2.8,
        letterSpacing: 0.14,
        textTransform: "uppercase",
        color: creative.textColor,
      }),
    );
  }
  if (creative.headline) {
    elements.push(
      baseText({
        id: ROLE_IDS.headline,
        name: "Headline",
        text: creative.headline,
        x: 5,
        y: 14,
        width: 90,
        fontFamily: fonts.headline,
        fontWeight: fonts.headlineWeight,
        fontSize: 10.5 * hs,
        lineHeight: 0.98,
        textTransform: "uppercase",
        color: creative.headlineColor || creative.textColor,
      }),
    );
  }
  if (creative.body) {
    elements.push(
      baseText({
        id: ROLE_IDS.body,
        name: "Supporting copy",
        text: creative.body,
        x: 10,
        y: 35,
        width: 80,
        fontFamily: '"IBM Plex Serif", serif',
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: 7 * bs,
        lineHeight: 1.1,
        color: creative.textColor,
      }),
    );
  }
  if (creative.cta) {
    elements.push(
      baseText({
        id: ROLE_IDS.cta,
        name: "CTA",
        text: creative.cta,
        x: 26,
        y: 49,
        width: 48,
        fontFamily: fonts.body,
        fontWeight: 750,
        fontSize: 3.6 * cs,
        letterSpacing: 0.06,
        textTransform: "uppercase",
        color: "#ffffff",
        background: creative.accentColor,
        paddingX: 4,
        paddingY: 2.2,
        borderRadius: 1.4,
      }),
    );
  }
  elements.push(...seedFooterEls(ctx, 4));

  return elements;
};

/**
 * Builds the initial canvas elements for a creative, dispatching to the
 * layout-specific recipe so each template reproduces its original design
 * (geometry, layering, fonts, and colors) instead of a generic composition.
 *
 * Elements use stable role ids ({@link ROLE_IDS}) so later toolbar changes can
 * be synced onto them via {@link syncElementsFromCreative}.
 *
 * @param creative - Creative state from the selected template preset
 * @returns Elements in paint order (backgrounds first, copy on top)
 */
export const seedCanvasElements = (creative: CreativeState): CanvasElement[] => {
  const ctx: SeedContext = {
    creative,
    fonts: getFontPair(creative.fontPresetId),
    hs: (creative.headlineSize || 100) / 100,
    bs: (creative.bodySize || 100) / 100,
    cs: (creative.ctaSize || 100) / 100,
  };

  switch (creative.layout) {
    case "canva-hero-footer":
      return seedHeroFooter(ctx);
    case "storm-split":
      return seedStormSplit(ctx);
    case "canva-storm-overlay":
      return seedStormOverlay(ctx);
    case "canva-gradient-panel":
      return seedGradientPanel(ctx);
    default:
      return seedClassic(ctx);
  }
};

// Keep role-seeded image/logo elements in sync with the toolbar menus without
// disturbing geometry/styling/text users set by direct manipulation on the
// canvas. Text edits happen inline on the canvas only, so creative copy is
// intentionally NOT synced here (it would revert inline edits).
export const syncElementsFromCreative = (
  elements: CanvasElement[],
  creative: CreativeState,
): CanvasElement[] => {
  let changed = false;

  let next = elements.map((el) => {
    if (
      el.kind === "image" &&
      el.id === ROLE_IDS.image &&
      creative.imageUrl &&
      el.src !== creative.imageUrl
    ) {
      changed = true;
      return { ...el, src: creative.imageUrl };
    }
    if (el.kind === "logo" && el.id === ROLE_IDS.logo && el.variant !== creative.logoVariant) {
      changed = true;
      return { ...el, variant: creative.logoVariant };
    }
    return el;
  });

  // Image added/removed from the panel
  const hasImage = next.some((el) => el.id === ROLE_IDS.image);
  if (creative.imageUrl && !hasImage) {
    changed = true;
    next = [
      {
        id: ROLE_IDS.image,
        kind: "image",
        name: "Photo",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        opacity: 1,
        locked: false,
        src: creative.imageUrl,
        objectFit: "cover",
      },
      ...next,
    ];
  } else if (!creative.imageUrl && hasImage) {
    changed = true;
    next = next.filter((el) => el.id !== ROLE_IDS.image);
  }

  // Logo toggled from the panel
  const hasLogo = next.some((el) => el.id === ROLE_IDS.logo);
  if (creative.showLogo && !hasLogo) {
    changed = true;
    next = [
      ...next,
      {
        id: ROLE_IDS.logo,
        kind: "logo",
        name: "Logo",
        x: 74,
        y: 4,
        width: 22,
        height: null,
        opacity: 1,
        locked: false,
        variant: creative.logoVariant,
      },
    ];
  } else if (!creative.showLogo && hasLogo) {
    changed = true;
    next = next.filter((el) => el.id !== ROLE_IDS.logo);
  }

  return changed ? next : elements;
};

// ─── Snapping ─────────────────────────────────────────────────────────────────

export const SNAP_THRESHOLD = 1.2;

type SnapResult = { delta: number; guide: number | null };

/**
 * Given the moving element's candidate lines (start/center/end) and the static
 * target lines, find the smallest shift within the threshold that aligns one
 * candidate to one target.
 */
export const findSnapShift = (
  candidates: number[],
  targets: number[],
  threshold: number,
): SnapResult => {
  let best: SnapResult = { delta: 0, guide: null };
  let bestDistance = threshold;

  for (const candidate of candidates) {
    for (const target of targets) {
      const distance = Math.abs(target - candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { delta: target - candidate, guide: target };
      }
    }
  }

  return best;
};

/** Alignment targets contributed by the canvas itself plus other elements. */
export const collectSnapTargets = (
  elements: CanvasElement[],
  excludeId: string,
  canvasAspect: number,
) => {
  const xTargets = [0, 50, 100];
  const yTargets = [0, 50, 100];

  for (const el of elements) {
    if (el.id === excludeId) continue;
    xTargets.push(el.x, el.x + el.width / 2, el.x + el.width);
    if (el.height != null) {
      yTargets.push(el.y, el.y + el.height / 2, el.y + el.height);
    } else {
      yTargets.push(el.y);
    }
  }

  void canvasAspect;
  return { xTargets, yTargets };
};
