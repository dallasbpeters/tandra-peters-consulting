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
    // "Hanken Grotesk" (linked from Google Fonts in the head).
    expect(front).toContain('font-family:"Hanken Grotesk",');
    expect(front).not.toContain("Hanken Grotesk Variable");
    expect(front).toContain("fonts.googleapis.com");
  });
});
