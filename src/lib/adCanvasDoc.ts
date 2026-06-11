import type { CreativeState, LogoVariant } from "./adCreative";
import type { FontPresetId } from "./adCreativeTemplates";

// ─── Element model ────────────────────────────────────────────────────────────
// Geometry is stored as percentages of the canvas: x/width relative to canvas
// width, y/height relative to canvas height. Text font sizes are in cqw so they
// scale with the canvas at any export size.

export type CanvasElementKind = "text" | "image" | "logo" | "rect";

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

export type CanvasElement =
  | TextCanvasElement
  | ImageCanvasElement
  | LogoCanvasElement
  | RectCanvasElement;

export type CanvasGuide = { axis: "x" | "y"; position: number };

let idCounter = 0;
export const createElementId = () => `cel-${Date.now().toString(36)}-${idCounter++}`;

// Stable ids for elements seeded from creative copy fields so panel edits can
// keep flowing into the canvas.
export const ROLE_IDS = {
  image: "role-image",
  logo: "role-logo",
  eyebrow: "role-eyebrow",
  headline: "role-headline",
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

export const seedCanvasElements = (creative: CreativeState): CanvasElement[] => {
  const fonts = getFontPair(creative.fontPresetId);
  const elements: CanvasElement[] = [];

  if (creative.imageUrl) {
    elements.push({
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
    });
  }

  if (creative.showLogo) {
    elements.push({
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
    });
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
        fontSize: 10.5,
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
        fontSize: 7,
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
        fontSize: 3.6,
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

  if (creative.footnote) {
    elements.push({
      id: ROLE_IDS.footerBar,
      kind: "rect",
      name: "Footer bar",
      x: 0,
      y: 90,
      width: 100,
      height: 10,
      opacity: 1,
      locked: false,
      fill: creative.backgroundColor,
      borderRadius: 0,
    });
    elements.push(
      baseText({
        id: ROLE_IDS.footnote,
        name: "Footer",
        text: creative.footnote,
        x: 4,
        y: 93.2,
        width: 92,
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: 2.3,
        letterSpacing: 0.1,
        textTransform: "uppercase",
        color: creative.textColor,
      }),
    );
  }

  return elements;
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
