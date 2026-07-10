import { describe, expect, it } from "vitest";

import {
  estimateWrappedLineCount,
  fitTextFontSize,
  MIN_FIT_FONT_SIZE,
} from "./ad-text-fit";

// A 6x9 landscape postcard: width / height = 1.5.
const CARD_ASPECT = 9 / 6;

const fit = (
  overrides: Partial<Parameters<typeof fitTextFontSize>[0]> = {}
): number =>
  fitTextFontSize({
    boxHeight: 10,
    boxWidth: 40,
    canvasAspect: CARD_ASPECT,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 1,
    text: "ROOF DAMAGE?",
    ...overrides,
  });

describe(fitTextFontSize, () => {
  it("leaves auto-height text untouched (it grows to fit its copy)", () => {
    expect(fit({ boxHeight: null, text: "a".repeat(200) })).toBe(12);
  });

  it("keeps short copy at its authored size inside a generous box", () => {
    expect(fit({ boxHeight: 60, text: "HI" })).toBe(12);
  });

  it("shrinks copy that would overflow a fixed-height box", () => {
    const shrunk = fit({ boxHeight: 8, text: "ROOF DAMAGE FROM THE STORM?" });
    expect(shrunk).toBeLessThan(12);
    expect(shrunk).toBeGreaterThan(MIN_FIT_FONT_SIZE);
  });

  it("never shrinks below the floor, so text stays visible not clipped", () => {
    expect(fit({ boxHeight: 1, text: "a".repeat(120) })).toBe(
      MIN_FIT_FONT_SIZE
    );
  });
});

describe(estimateWrappedLineCount, () => {
  it("counts explicit newlines and wraps overlong lines", () => {
    expect(estimateWrappedLineCount("AB\nCD", 100, 1, 0)).toBe(2);
    expect(estimateWrappedLineCount("x".repeat(100), 10, 1, 0)).toBeGreaterThan(
      3
    );
  });
});
