import { describe, expect, it } from "vitest";

import { buildLayoutModel, buildPages } from "../layout-model";
import type { BrandProfile, PhotoItem, Report } from "../types";

const brand: BrandProfile = {
  address: "100 Roof Ln, Waco TX",
  colors: { accent: "#3f7d5f", primary: "#0f3d2a", text: "#1b1b1b" },
  email: "hello@birdcreek.com",
  footerText: "Birdcreek Roofing",
  logoUrl: "https://cdn.example.com/logo.png",
  phone: "254-555-0100",
  website: "birdcreek.com",
};

const photo = (id: string, order: number): PhotoItem => ({
  caption: "",
  id,
  order,
  previewUrl: `blob:${id}`,
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: `${id}.jpg`,
  table: null,
});

const baseReport = (photos: PhotoItem[]): Report => ({
  coverImageUrl: null,
  date: "2026-07-18",
  overallNote: "",
  photos,
  propertyAddress: "123 Main St",
  sections: [],
  title: "123 Main St",
});

describe("buildLayoutModel / buildPages (core)", () => {
  it("produces cover → photos → contact with no note when the note is blank", () => {
    const model = buildLayoutModel(
      baseReport([photo("a", 0), photo("b", 1)]),
      brand
    );
    const pages = buildPages(model);

    expect(pages.map((page) => page.kind)).toStrictEqual([
      "cover",
      "photo",
      "photo",
      "contact",
    ]);
  });

  it("inserts a note page after the photos when an overall note exists", () => {
    const report = { ...baseReport([photo("a", 0)]), overallNote: "All good" };
    const pages = buildPages(buildLayoutModel(report, brand));

    expect(pages.map((page) => page.kind)).toStrictEqual([
      "cover",
      "photo",
      "note",
      "contact",
    ]);
  });

  it("carries brand contact + header details into the model", () => {
    const model = buildLayoutModel(baseReport([photo("a", 0)]), brand);
    const contact = model.blocks.find((block) => block.kind === "contact");

    expect(model.headerTitle).toBe("123 Main St");
    expect(model.footerText).toBe("Birdcreek Roofing");
    expect(contact).toMatchObject({
      email: "hello@birdcreek.com",
      phone: "254-555-0100",
    });
  });

  it("defaults the report title on the cover when none is provided", () => {
    const report = { ...baseReport([photo("a", 0)]), title: "" };
    const model = buildLayoutModel(report, brand);
    const cover = model.blocks.find((block) => block.kind === "cover");

    expect(model.headerTitle).toBe("Roof Inspection Report");
    expect(cover).toMatchObject({ reportTitle: "Roof Inspection Report" });
  });

  it("respects photo order when paginating", () => {
    const model = buildLayoutModel(
      baseReport([photo("b", 1), photo("a", 0)]),
      brand
    );
    const pages = buildPages(model);
    const captions = pages
      .filter((page) => page.kind === "photo")
      .map((page) => (page.kind === "photo" ? page.photo.imageUrl : ""));

    expect(captions).toStrictEqual(["blob:a", "blob:b"]);
  });
});
