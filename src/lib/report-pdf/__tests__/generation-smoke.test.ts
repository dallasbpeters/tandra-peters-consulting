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
  caption: `Finding ${order + 1}`,
  id,
  order,
  previewUrl: `blob:${id}`,
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: `${id}.jpg`,
  table: { columns: ["Area", "Note"], rows: [["Ridge", "Wear"]] },
});

/**
 * Backgrounding-safety note (SC-007): PDF generation runs fully on-device and
 * consumes only the in-memory processed-image Blobs referenced by the layout
 * model — it never re-reads the original `File` handles. iOS may evict those
 * `File` references when Safari is backgrounded, so intake downscales into
 * owned Blobs up front (see `image-pipeline.ts`) and generation reads from the
 * model exclusively. This keeps a 30-photo report generatable even if the tab
 * was backgrounded between intake and Generate.
 */
describe("30-photo generation smoke (SC-007)", () => {
  const photos = Array.from({ length: 30 }, (_, i) => photo(`p${i}`, i));
  const report: Report = {
    coverImageUrl: null,
    date: "2026-07-18",
    overallNote: "Full roof inspection with thirty documented findings.",
    photos,
    propertyAddress: "123 Main St",
    sections: [],
    title: "123 Main St",
  };

  it("paginates cover + note + 30 photos + contact without dropping any", () => {
    const pages = buildPages(buildLayoutModel(report, brand));

    const photoPages = pages.filter((page) => page.kind === "photo");
    expect(photoPages).toHaveLength(30);
    // cover + note + 30 photos + contact
    expect(pages).toHaveLength(33);
    expect(pages.at(0)?.kind).toBe("cover");
    expect(pages.at(-1)?.kind).toBe("contact");
  });

  it("preserves photo order across all 30 pages", () => {
    const pages = buildPages(buildLayoutModel(report, brand));
    const order = pages
      .filter((page) => page.kind === "photo")
      .map((page) => (page.kind === "photo" ? page.photo.imageUrl : ""));

    expect(order).toStrictEqual(photos.map((p) => p.previewUrl));
  });

  it("builds the 30-photo model well under the perf budget", () => {
    const start = performance.now();
    buildPages(buildLayoutModel(report, brand));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(250);
  });
});
