import { describe, expect, it } from "vitest";

import {
  applyCopyToElements,
  buildCanvasReseedKey,
  ROLE_IDS,
  type TextCanvasElement,
} from "./ad-canvas-doc";

describe("buildCanvasReseedKey", () => {
  const creative = {
    fontPresetId: "brand-serif" as const,
    layout: "photo-fill" as const,
    platformId: "instagram-square",
    templateId: "roof-inspection",
  };

  it("preserves the composition when only the format changes", () => {
    const originalKey = buildCanvasReseedKey(creative, 0);
    const nextFormatKey = buildCanvasReseedKey(
      { ...creative, platformId: "facebook-landscape" },
      0
    );

    expect(nextFormatKey).toBe(originalKey);
  });

  it("rebuilds the composition for a template or explicit reseed", () => {
    expect(
      buildCanvasReseedKey({ ...creative, templateId: "storm-damage" }, 0)
    ).not.toBe(buildCanvasReseedKey(creative, 0));
    expect(buildCanvasReseedKey(creative, 1)).not.toBe(
      buildCanvasReseedKey(creative, 0)
    );
  });
});

const textElement = (id: string, text: string): TextCanvasElement => ({
  background: null,
  borderRadius: 0,
  color: "#ffffff",
  fontFamily: "sans-serif",
  fontSize: 8,
  fontStyle: "normal",
  fontWeight: 700,
  height: null,
  id,
  kind: "text",
  letterSpacing: 0,
  lineHeight: 1,
  locked: false,
  name: id,
  opacity: 1,
  paddingX: 0,
  paddingY: 0,
  text,
  textAlign: "left",
  textTransform: "none",
  width: 60,
  x: 12,
  y: 24,
});

const copy = {
  body: "I will explain what I find.",
  cta: "Book an inspection",
  eyebrow: "After the hail",
  headline: "See What the Storm Left Behind",
};

describe("applyCopyToElements", () => {
  it("updates stable copy roles without changing element geometry", () => {
    const original = [
      textElement(ROLE_IDS.headline, "Old headline"),
      textElement(ROLE_IDS.body, "Old body"),
      textElement(ROLE_IDS.cta, "Old CTA"),
    ];

    const result = applyCopyToElements(original, copy);

    expect(
      result.map((element) => (element.kind === "text" ? element.text : ""))
    ).toEqual([copy.headline, copy.body, copy.cta]);
    expect(result[0]).toMatchObject({ width: 60, x: 12, y: 24 });
  });

  it("clears a stale accent line when generated copy has one line", () => {
    const result = applyCopyToElements(
      [
        textElement(ROLE_IDS.headline, "Old lead"),
        textElement(ROLE_IDS.headlineAccent, "Old accent"),
      ],
      copy
    );

    expect(
      result.map((element) => (element.kind === "text" ? element.text : ""))
    ).toEqual([copy.headline, ""]);
  });
});
