import { describe, expect, it } from "vitest";

import {
  applyCopyToElements,
  ROLE_IDS,
  type TextCanvasElement,
} from "./ad-canvas-doc";

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

    expect(result.map((element) => element.text)).toEqual([
      copy.headline,
      copy.body,
      copy.cta,
    ]);
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

    expect(result.map((element) => element.text)).toEqual([copy.headline, ""]);
  });
});
