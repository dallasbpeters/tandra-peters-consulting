import { describe, expect, it } from "vitest";

import { buildPostcardBackHtml } from "./desk-direct-mail-connect.js";
import {
  buildStructuredFrontHtml,
  CARD_BLEED_IN,
  CARD_TRIM_IN,
  frontBleedBoxIn,
  PRINT_DPI,
  requiredCreativePx,
} from "./desk-front-creative.js";

/**
 * These tests LOCK the print resolution of the creative that gets submitted to
 * mail providers (Lob, Stannp, PostGrid), so a low-res creative can never
 * silently ship again (the original bug mailed a 75×114 px thumbnail that Lob
 * upscaled to a blurry 2775×1875).
 *
 * How the pixels are guaranteed WITHOUT running a real rasterization:
 * every provider rasterizes the supplied HTML at 300 DPI, so an artboard
 * authored at N inches deterministically becomes N × 300 pixels. We therefore
 * assert the AUTHORED inch dimensions (× 300 DPI) meet/exceed the required
 * minimums, plus that the only bitmap on the front (the hero photo) is pulled at
 * print width from its full-resolution source rather than a thumbnail.
 *
 * Required minimums = the full-bleed artboard (trim + 1/8" per side) at 300 DPI:
 *   6x9 → (9.25 × 6.25)in × 300 = 2775 × 1875 px  (the real Lob rejection value)
 *   4x6 → (6.25 × 4.25)in × 300 = 1875 × 1275 px
 */

const SIZES = ["4x6", "6x9"] as const;

// Landscape width×height minimums, derived from the trim + bleed math above.
const EXPECTED_MIN_PX: Record<
  (typeof SIZES)[number],
  { heightPx: number; widthPx: number }
> = {
  "4x6": { heightPx: 1275, widthPx: 1875 },
  "6x9": { heightPx: 1875, widthPx: 2775 },
};

const BODY_STYLE_RE = /<body[^>]*style="([^"]*)"/;
const WIDTH_IN_RE = /width:([\d.]+)in/;
const HEIGHT_IN_RE = /height:([\d.]+)in/;

/** Read the authored card-box dimensions (inches) from an HTML doc's <body>. */
const bodyBoxIn = (html: string): { heightIn: number; widthIn: number } => {
  const style = BODY_STYLE_RE.exec(html)?.[1] ?? "";
  return {
    heightIn: Number.parseFloat(HEIGHT_IN_RE.exec(style)?.[1] ?? "0"),
    widthIn: Number.parseFloat(WIDTH_IN_RE.exec(style)?.[1] ?? "0"),
  };
};

const HERO_URL = "https://cdn.sanity.io/images/7irm699i/production/hero.jpg";

const heroFrontConfig = (): string =>
  JSON.stringify({
    canvasElements: [
      {
        height: 100,
        id: "role-image",
        kind: "image",
        objectFit: "cover",
        opacity: 1,
        src: HERO_URL,
        width: 100,
        x: 0,
        y: 0,
      },
      {
        bgColor: "#ffffff",
        fgColor: "#000000",
        height: 20,
        id: "role-qr",
        kind: "qr",
        opacity: 1,
        value: "https://www.tandra.me/estimate",
        width: 20,
        x: 78,
        y: 76,
      },
    ],
    creative: { backgroundColor: "#092a1d", imageUrl: HERO_URL },
    version: 2,
  });

const backContent = (size: string) => ({
  body: "I'm checking older roofs in this area this week.",
  cta: "Scan for a roof check.",
  headline: "Roof age check",
  qrDataUri: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
  returnLines: ["Tandra Peters", "Birdcreek Roofing", "Austin, TX 78725"],
  size,
});

describe("required print resolution", () => {
  it("computes the 300 DPI full-bleed minimum for each size", () => {
    // Sanity-check the shared math the whole pipeline relies on: trim + bleed,
    // rasterized at 300 DPI, equals the provider-required pixel dimensions.
    expect(PRINT_DPI).toBe(300);
    expect(CARD_BLEED_IN).toBe(0.25);
    for (const size of SIZES) {
      const trim = CARD_TRIM_IN[size];
      const box = frontBleedBoxIn(size);
      expect(box.widthIn).toBeCloseTo(trim.widthIn + CARD_BLEED_IN, 5);
      expect(box.heightIn).toBeCloseTo(trim.heightIn + CARD_BLEED_IN, 5);
      expect(requiredCreativePx(size)).toStrictEqual(EXPECTED_MIN_PX[size]);
    }
  });
});

describe("provider front creative resolution", () => {
  it.each(SIZES)("authors the %s front at ≥ the 300 DPI minimum", (size) => {
    const { ok, html } = buildStructuredFrontHtml(
      heroFrontConfig(),
      frontBleedBoxIn(size)
    );
    expect(ok).toBeTruthy();
    const box = bodyBoxIn(html ?? "");
    const widthPx = box.widthIn * PRINT_DPI;
    const heightPx = box.heightIn * PRINT_DPI;
    expect(widthPx).toBeGreaterThanOrEqual(EXPECTED_MIN_PX[size].widthPx);
    expect(heightPx).toBeGreaterThanOrEqual(EXPECTED_MIN_PX[size].heightPx);
  });

  it("pulls the hero photo at print width, never a low-res thumbnail", () => {
    const front =
      buildStructuredFrontHtml(heroFrontConfig(), frontBleedBoxIn("6x9"))
        .html ?? "";
    // The hero is requested at 2775 px (6x9 print width) from its full-res
    // source — matching the required creative width.
    expect(front).toContain(`${HERO_URL}?w=2775`);
    expect(front).toContain("fit=max");
  });

  it("embeds NO low-res base64 raster on the front (locks the thumbnail bug)", () => {
    const front =
      buildStructuredFrontHtml(heroFrontConfig(), frontBleedBoxIn("6x9"))
        .html ?? "";
    // The original bug embedded a ~75×114 px base64 PNG. The structured front
    // must never inline a bitmap: the hero is a print-width URL, the logo is a
    // vector SVG URL, and the QR is a vector SVG data URI (infinite DPI).
    expect(front).not.toContain("data:image/png");
    expect(front).not.toContain("data:image/jpeg");
    expect(front).toContain("data:image/svg+xml"); // the QR, as vector
  });
});

describe("provider back creative resolution", () => {
  it.each(SIZES)("authors the %s back at ≥ the 300 DPI minimum", (size) => {
    // The back is HTML the provider rasterizes at 300 DPI, so its authored
    // trim+bleed inches × 300 must also clear the minimum — a trim-only back
    // (2700 px wide for 6x9) would fall short of the 2775 px requirement.
    const html = buildPostcardBackHtml(backContent(size));
    const box = bodyBoxIn(html);
    const widthPx = box.widthIn * PRINT_DPI;
    const heightPx = box.heightIn * PRINT_DPI;
    expect(widthPx).toBeGreaterThanOrEqual(EXPECTED_MIN_PX[size].widthPx);
    expect(heightPx).toBeGreaterThanOrEqual(EXPECTED_MIN_PX[size].heightPx);
  });

  it("fills the full-bleed artboard so no unpainted edge survives the cut", () => {
    const html = buildPostcardBackHtml(backContent("6x9"));
    const box = bodyBoxIn(html);
    // Authored at trim + bleed (9.25 × 6.25), not trim (9 × 6).
    expect(box.widthIn).toBeCloseTo(9.25, 5);
    expect(box.heightIn).toBeCloseTo(6.25, 5);
  });
});
