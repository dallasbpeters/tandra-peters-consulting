import type {
  CreativeState,
  DoorHangerCutout,
  LogoVariant,
} from "./ad-creative";
import type { FontPresetId } from "./ad-creative-templates";

// ─── Element model ────────────────────────────────────────────────────────────
// Geometry is stored as percentages of the canvas: x/width relative to canvas
// width, y/height relative to canvas height. Text font sizes are in cqw so they
// scale with the canvas at any export size.

export type CanvasElementKind =
  | "text"
  | "image"
  | "logo"
  | "rect"
  | "qr"
  | "band";

export type TextAlign = "left" | "center" | "right";

interface CanvasElementBase {
  /** null = auto height (text and logo elements size to content) */
  height: number | null;
  id: string;
  kind: CanvasElementKind;
  locked: boolean;
  name: string;
  opacity: number;
  width: number;
  x: number;
  y: number;
}

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
  /** Fill color applied to the SVG logo; defaults to white (#ffffff). */
  color?: string;
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

export type BandCanvasElement = CanvasElementBase & {
  kind: "band";
  /** Gradient color stops, left to right. */
  colors: string[];
  /** Flip the gradient 180deg. */
  rotate: boolean;
};

export type CanvasElement =
  | TextCanvasElement
  | ImageCanvasElement
  | LogoCanvasElement
  | RectCanvasElement
  | QrCanvasElement
  | BandCanvasElement;

export interface CanvasGuide {
  axis: "x" | "y";
  position: number;
}

let idCounter = 0;
export const createElementId = () =>
  `cel-${Date.now().toString(36)}-${idCounter++}`;

// Stable ids for elements seeded from creative copy fields so panel edits can
// keep flowing into the canvas.
export const ROLE_IDS = {
  body: "role-body",
  cta: "role-cta",
  eyebrow: "role-eyebrow",
  footerBar: "role-footer-bar",
  footnote: "role-footnote",
  headline: "role-headline",
  headlineAccent: "role-headline-accent",
  image: "role-image",
  logo: "role-logo",
  panel: "role-panel",
  tint: "role-tint",
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const CANVAS_FONT_FAMILIES = [
  { css: '"IBM Plex Serif", serif', label: "IBM Plex Serif" },
  { css: '"Hanken Grotesk Variable", sans-serif', label: "Hanken Grotesk" },
  { css: '"Bebas Neue", sans-serif', label: "Bebas Neue" },
  { css: '"Caveat Variable", cursive', label: "Caveat" },
] as const;

interface FontPair {
  body: string;
  headline: string;
  headlineWeight: number;
}

const FONT_PAIRS: Record<FontPresetId, FontPair> = {
  "brand-serif": {
    body: '"Hanken Grotesk Variable", sans-serif',
    headline: '"IBM Plex Serif", serif',
    headlineWeight: 400,
  },
  caveat: {
    body: '"Hanken Grotesk Variable", sans-serif',
    // fontsource-variable registers the family as "Caveat Variable".
    headline: '"Caveat Variable", cursive',
    headlineWeight: 600,
  },
  "clean-sans": {
    body: '"Hanken Grotesk Variable", sans-serif',
    headline: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 750,
  },
  condensed: {
    body: '"Hanken Grotesk Variable", sans-serif',
    headline: '"Bebas Neue", sans-serif',
    headlineWeight: 400,
  },
};

export const getFontPair = (id: FontPresetId): FontPair =>
  FONT_PAIRS[id] ?? FONT_PAIRS["brand-serif"];

// ─── Element factories ────────────────────────────────────────────────────────

const baseText = (
  overrides: Partial<TextCanvasElement> &
    Pick<TextCanvasElement, "id" | "name" | "text">
): TextCanvasElement => ({
  background: null,
  borderRadius: 0,
  color: "#ffffff",
  fontFamily: '"Hanken Grotesk Variable", sans-serif',
  fontSize: 4,
  fontStyle: "normal",
  fontWeight: 600,
  height: null,
  kind: "text",
  letterSpacing: 0,
  lineHeight: 1.1,
  locked: false,
  opacity: 1,
  paddingX: 0,
  paddingY: 0,
  textAlign: "center",
  textTransform: "none",
  width: 80,
  x: 10,
  y: 40,
  ...overrides,
});

export const createTextElement = (text: string): TextCanvasElement =>
  baseText({
    color: "#ffffff",
    fontSize: 5,
    id: createElementId(),
    name: "Text",
    text,
    width: 60,
    x: 20,
    y: 44,
  });

/** Default destination for a fresh QR — the public site. */
export const DEFAULT_QR_VALUE = "https://www.tandra.me";

export const createQrElement = (value = DEFAULT_QR_VALUE): QrCanvasElement => ({
  bgColor: "#ffffff",
  fgColor: "#000000",
  // Square: null height lets the wrapper size to the 1:1 SVG.
  height: null,
  id: createElementId(),
  kind: "qr",
  locked: false,
  name: "QR code",
  opacity: 1,
  value,
  width: 26,
  x: 60,
  y: 60,
});

export const createRectElement = (fill: string): RectCanvasElement => ({
  borderRadius: 1,
  fill,
  height: 24,
  id: createElementId(),
  kind: "rect",
  locked: false,
  name: "Shape",
  opacity: 1,
  width: 40,
  x: 30,
  y: 38,
});

export const createBandElement = (colors: string[]): BandCanvasElement => ({
  colors,
  height: 3,
  id: createElementId(),
  kind: "band",
  locked: false,
  name: "Band",
  opacity: 1,
  rotate: false,
  width: 100,
  x: 0,
  y: 80,
});

// ─── Seeding from creative state ──────────────────────────────────────────────
// Each layout reproduces one of the original template designs. Geometry is in
// percentages of the canvas; font sizes are cqw. Template size presets
// (headlineSize etc.) are stored as percentages where 100 = base size.

/** Everything a layout recipe needs to seed its elements. */
interface SeedContext {
  /** Body size multiplier from the template preset (100 → 1). */
  bs: number;
  creative: CreativeState;
  /** CTA size multiplier from the template preset (100 → 1). */
  cs: number;
  fonts: FontPair;
  /** Headline size multiplier from the template preset (100 → 1). */
  hs: number;
}

/**
 * Cover-fit photo element with the stable image role id.
 * @param src - Image URL from the creative state
 * @param geo - Position and size as percentages of the canvas
 */
const seedImageEl = (
  src: string,
  geo: { x: number; y: number; width: number; height: number }
): ImageCanvasElement => ({
  id: ROLE_IDS.image,
  kind: "image",
  name: "Photo",
  ...geo,
  locked: false,
  objectFit: "cover",
  opacity: 1,
  src,
});

/**
 * Logo element with auto height so the SVG keeps its aspect ratio.
 * @param geo - Position and width as percentages of the canvas
 */
const seedLogoEl = (
  creative: CreativeState,
  geo: { x: number; y: number; width: number }
): LogoCanvasElement => ({
  id: ROLE_IDS.logo,
  kind: "logo",
  name: "logo",
  ...geo,
  color: "#ffffff",
  height: null,
  locked: false,
  opacity: 1,
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
  opacity = 1
): RectCanvasElement => ({
  id,
  kind: "rect",
  name,
  ...geo,
  borderRadius: 0,
  fill,
  locked: false,
  opacity,
});

/**
 * Footer contact band + footnote line shared by the original designs.
 * Returns an empty array when the creative has no footnote copy.
 * @param textX - Left inset of the footnote text, in canvas percent (also
 *   mirrored on the right)
 */
const seedFooterEls = (ctx: SeedContext, textX: number): CanvasElement[] => {
  const { creative, fonts } = ctx;
  const text = [creative.footnote, creative.footnote2]
    .filter(Boolean)
    .join("  ·  ");
  if (!text) {
    return [];
  }
  return [
    seedRectEl(
      ROLE_IDS.footerBar,
      "Footer bar",
      { height: 11, width: 100, x: 0, y: 89 },
      creative.backgroundColor
    ),
    baseText({
      color: creative.textColor,
      fontFamily: fonts.body,
      fontSize: 2.6,
      fontWeight: 700,
      id: ROLE_IDS.footnote,
      letterSpacing: 0.1,
      name: "footer",
      text,
      textAlign: "left",
      textTransform: "uppercase",
      width: 100 - textX * 2,
      x: textX,
      y: 92.8,
    }),
  ];
};

/**
 * Plain bold phone-number line — the originals don't use a pill.
 * @returns The CTA text element, or `null` when the creative has no CTA copy
 */
const seedPhoneCta = (
  ctx: SeedContext,
  geo: { x: number; y: number; width: number }
) => {
  const { creative, fonts, cs } = ctx;
  if (!creative.cta) {
    return null;
  }
  return baseText({
    id: ROLE_IDS.cta,
    name: "CTA",
    text: creative.cta,
    ...geo,
    color: creative.textColor,
    fontFamily: fonts.body,
    fontSize: 6 * cs,
    fontWeight: 800,
    letterSpacing: 0.02,
    textAlign: "left",
  });
};

/**
 * Supporting copy. Short lines ("I can help!") get the script-style italic
 * serif accent treatment from the originals; paragraphs stay readable.
 * @returns The body text element, or `null` when the creative has no body copy
 */
const seedBodyCopy = (
  ctx: SeedContext,
  geo: { x: number; y: number; width: number }
) => {
  const { creative, bs } = ctx;
  if (!creative.body) {
    return null;
  }
  const isScriptLine = creative.body.length <= 24;
  return baseText({
    id: ROLE_IDS.body,
    name: "Supporting copy",
    text: creative.body,
    ...geo,
    color: isScriptLine
      ? creative.headlineAccentColor || creative.textColor
      : creative.textColor,
    fontFamily: '"IBM Plex Serif", serif',
    fontSize: (isScriptLine ? 7 : 3.4) * bs,
    fontStyle: "italic",
    fontWeight: 400,
    lineHeight: isScriptLine ? 1.1 : 1.4,
    textAlign: "left",
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
  fontSize: number
): TextCanvasElement =>
  baseText({
    id: ROLE_IDS.headline,
    name: "Headline",
    text: ctx.creative.headline,
    ...geo,
    color: ctx.creative.headlineColor || ctx.creative.textColor,
    fontFamily: ctx.fonts.headline,
    fontSize,
    fontWeight: ctx.fonts.headlineWeight,
    lineHeight: 0.98,
    textAlign: "left",
    textTransform: "uppercase",
  });

/**
 * "Roof damage?" recipe — full photo hero, left-aligned copy stack over the
 * image, logo top-right, contact band along the bottom.
 */
const seedHeroFooter = (ctx: SeedContext): CanvasElement[] => {
  const { creative, hs } = ctx;
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 100, x: 0, y: 0 })
    );
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 30, x: 64, y: 5 }));
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { width: 70, x: 7, y: 13 }, 12.5 * hs));
  }
  const body = seedBodyCopy(ctx, { width: 60, x: 7, y: 42 });
  if (body) {
    elements.push(body);
  }
  const cta = seedPhoneCta(ctx, { width: 60, x: 7, y: 55 });
  if (cta) {
    elements.push(cta);
  }
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
      { height: 100, width: 58, x: 0, y: 0 },
      creative.backgroundColor
    )
  );
  if (creative.imageUrl) {
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 42, x: 58, y: 0 })
    );
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 26, x: 5, y: 5 }));
  }
  if (creative.eyebrow) {
    elements.push(
      baseText({
        color: creative.headlineAccentColor || creative.textColor,
        fontFamily: fonts.body,
        fontSize: 2.6,
        fontWeight: 700,
        id: ROLE_IDS.eyebrow,
        letterSpacing: 0.14,
        name: "Eyebrow",
        text: creative.eyebrow,
        textAlign: "left",
        textTransform: "uppercase",
        width: 48,
        x: 5,
        y: 19,
      })
    );
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { width: 50, x: 5, y: 24 }, 9.5 * hs));
  }
  const body = seedBodyCopy(ctx, { width: 47, x: 5, y: 52 });
  if (body) {
    elements.push(body);
  }
  const cta = seedPhoneCta(ctx, { width: 50, x: 5, y: 66 });
  if (cta) {
    elements.push(cta);
  }
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
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 100, x: 0, y: 0 })
    );
  }
  elements.push(
    seedRectEl(
      ROLE_IDS.tint,
      "Tint",
      { height: 100, width: 100, x: 0, y: 0 },
      creative.backgroundColor,
      0.55
    )
  );
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 30, x: 64, y: 6 }));
  }
  if (creative.headline) {
    elements.push(seedHeadlineEl(ctx, { width: 64, x: 7, y: 15 }, 12 * hs));
  }
  const body = seedBodyCopy(ctx, { width: 60, x: 7, y: 44 });
  if (body) {
    elements.push(body);
  }
  const cta = seedPhoneCta(ctx, { width: 60, x: 7, y: 57 });
  if (cta) {
    elements.push(cta);
  }
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
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 100, x: 0, y: 0 })
    );
  }
  elements.push(
    seedRectEl(
      ROLE_IDS.tint,
      "Tint",
      { height: 100, width: 100, x: 0, y: 0 },
      creative.backgroundColor,
      0.35
    ),
    seedRectEl(
      ROLE_IDS.panel,
      "Panel fade",
      { height: 100, width: 64, x: 0, y: 0 },
      creative.backgroundColor,
      0.8
    )
  );
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 26, x: 6, y: 6 }));
  }

  // The original sets the last headline line in the accent color, so split the
  // headline into a white element and an accent element.
  if (creative.headline) {
    const lines = creative.headline
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const headlineSize = 8.5 * hs;
    if (lines.length >= 2) {
      const leadLines = lines.slice(0, -1);
      const accentLine = lines.at(-1);
      elements.push(
        seedHeadlineEl(
          { ...ctx, creative: { ...creative, headline: leadLines.join("\n") } },
          {
            width: 58,
            x: 6,
            y: 32,
          },
          headlineSize
        ),
        baseText({
          color: creative.headlineAccentColor || creative.headlineColor,
          fontFamily: ctx.fonts.headline,
          fontSize: headlineSize,
          fontWeight: ctx.fonts.headlineWeight,
          id: ROLE_IDS.headlineAccent,
          lineHeight: 0.98,
          name: "Headline accent",
          text: accentLine,
          textAlign: "left",
          textTransform: "uppercase",
          width: 58,
          x: 6,
          y: 32 + leadLines.length * headlineSize * 1.02,
        })
      );
    } else {
      elements.push(
        seedHeadlineEl(ctx, { width: 58, x: 6, y: 32 }, headlineSize)
      );
    }
  }

  const body = seedBodyCopy(ctx, { width: 56, x: 6, y: 54 });
  if (body) {
    elements.push(body);
  }
  const cta = seedPhoneCta(ctx, { width: 56, x: 6, y: 62 });
  if (cta) {
    elements.push(cta);
  }
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
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 100, x: 0, y: 0 })
    );
  }
  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 22, x: 74, y: 4 }));
  }
  if (creative.eyebrow) {
    elements.push(
      baseText({
        color: creative.textColor,
        fontFamily: fonts.body,
        fontSize: 2.8,
        fontWeight: 700,
        id: ROLE_IDS.eyebrow,
        letterSpacing: 0.14,
        name: "Eyebrow",
        text: creative.eyebrow,
        textTransform: "uppercase",
        width: 80,
        x: 10,
        y: 7,
      })
    );
  }
  if (creative.headline) {
    elements.push(
      baseText({
        color: creative.headlineColor || creative.textColor,
        fontFamily: fonts.headline,
        fontSize: 10.5 * hs,
        fontWeight: fonts.headlineWeight,
        id: ROLE_IDS.headline,
        lineHeight: 0.98,
        name: "Headline",
        text: creative.headline,
        textTransform: "uppercase",
        width: 90,
        x: 5,
        y: 14,
      })
    );
  }
  if (creative.body) {
    elements.push(
      baseText({
        color: creative.textColor,
        fontFamily: '"IBM Plex Serif", serif',
        fontSize: 7 * bs,
        fontStyle: "italic",
        fontWeight: 400,
        id: ROLE_IDS.body,
        lineHeight: 1.1,
        name: "Supporting copy",
        text: creative.body,
        width: 80,
        x: 10,
        y: 35,
      })
    );
  }
  if (creative.cta) {
    elements.push(
      baseText({
        background: creative.accentColor,
        borderRadius: 1.4,
        color: "#ffffff",
        fontFamily: fonts.body,
        fontSize: 3.6 * cs,
        fontWeight: 750,
        id: ROLE_IDS.cta,
        letterSpacing: 0.06,
        name: "CTA",
        paddingX: 4,
        paddingY: 2.2,
        text: creative.cta,
        textTransform: "uppercase",
        width: 48,
        x: 26,
        y: 49,
      })
    );
  }
  elements.push(...seedFooterEls(ctx, 4));

  return elements;
};

/**
 * Die-cut door-hanger recipe — a single centered, vertically stacked column
 * tuned for the tall/narrow print format. Every element is positioned BELOW the
 * knob cutout (hole + slot) so nothing crowds the die-cut, and the default font
 * sizes are scaled up substantially: font sizes are cqw (percent of the narrow
 * width), so on a tall canvas they must be much larger than the social recipes
 * to read at a comparable visual size.
 *
 * This recipe is used for any platform with a {@link DoorHangerCutout},
 * regardless of which template layout the user picked, so the defaults are
 * always door-hanger-appropriate (the template still drives colors, fonts,
 * copy, and photo).
 */
const seedDoorHanger = (
  ctx: SeedContext,
  cutout: DoorHangerCutout
): CanvasElement[] => {
  const { creative, fonts, hs, bs, cs } = ctx;
  const elements: CanvasElement[] = [];

  const widthIn = creative.adWidth || 4.25;
  const heightIn = creative.adHeight || 11;
  // cqw is a percent of WIDTH; convert a cqw text height into a percent of
  // canvas HEIGHT so the flowing stack advances correctly on a tall canvas.
  const aspect = widthIn / heightIn;
  const blockPct = (sizeCqw: number, lines: number, lineHeight: number) =>
    sizeCqw * aspect * lineHeight * lines;
  const lineCount = (text: string) =>
    text.split("\n").filter((line) => line.trim().length > 0).length || 1;

  // Clear the knob hole plus a comfortable margin so nothing sits near the
  // cutout. Hole bottom = (centre-from-top + radius) / total height.
  const holeBottomPct =
    ((cutout.holeCenterFromTop + cutout.holeDiameter / 2) / heightIn) * 100;
  const safeTop = holeBottomPct + 6;

  // Full-bleed photo with a heavy brand tint keeps the stacked copy legible;
  // without a photo the solid canvas background shows through.
  if (creative.imageUrl) {
    elements.push(
      seedImageEl(creative.imageUrl, { height: 100, width: 100, x: 0, y: 0 })
    );
    elements.push(
      seedRectEl(
        ROLE_IDS.tint,
        "Tint",
        { height: 100, width: 100, x: 0, y: 0 },
        creative.backgroundColor,
        0.55
      )
    );
  }

  let y = safeTop;

  if (creative.showLogo) {
    elements.push(seedLogoEl(creative, { width: 46, x: 27, y }));
    // Logo is auto-height (~aspect ratio of the horizontal mark over 46% width).
    y += 46 * aspect * 0.42 + 4;
  }

  if (creative.eyebrow) {
    const size = 5.5;
    elements.push(
      baseText({
        color: creative.headlineAccentColor || creative.textColor,
        fontFamily: fonts.body,
        fontSize: size,
        fontWeight: 700,
        id: ROLE_IDS.eyebrow,
        letterSpacing: 0.12,
        name: "Eyebrow",
        text: creative.eyebrow,
        textAlign: "center",
        textTransform: "uppercase",
        width: 88,
        x: 6,
        y,
      })
    );
    y += blockPct(size, 1, 1.1) + 2.5;
  }

  if (creative.headline) {
    const size = 18 * hs;
    elements.push(
      baseText({
        color: creative.headlineColor || creative.textColor,
        fontFamily: fonts.headline,
        fontSize: size,
        fontWeight: fonts.headlineWeight,
        id: ROLE_IDS.headline,
        lineHeight: 0.98,
        name: "Headline",
        text: creative.headline,
        textAlign: "center",
        textTransform: "uppercase",
        width: 90,
        x: 5,
        y,
      })
    );
    y += blockPct(size, lineCount(creative.headline), 0.98) + 4;
  }

  if (creative.body) {
    const size = 7 * bs;
    elements.push(
      baseText({
        color: creative.textColor,
        fontFamily: '"IBM Plex Serif", serif',
        fontSize: size,
        fontStyle: "italic",
        fontWeight: 400,
        id: ROLE_IDS.body,
        lineHeight: 1.25,
        name: "Supporting copy",
        text: creative.body,
        textAlign: "center",
        width: 84,
        x: 8,
        y,
      })
    );
    y += blockPct(size, lineCount(creative.body), 1.25) + 4;
  }

  if (creative.cta) {
    elements.push(
      baseText({
        background: creative.accentColor,
        borderRadius: 1.6,
        color: "#ffffff",
        fontFamily: fonts.body,
        fontSize: 10 * cs,
        fontWeight: 800,
        id: ROLE_IDS.cta,
        letterSpacing: 0.02,
        name: "CTA",
        paddingX: 4,
        paddingY: 2.4,
        text: creative.cta,
        textAlign: "center",
        textTransform: "uppercase",
        width: 84,
        x: 8,
        y,
      })
    );
  }

  // Contact band pinned to the bottom, sized up for the print format.
  const footerText = [creative.footnote, creative.footnote2]
    .filter(Boolean)
    .join("  ·  ");
  if (footerText) {
    elements.push(
      seedRectEl(
        ROLE_IDS.footerBar,
        "Footer bar",
        { height: 8, width: 100, x: 0, y: 92 },
        creative.backgroundColor
      ),
      baseText({
        color: creative.textColor,
        fontFamily: fonts.body,
        fontSize: 3.4,
        fontWeight: 700,
        id: ROLE_IDS.footnote,
        letterSpacing: 0.08,
        name: "footer",
        text: footerText,
        textAlign: "center",
        textTransform: "uppercase",
        width: 88,
        x: 6,
        y: 94.6,
      })
    );
  }

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
 * @param cutout - Die-cut spec when the platform is a door hanger; when present
 *   the door-hanger recipe is used regardless of the template's layout
 * @returns Elements in paint order (backgrounds first, copy on top)
 */
export const seedCanvasElements = (
  creative: CreativeState,
  cutout?: DoorHangerCutout
): CanvasElement[] => {
  const ctx: SeedContext = {
    bs: (creative.bodySize || 100) / 100,
    creative,
    cs: (creative.ctaSize || 100) / 100,
    fonts: getFontPair(creative.fontPresetId),
    hs: (creative.headlineSize || 100) / 100,
  };

  if (cutout) {
    return seedDoorHanger(ctx, cutout);
  }

  switch (creative.layout) {
    case "canva-hero-footer": {
      return seedHeroFooter(ctx);
    }
    case "storm-split": {
      return seedStormSplit(ctx);
    }
    case "canva-storm-overlay": {
      return seedStormOverlay(ctx);
    }
    case "canva-gradient-panel": {
      return seedGradientPanel(ctx);
    }
    default: {
      return seedClassic(ctx);
    }
  }
};

/**
 * Changes that intentionally replace the composition with a fresh template.
 * Format/platform changes are excluded because canvas geometry uses percentages
 * and should remain intact when the aspect ratio changes.
 */
export const buildCanvasReseedKey = (
  creative: Pick<
    CreativeState,
    "fontPresetId" | "layout" | "platformId" | "templateId"
  >,
  reseedSignal: number
): string =>
  `${creative.templateId}|${creative.layout}|${creative.fontPresetId}|${reseedSignal}`;

export interface CanvasCopyFields {
  body: string;
  cta: string;
  eyebrow: string;
  headline: string;
}

/**
 * Applies an explicitly selected copy variant to the stable text roles while
 * preserving every element's direct-manipulation geometry and styling.
 */
export const applyCopyToElements = (
  elements: CanvasElement[],
  copy: CanvasCopyFields
): CanvasElement[] => {
  const hasHeadlineAccent = elements.some(
    (element) => element.id === ROLE_IDS.headlineAccent
  );
  const headlineLines = copy.headline
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const splitHeadline = hasHeadlineAccent && headlineLines.length >= 2;
  const headline = splitHeadline
    ? headlineLines.slice(0, -1).join("\n")
    : copy.headline;
  const headlineAccent = splitHeadline ? (headlineLines.at(-1) ?? "") : "";
  const textByRole: Partial<Record<string, string>> = {
    [ROLE_IDS.body]: copy.body,
    [ROLE_IDS.cta]: copy.cta,
    [ROLE_IDS.eyebrow]: copy.eyebrow,
    [ROLE_IDS.headline]: headline,
    [ROLE_IDS.headlineAccent]: headlineAccent,
  };
  let changed = false;
  const next = elements.map((element) => {
    if (element.kind !== "text") {
      return element;
    }
    const text = textByRole[element.id];
    if (text === undefined || text === element.text) {
      return element;
    }
    changed = true;
    return { ...element, text };
  });
  return changed ? next : elements;
};

// Keep role-seeded image/logo elements in sync with the toolbar menus without
// disturbing geometry/styling/text users set by direct manipulation on the
// canvas. Text edits happen inline on the canvas only, so creative copy is
// intentionally NOT synced here (it would revert inline edits).
export const syncElementsFromCreative = (
  elements: CanvasElement[],
  creative: CreativeState
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
    if (
      el.kind === "logo" &&
      el.id === ROLE_IDS.logo &&
      el.variant !== creative.logoVariant
    ) {
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
        height: 100,
        id: ROLE_IDS.image,
        kind: "image",
        locked: false,
        name: "Photo",
        objectFit: "cover",
        opacity: 1,
        src: creative.imageUrl,
        width: 100,
        x: 0,
        y: 0,
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
        color: "#ffffff",
        height: null,
        id: ROLE_IDS.logo,
        kind: "logo",
        locked: false,
        name: "logo",
        opacity: 1,
        variant: creative.logoVariant,
        width: 22,
        x: 74,
        y: 4,
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

interface SnapResult {
  delta: number;
  guide: number | null;
}

/**
 * Given the moving element's candidate lines (start/center/end) and the static
 * target lines, find the smallest shift within the threshold that aligns one
 * candidate to one target.
 */
export const findSnapShift = (
  candidates: number[],
  targets: number[],
  threshold: number
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
  _canvasAspect: number
) => {
  const xTargets = [0, 50, 100];
  const yTargets = [0, 50, 100];

  for (const el of elements) {
    if (el.id === excludeId) {
      continue;
    }
    xTargets.push(el.x, el.x + el.width / 2, el.x + el.width);
    if (el.height === null) {
      yTargets.push(el.y);
    } else {
      yTargets.push(el.y, el.y + el.height / 2, el.y + el.height);
    }
  }

  return { xTargets, yTargets };
};
