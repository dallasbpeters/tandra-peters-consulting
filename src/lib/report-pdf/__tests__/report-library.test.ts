import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "../types";

const uploadMock =
  vi.fn<
    (pathname: string, body: Blob, options: unknown) => Promise<{ url: string }>
  >();

vi.mock(import("@vercel/blob/client"), () => ({
  upload: uploadMock as unknown as typeof import("@vercel/blob/client").upload,
}));

const { hydrateReport, serializeReport } = await import("../report-library");

const baseReport = (overrides: Partial<Report> = {}): Report => ({
  contactAddress: "",
  contactEmail: "",
  contactIntro: "",
  contactPhone: "",
  contactWebsite: "",
  coverHeading: "Roof Inspection Report",
  coverImageUrl: null,
  date: "2026-01-01",
  overallNote: "",
  photos: [],
  propertyAddress: "123 Main",
  sections: [],
  title: "Test report",
  jobNumber: "",
  ...overrides,
});

describe("serializeReport", () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({
      url: "https://blob.vercel-storage.com/uploaded.jpg",
    });
  });

  it("uploads new photos but reuses already-hosted ones", async () => {
    const report = baseReport({
      photos: [
        {
          annotations: null,
          caption: "new",
          id: "p1",
          order: 0,
          previewUrl: "blob:local-object-url",
          processedImage: new Blob(["x"], { type: "image/jpeg" }),
          sectionId: null,
          sourceName: "a.jpg",
          table: null,
          takenAt: null,
        },
        {
          annotations: null,
          caption: "kept",
          id: "p2",
          order: 1,
          previewUrl: "https://blob.vercel-storage.com/existing.jpg",
          processedImage: new Blob(["y"], { type: "image/jpeg" }),
          sectionId: null,
          sourceName: "b.jpg",
          table: null,
          takenAt: null,
        },
      ],
    });

    const snapshot = await serializeReport(report, "id-token");

    expect(uploadMock).toHaveBeenCalledOnce();
    expect(snapshot.photos[0].previewUrl).toBe(
      "https://blob.vercel-storage.com/uploaded.jpg"
    );
    expect(snapshot.photos[1].previewUrl).toBe(
      "https://blob.vercel-storage.com/existing.jpg"
    );
  });
});

describe("hydrateReport", () => {
  it("refetches hosted photos into Blobs while preserving fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(url: string) => Promise<Response>>(() =>
        Promise.resolve({
          blob: () =>
            Promise.resolve(new Blob(["img"], { type: "image/jpeg" })),
        } as unknown as Response)
      )
    );

    const report = await hydrateReport({
      coverImageUrl: null,
      date: "2026-01-01",
      overallNote: "note",
      photos: [
        {
          annotations: null,
          caption: "cap",
          id: "p1",
          order: 0,
          previewUrl: "https://blob.vercel-storage.com/existing.jpg",
          sectionId: "s1",
          sourceName: "a.jpg",
          table: null,
          takenAt: null,
        },
      ],
      propertyAddress: "123 Main",
      sections: [{ id: "s1", order: 0, title: "Front" }],
      title: "Recalled",
      jobNumber: "",
    });

    expect(report.title).toBe("Recalled");
    expect(report.photos[0].previewUrl).toBe(
      "https://blob.vercel-storage.com/existing.jpg"
    );
    expect(report.photos[0].processedImage).toBeInstanceOf(Blob);
    vi.unstubAllGlobals();
  });
});
