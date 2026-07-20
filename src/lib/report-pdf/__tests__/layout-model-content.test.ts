import { describe, expect, it } from "vitest";

import { buildLayoutModel, buildPages } from "../layout-model";
import type {
  BrandProfile,
  DetailsTable,
  PhotoItem,
  Report,
  SectionHeading,
} from "../types";

const brand: BrandProfile = {
  address: "100 Roof Ln",
  colors: { accent: "#3f7d5f", primary: "#0f3d2a", text: "#1b1b1b" },
  email: "hello@birdcreek.com",
  footerText: "Birdcreek Roofing",
  logoUrl: null,
  phone: "254-555-0100",
  website: "birdcreek.com",
};

const photo = (
  id: string,
  order: number,
  overrides: Partial<PhotoItem> = {}
): PhotoItem => ({
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
  ...overrides,
});

const section = (id: string, order: number, title: string): SectionHeading => ({
  id,
  order,
  title,
});

const report = (overrides: Partial<Report>): Report => ({
  contactAddress: "",
  contactEmail: "",
  contactIntro: "",
  contactPhone: "",
  contactWebsite: "",
  coverHeading: "Roof Inspection Report",
  coverImageUrl: null,
  date: "2026-07-18",
  overallNote: "",
  photos: [],
  propertyAddress: "",
  sections: [],
  title: "Report",
  jobNumber: "",
  ...overrides,
});

describe("buildLayoutModel (content)", () => {
  it("trims captions onto the photo block", () => {
    const model = buildLayoutModel(
      report({ photos: [photo("a", 0, { caption: "  Cracked flashing  " })] }),
      brand
    );
    const block = model.blocks.find((item) => item.kind === "photo");
    expect(block).toMatchObject({ caption: "Cracked flashing" });
  });

  it("carries the EXIF taken-at date onto the photo block", () => {
    const model = buildLayoutModel(
      report({ photos: [photo("a", 0, { takenAt: "2026-05-03" })] }),
      brand
    );
    const block = model.blocks.find((item) => item.kind === "photo");
    expect(block).toMatchObject({ takenAt: "2026-05-03" });
  });

  it("keeps a meaningful table but omits a blank one", () => {
    const meaningful: DetailsTable = {
      columns: ["Finding", "Detail"],
      rows: [["Leak", "Near vent"]],
    };
    const blank: DetailsTable = {
      columns: ["", ""],
      rows: [["", ""]],
    };
    const model = buildLayoutModel(
      report({
        photos: [
          photo("a", 0, { table: meaningful }),
          photo("b", 1, { table: blank }),
        ],
      }),
      brand
    );
    const photos = model.blocks.filter((item) => item.kind === "photo");
    expect(photos[0]).toMatchObject({
      table: { columns: ["Finding", "Detail"] },
    });
    expect(photos[1]).toMatchObject({ table: null });
  });

  it("groups photos under a section band on the first page only", () => {
    // Five photos in one section spill onto a second page (four-up); the band
    // shows on the first page only.
    const model = buildLayoutModel(
      report({
        photos: [
          photo("a", 0, { sectionId: "s1" }),
          photo("b", 1, { sectionId: "s1" }),
          photo("c", 2, { sectionId: "s1" }),
          photo("d", 3, { sectionId: "s1" }),
          photo("e", 4, { sectionId: "s1" }),
        ],
        sections: [section("s1", 0, "Front slope")],
      }),
      brand
    );
    const pages = buildPages(model);
    const photoPages = pages.filter((page) => page.kind === "photo");
    expect(photoPages).toHaveLength(2);
    expect(
      photoPages[0].kind === "photo" ? photoPages[0].sectionTitle : null
    ).toBe("Front slope");
    expect(
      photoPages[0].kind === "photo" ? photoPages[0].photos.length : 0
    ).toBe(4);
    expect(
      photoPages[1].kind === "photo" ? photoPages[1].sectionTitle : null
    ).toBeNull();
  });

  it("prunes empty sections and lists ungrouped photos after grouped ones", () => {
    const model = buildLayoutModel(
      report({
        photos: [photo("grouped", 0, { sectionId: "s1" }), photo("loose", 1)],
        sections: [
          section("s1", 0, "Front slope"),
          section("empty", 1, "Unused"),
        ],
      }),
      brand
    );
    const photoBlocks = model.blocks.filter((item) => item.kind === "photo");
    expect(photoBlocks.map((item) => item.imageUrl)).toStrictEqual([
      "blob:grouped",
      "blob:loose",
    ]);
    // The empty section never contributes a band.
    const bands = photoBlocks
      .map((item) => (item.kind === "photo" ? item.sectionTitle : null))
      .filter(Boolean);
    expect(bands).toStrictEqual(["Front slope"]);
  });
});
