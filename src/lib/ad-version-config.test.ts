import { describe, expect, it } from "vitest";

import type { CanvasElement } from "./ad-canvas-doc";
import { ROLE_IDS } from "./ad-canvas-doc";
import type { CreativeState } from "./ad-creative";
import {
  deserializeAdVersionConfig,
  parseAdVersionBackgroundColor,
  parseAdVersionCanvasElements,
  serializeAdVersionConfig,
} from "./ad-version-config";

const creative = {
  body: "Panel body",
  headline: "Panel headline",
  imageFile: null,
  imageUrl: "https://cdn.sanity.io/images/roof.jpg",
} as CreativeState;

const canvasElements = [
  {
    background: null,
    borderRadius: 0,
    color: "#ffffff",
    fontFamily: "sans-serif",
    fontSize: 8,
    fontStyle: "normal",
    fontWeight: 700,
    height: null,
    id: ROLE_IDS.headline,
    kind: "text",
    letterSpacing: 0,
    lineHeight: 1,
    locked: false,
    name: "Headline",
    opacity: 1,
    paddingX: 0,
    paddingY: 0,
    text: "Inline canvas headline",
    textAlign: "left",
    textTransform: "none",
    width: 60,
    x: 12,
    y: 24,
  },
] satisfies CanvasElement[];

describe("ad version config", () => {
  it("persists inline canvas text independently from panel copy", () => {
    const saved = serializeAdVersionConfig(creative, canvasElements);
    const loaded = deserializeAdVersionConfig(saved, creative);

    expect(loaded.creative.headline).toBe("Panel headline");
    expect(loaded.canvasElements?.[0]).toMatchObject({
      kind: "text",
      text: "Inline canvas headline",
    });
  });

  it("exposes saved layers and background for vector PDF rendering", () => {
    const saved = serializeAdVersionConfig(
      { ...creative, backgroundColor: "#123a34" },
      canvasElements
    );

    expect(parseAdVersionCanvasElements(saved)).toStrictEqual(canvasElements);
    expect(parseAdVersionBackgroundColor(saved)).toBe("#123a34");
  });

  it("loads legacy creative-only version configs", () => {
    const loaded = deserializeAdVersionConfig(
      JSON.stringify({ ...creative, headline: "Legacy headline" }),
      creative
    );

    expect(loaded.creative.headline).toBe("Legacy headline");
    expect(loaded.canvasElements).toBeNull();
  });
});
