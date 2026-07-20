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
  annotations: null,
  caption: "",
  id,
  order,
  previewUrl: `blob:${id}`,
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: `${id}.jpg`,
  table: null,
  takenAt: null,
});

const baseReport = (photos: PhotoItem[]): Report => ({
  contactAddress: "",
  contactEmail: "",
  contactIntro: "",
  contactPhone: "",
  contactWebsite: "",
  coverHeading: "Roof Inspection Report",
  coverImageUrl: null,
  date: "2026-07-18",
  overallNote: "",
  photos,
  propertyAddress: "123 Main St",
  sections: [],
  title: "123 Main St",
  jobNumber: "",
});

describe("buildLayoutModel / buildPages (core)", () => {
  it("packs four ungrouped photos onto a single page between cover and contact", () => {
    const model = buildLayoutModel(
      baseReport([photo("a", 0), photo("b", 1), photo("c", 2), photo("d", 3)]),
      brand
    );
    const pages = buildPages(model);

    expect(pages.map((page) => page.kind)).toStrictEqual([
      "cover",
      "photo",
      "contact",
    ]);
    const photoPage = pages.find((page) => page.kind === "photo");
    expect(photoPage?.kind === "photo" ? photoPage.photos.length : 0).toBe(4);
  });

  it("starts a fifth photo on a new page (four per page)", () => {
    const model = buildLayoutModel(
      baseReport([
        photo("a", 0),
        photo("b", 1),
        photo("c", 2),
        photo("d", 3),
        photo("e", 4),
      ]),
      brand
    );
    const pages = buildPages(model);

    expect(pages.map((page) => page.kind)).toStrictEqual([
      "cover",
      "photo",
      "photo",
      "contact",
    ]);
    const photoPages = pages.filter((page) => page.kind === "photo");
    expect(
      photoPages[0]?.kind === "photo" ? photoPages[0].photos.length : 0
    ).toBe(4);
    expect(
      photoPages[1]?.kind === "photo" ? photoPages[1].photos.length : 0
    ).toBe(1);
  });

  it("gives a photo with a details table its own full-width page", () => {
    const withTable = {
      ...photo("table", 1),
      table: { columns: ["Finding"], rows: [["Leak"]] },
    };
    const model = buildLayoutModel(
      baseReport([photo("a", 0), withTable, photo("b", 2)]),
      brand
    );
    const pages = buildPages(model);
    const photoPages = pages.filter((page) => page.kind === "photo");

    expect(photoPages).toHaveLength(3);
    expect(
      photoPages[1]?.kind === "photo" ? photoPages[1].photos.length : 0
    ).toBe(1);
    expect(
      photoPages[1]?.kind === "photo" ? photoPages[1].photos[0]?.table : null
    ).not.toBeNull();
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
    const cover = model.blocks.find((block) => block.kind === "cover");

    // Running header prefers the cover heading; property title stays on cover.
    expect(model.headerTitle).toBe("Roof Inspection Report");
    expect(cover).toMatchObject({ title: "123 Main St" });
    expect(model.footerText).toBe("Birdcreek Roofing");
    expect(contact).toMatchObject({
      email: "tandra@birdcreekroofing.com",
      phone: "512-968-3965",
      website: "www.birdcreekroofing.com",
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
    const imageUrls = pages
      .filter((page) => page.kind === "photo")
      .flatMap((page) =>
        page.kind === "photo" ? page.photos.map((p) => p.imageUrl) : []
      );

    expect(imageUrls).toStrictEqual(["blob:a", "blob:b"]);
  });
});
