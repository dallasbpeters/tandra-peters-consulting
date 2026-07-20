/**
 * Layout tokens shared by the HTML preview and the `@react-pdf/renderer`
 * export so both render identically (spec FR-018 / SC-011 parity).
 *
 * Values are expressed in PDF points (1pt = 1/72"). `@react-pdf/renderer`
 * cannot parse the OKLCH values in `src/theme.ts`, so brand colors are the
 * hex equivalents of the site's everglade/accent palette. Sanity may override
 * `primary`/`accent`/`text` per `contracts/sanity-report-branding.md`.
 */

export const REPORT_PAGE = {
  /** US Letter portrait. */
  height: 792,
  margin: 48,
  width: 612,
} as const;

export const REPORT_FONTS = {
  body: "Hanken Grotesk",
  heading: "Hanken Grotesk",
} as const;

/** Font sizes in points. */
export const REPORT_TYPE = {
  body: 11,
  caption: 10,
  coverTitle: 36,
  eyebrow: 11,
  heading: 22,
  sectionTitle: 18,
  small: 8,
  subtitle: 13,
} as const;

/** Vertical/horizontal rhythm in points. */
export const REPORT_SPACE = {
  lg: 20,
  md: 12,
  sm: 8,
  xl: 32,
  xs: 4,
  xxl: 48,
} as const;

/**
 * Cover wordmark sizing — single source of truth for PDF + HTML preview.
 *
 * Heights are fractions of page width so both renderers stay in lockstep:
 * - PDF: `REPORT_PAGE.width * heightRatio` → points
 * - Preview: `heightRatio * 100` → cqw (set as `--report-mark-height`)
 *
 * Change `heightRatio` here only; do not hardcode cqw/pt in CSS or the PDF.
 * 0.1 → 61.2pt / 10cqw.
 */
export const REPORT_COVER_MARK = {
  /** Gap below the mark (`REPORT_SPACE.sm` as a page-width fraction). */
  gapRatio: REPORT_SPACE.sm / REPORT_PAGE.width,
  heightRatio: 0.1,
} as const;

/**
 * Body photo sizing — single source of truth for PDF + HTML preview.
 * Non-table photos pack in a 2×2 grid; a photo with a details table takes
 * the full content width on its own page.
 */
export const REPORT_PHOTO = {
  /** Columns in the photo grid. */
  columns: 2,
  /** Max non-table photos per page (2×2). */
  perPage: 4,
  /** Grid-cell image height in points / page-width fraction. */
  height: 175,
  heightRatio: 175 / REPORT_PAGE.width,
  /** Full-width solo image height when the photo has a details table. */
  soloHeight: 360,
  soloHeightRatio: 360 / REPORT_PAGE.width,
} as const;

/** Brand defaults (hex — mirror of the everglade/accent OKLCH scale). */
export const REPORT_COLORS = {
  accent: "#3f7d5f",
  accentLight: "#b8e87a",
  bg: "#ffffff",
  bgSubtle: "#f5f6f2",
  border: "#dcded9",
  /** Near-black green used for the full-bleed cover. */
  coverBg: "#0b1c14",
  muted: "#bfc5c0",
  /** White + muted-light for text set on the dark cover/contact pages. */
  onDark: "#ffffff",
  onDarkMuted: "#a9bcb2",
  /** Hairline rule used on the dark contact page (translucent white). */
  onDarkRule: "rgba(255, 255, 255, 0.35)",
  primary: "#0f3d2a",
  text: "#1b1b1b",
} as const;

/**
 * Decorative bar grid on the cover. Modeled as a fixed 10-column grid so the
 * HTML preview (CSS grid `span`) and the PDF (proportional `flexGrow`) render
 * an identical layout (spec FR-018 parity).
 *
 * Each row leads with one "spanning" bar whose width grows by one column per
 * row — 1 column up to the full 10 columns at row 11, then counting back down
 * — forming a symmetric diamond. The remaining columns are filled with
 * single-column bars. The spanning bar is 50% taller than the single bars.
 */
export const DECOR_TOTAL_COLUMNS = 10;

const DECOR_ROW_COUNT = 22;

export interface DecorBar {
  id: string;
  /** Grid columns this bar occupies (out of `DECOR_TOTAL_COLUMNS`). */
  span: number;
  /** The leading spanning bar is rendered 50% taller than single bars. */
  tall: boolean;
}

export interface DecorRow {
  id: string;
  bars: DecorBar[];
}

const buildDecorRows = (): DecorRow[] => {
  const rows: DecorRow[] = [];
  for (let r = 0; r < DECOR_ROW_COUNT; r += 1) {
    const displayRow = r + 1;
    // Diamond: ramp up rows 1→11 (span 0→10), mirror back down rows 12→22.
    const span = Math.min(displayRow - 1, DECOR_ROW_COUNT - displayRow);
    const bars: DecorBar[] = [];
    let index = 0;
    if (span > 0) {
      bars.push({ id: `d${r}-${index}`, span, tall: true });
      index += 1;
    }
    for (let column = span; column < DECOR_TOTAL_COLUMNS; column += 1) {
      bars.push({ id: `d${r}-${index}`, span: 1, tall: false });
      index += 1;
    }
    rows.push({ bars, id: `decor-row-${r}` });
  }
  return rows;
};

export const COVER_DECOR_ROWS: DecorRow[] = buildDecorRows();

/**
 * On-screen preview renders page geometry in CSS pixels. Rendering points at
 * 1.333px/pt makes an on-screen page match the exported PDF at ~96dpi.
 */
export const PREVIEW_PX_PER_PT = 4 / 3;
