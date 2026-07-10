/**
 * Shrink-to-fit for canvas text layers.
 *
 * Text sizes are authored in cqw (percent of the canvas WIDTH); geometry is
 * percent of width (x/width) and percent of height (y/height). A text layer with
 * a FIXED height (`height !== null`) can clip when its copy wraps to more lines
 * than the box holds, so we estimate the wrapped height and scale the font down
 * until it fits. Auto-height text (`height === null`) grows to contain its copy,
 * so this is a no-op there — the renderers must simply not clip it.
 *
 * Pure + deterministic so the on-screen canvas, the exported PNG/thumbnail, the
 * print PDF, and the Lob HTML front all shrink identically (layout fidelity).
 * `api/lib/desk-front-creative.ts` mirrors this math inline because serverless
 * code cannot import from `src/`; keep the two in sync.
 */

// Mean glyph advance as a fraction of the em across our sans + serif faces.
// Deliberately a touch generous so we over- rather than under-estimate width.
export const AVG_CHAR_WIDTH_EM = 0.55;
// cqw floor — mirrors the editor's MIN_FONT_SIZE so a fit never disappears.
export const MIN_FIT_FONT_SIZE = 0.8;
const MAX_FIT_ITERATIONS = 8;
const NEWLINE_RE = /\r?\n/;

export interface TextFitInput {
  /** Box height as percent of canvas HEIGHT, or null for auto height. */
  boxHeight: number | null;
  /** Box width as percent of canvas WIDTH (same unit as fontSize cqw). */
  boxWidth: number;
  /** Canvas aspect ratio (width / height) — relates height% to width-cqw. */
  canvasAspect: number;
  /** Authored font size in cqw. */
  fontSize: number;
  /** Extra tracking in em. */
  letterSpacing: number;
  /** Line-height multiple. */
  lineHeight: number;
  text: string;
}

/**
 * Estimate how many wrapped lines `text` needs at `fontSize` inside `boxWidth`,
 * honoring explicit newlines. Uses an average glyph advance, so it is an
 * approximation — intentionally slightly conservative (wide) to avoid clipping.
 */
export const estimateWrappedLineCount = (
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
    const lineWidth = chars * charWidthCqw;
    lines += Math.max(1, Math.ceil(lineWidth / boxWidth));
  }
  return Math.max(1, lines);
};

/**
 * Return a font size (cqw) at which `text` fits inside its box. When the box is
 * auto-height (`null`) or the text already fits, the original size is returned.
 * When it cannot fit even at {@link MIN_FIT_FONT_SIZE}, the floor is returned
 * (the caller must not clip — the text stays fully visible).
 */
export const fitTextFontSize = (input: TextFitInput): number => {
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
  // Available height expressed in cqw units (1 cqw = 1% of the canvas width).
  const availableCqw = boxHeight / canvasAspect;
  let size = fontSize;
  for (let iteration = 0; iteration < MAX_FIT_ITERATIONS; iteration += 1) {
    const lines = estimateWrappedLineCount(text, boxWidth, size, letterSpacing);
    const neededCqw = lines * size * lineHeight;
    if (neededCqw <= availableCqw || size <= MIN_FIT_FONT_SIZE) {
      break;
    }
    const next = size * Math.sqrt(availableCqw / neededCqw);
    size = Math.max(MIN_FIT_FONT_SIZE, next);
  }
  return size;
};
