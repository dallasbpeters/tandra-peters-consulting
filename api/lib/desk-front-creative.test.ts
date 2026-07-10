import { describe, expect, it } from "vitest";

import { buildStructuredFrontHtml } from "./desk-front-creative.js";

// A saved Ad Builder config is a STRUCTURED doc: `canvasElements` (the layer
// model) + `creative` state (incl. the ORIGINAL hero-photo URL). The renderer
// turns it into print-resolution HTML so Lob rasterizes crisp vector text/logo
// and a full-res photo instead of upscaling the ~320px thumbnail.

const HERO_URL = "https://cdn.sanity.io/images/7irm699i/production/hero.jpg";

const heroFooterConfig = (overrides: { imageUrl?: string } = {}): string =>
  JSON.stringify({
    canvasElements: [
      {
        height: 100,
        id: "role-image",
        kind: "image",
        objectFit: "cover",
        opacity: 1,
        src: overrides.imageUrl ?? HERO_URL,
        width: 100,
        x: 0,
        y: 0,
      },
      {
        height: null,
        id: "role-logo",
        kind: "logo",
        opacity: 1,
        variant: "horizontal-white",
        width: 30,
        x: 64,
        y: 5,
      },
      {
        color: "#ffffff",
        fontFamily: '"IBM Plex Serif", serif',
        fontSize: 12.5,
        fontStyle: "normal",
        fontWeight: 400,
        height: null,
        id: "role-headline",
        kind: "text",
        letterSpacing: 0,
        lineHeight: 0.98,
        opacity: 1,
        text: "ROOF DAMAGE?",
        textAlign: "left",
        textTransform: "uppercase",
        width: 70,
        x: 7,
        y: 13,
      },
      {
        color: "#ffffff",
        fontFamily: '"Hanken Grotesk Variable", sans-serif',
        fontSize: 6,
        fontStyle: "normal",
        fontWeight: 800,
        height: null,
        id: "role-cta",
        kind: "text",
        letterSpacing: 0.02,
        lineHeight: 1.1,
        opacity: 1,
        text: "512-965-3985",
        textAlign: "left",
        textTransform: "none",
        width: 60,
        x: 7,
        y: 55,
      },
    ],
    creative: {
      backgroundColor: "#092a1d",
      imageUrl: overrides.imageUrl ?? HERO_URL,
    },
    version: 2,
  });

const LOB_6X9 = { heightIn: 6.25, widthIn: 9.25 };

// One text-only layer so the HTML has exactly one `font-size` to inspect.
const singleTextConfig = (opts: {
  height: number | null;
  text: string;
}): string =>
  JSON.stringify({
    canvasElements: [
      {
        color: "#ffffff",
        fontFamily: '"Hanken Grotesk Variable", sans-serif',
        fontSize: 12,
        fontStyle: "normal",
        fontWeight: 700,
        height: opts.height,
        id: "role-headline",
        kind: "text",
        letterSpacing: 0,
        lineHeight: 1,
        opacity: 1,
        text: opts.text,
        textAlign: "left",
        textTransform: "none",
        width: 40,
        x: 5,
        y: 5,
      },
    ],
    creative: { backgroundColor: "#092a1d" },
    version: 2,
  });

const FONT_SIZE_IN_RE = /font-size:([\d.]+)in/;
const fontSizeIn = (html: string): number =>
  Number.parseFloat(FONT_SIZE_IN_RE.exec(html)?.[1] ?? "0");

// Extract the `style="…"` attribute of the div containing `needle`, decoding the
// HTML entities back to the CSS the browser's parser sees. Font sizes/weights
// live AFTER `font-family` in the declaration, so an unescaped quote in the
// family value would truncate the attribute and drop them — this asserts the
// full, parsed style survives.
const styleOfDivWith = (html: string, needle: string): string => {
  const marker = `>${needle}`;
  const end = html.indexOf(marker);
  if (end === -1) {
    return "";
  }
  const open = html.lastIndexOf('<div style="', end);
  const styleStart = open + '<div style="'.length;
  const styleEnd = html.indexOf('"', styleStart);
  const raw = html.slice(styleStart, styleEnd);
  return raw
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
};

describe(buildStructuredFrontHtml, () => {
  it("returns ok:false for missing/old configs so the caller can fall back", () => {
    expect(buildStructuredFrontHtml(undefined, LOB_6X9).ok).toBeFalsy();
    expect(buildStructuredFrontHtml("", LOB_6X9).ok).toBeFalsy();
    expect(buildStructuredFrontHtml("not json", LOB_6X9).ok).toBeFalsy();
    // Legacy version-1 config: creative only, no structured layers.
    expect(
      buildStructuredFrontHtml(
        JSON.stringify({ headline: "Hi", layout: "canva-hero-footer" }),
        LOB_6X9
      ).ok
    ).toBeFalsy();
  });

  it("renders the headline and phone as real (vector) text, not a raster", () => {
    const { ok, html } = buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9);
    expect(ok).toBeTruthy();
    const front = html ?? "";
    expect(front.startsWith("<!doctype html>")).toBeTruthy();
    expect(front).toContain("ROOF DAMAGE?");
    expect(front).toContain("512-965-3985");
    // Text sizes are physical inches (cqw → in), never fixed px of a thumbnail.
    expect(front).toMatch(/font-size:[\d.]+in/);
  });

  it("pulls the hero photo from its full-resolution source at print width", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    // The ORIGINAL Sanity asset, requested at print width — NOT a 320px thumb.
    expect(front).toContain(HERO_URL);
    expect(front).toContain("w=2775");
    expect(front).toContain("fit=max");
  });

  it("adds a print width hint to Unsplash hero photos too", () => {
    const unsplash = "https://images.unsplash.com/photo-123?ixid=abc&fm=jpg";
    const front =
      buildStructuredFrontHtml(
        heroFooterConfig({ imageUrl: unsplash }),
        LOB_6X9
      ).html ?? "";
    expect(front).toContain("images.unsplash.com/photo-123");
    expect(front).toContain("w=2775");
  });

  it("renders the logo from its vector SVG source (sharp at any DPI)", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    expect(front).toContain("/BC_Horizontal_White.svg");
    // SVG referenced by <img> keeps its aspect ratio (auto height).
    expect(front).toContain("height:auto");
  });

  it("sizes the card box to the requested print dimensions", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    // 6x9 full-bleed → 9.25in × 6.25in (2775 × 1875 px at 300 DPI).
    expect(front).toContain("width:9.25in");
    expect(front).toContain("height:6.25in");
    // Background paints the bleed margin on-brand.
    expect(front).toContain("background:#092a1d");
  });

  it("wraps text and never clips it (overflow visible, break-word)", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    // Text layers wrap and grow instead of being cut off by an overflow clip.
    expect(front).toContain("overflow:visible");
    expect(front).toContain("white-space:pre-wrap");
    expect(front).toContain("overflow-wrap:break-word");
  });

  it("shrinks a long headline to fit a fixed-height box, not clip it", () => {
    const longText = "ROOF DAMAGE FROM THE LAST BIG TEXAS HAIL STORM?";
    const autoFront =
      buildStructuredFrontHtml(
        singleTextConfig({ height: null, text: longText }),
        LOB_6X9
      ).html ?? "";
    const boxedFront =
      buildStructuredFrontHtml(
        singleTextConfig({ height: 8, text: longText }),
        LOB_6X9
      ).html ?? "";
    // Auto-height keeps the authored 12cqw (12% of 9.25in ≈ 1.11in); the short
    // fixed-height box shrinks the font so the wrapped copy fits inside it.
    expect(fontSizeIn(autoFront)).toBeCloseTo(1.11, 2);
    expect(fontSizeIn(boxedFront)).toBeLessThan(fontSizeIn(autoFront));
  });

  it("normalizes fontsource variable family names to their Google Fonts names", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    // The stored family is "Hanken Grotesk Variable"; the loadable name is
    // "Hanken Grotesk" (linked from Google Fonts in the head). Its quotes are
    // HTML-escaped so they don't close the style attribute, but they decode back
    // to the real CSS the browser applies.
    expect(styleOfDivWith(front, "512-965-3985")).toContain(
      'font-family:"Hanken Grotesk",'
    );
    expect(front).not.toContain("Hanken Grotesk Variable");
    expect(front).toContain("fonts.googleapis.com");
  });

  it("escapes font-family quotes so the whole text style survives (not truncated)", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    // A raw `"` in the family value would close style="…" early and drop every
    // declaration after font-family — the tiny/unstyled-front regression.
    expect(front).not.toContain('font-family:"Hanken Grotesk", sans-serif;');
    expect(front).toContain("&quot;Hanken Grotesk&quot;");
    // The parsed style keeps the display-critical declarations that come after
    // font-family: real size, weight, and the uppercase transform.
    const headlineStyle = styleOfDivWith(front, "ROOF DAMAGE?");
    expect(headlineStyle).toMatch(/font-size:[\d.]+in/);
    expect(headlineStyle).toContain("font-weight:400");
    expect(headlineStyle).toContain("text-transform:uppercase");
  });

  it("renders a display headline much larger than the footnote text", () => {
    const front =
      buildStructuredFrontHtml(heroFooterConfig(), LOB_6X9).html ?? "";
    const headlineIn = fontSizeIn(styleOfDivWith(front, "ROOF DAMAGE?"));
    const phoneIn = fontSizeIn(styleOfDivWith(front, "512-965-3985"));
    // 12.5cqw headline on a 9.25in card ≈ 1.16in — a genuinely large display
    // size, and clearly bigger than the 6cqw phone line (never collapsed to a
    // few pt by a bad conversion).
    expect(headlineIn).toBeCloseTo(1.16, 1);
    expect(headlineIn).toBeGreaterThan(phoneIn * 1.5);
  });
});
