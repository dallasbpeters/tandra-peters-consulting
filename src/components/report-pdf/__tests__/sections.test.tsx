import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  BrandProfile,
  DetailsTable,
  PhotoItem,
  Report,
} from "../../../lib/report-pdf/types";
import { EditorPane } from "../editor-pane";

const brand: BrandProfile = {
  address: "Waco, TX",
  colors: { accent: "#2563eb", primary: "#0f172a", text: "#111111" },
  email: "hello@birdcreek.com",
  footerText: "Birdcreek Roofing",
  logoUrl: null,
  phone: "254-555-0100",
  website: "birdcreek.com",
};

const photo = (id: string): PhotoItem => ({
  annotations: null,
  caption: "",
  id,
  order: 0,
  previewUrl: `blob:${id}`,
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: `${id}.jpg`,
  table: null,
  takenAt: null,
});

const renderPane = (report: Report) => {
  const handlers = {
    onAddFiles: vi.fn<(files: File[]) => void>(),
    onAddSection: vi.fn<() => void>(),
    onAnnotatePhoto: vi.fn<(id: string) => void>(),
    onCaptionChange: vi.fn<(id: string, caption: string) => void>(),
    onCoverImageChange: vi.fn<(url: string | null) => void>(),
    onFieldChange: vi.fn<(field: string, value: string) => void>(),
    onMovePhoto: vi.fn<(id: string, direction: -1 | 1) => void>(),
    onRemovePhoto: vi.fn<(id: string) => void>(),
    onRemoveSection: vi.fn<(id: string) => void>(),
    onRenameSection: vi.fn<(id: string, title: string) => void>(),
    onReorderPhotos:
      vi.fn<
        (sourceId: string, targetId: string, edge?: "after" | "before") => void
      >(),
    onSectionChange: vi.fn<(id: string, sectionId: string | null) => void>(),
    onTableChange: vi.fn<(id: string, table: DetailsTable | null) => void>(),
  };
  render(
    <EditorPane
      addError={null}
      brand={brand}
      busy={false}
      coverLibrary={{
        error: null,
        images: [],
        loading: false,
        refresh: vi.fn<() => void>(),
      }}
      idToken="test-id-token"
      report={report}
      {...handlers}
    />
  );
  return handlers;
};

const baseReport = (overrides: Partial<Report>): Report => ({
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
  title: "",
  jobNumber: "",
  ...overrides,
});

describe("Section management", () => {
  it("creates a section", () => {
    const handlers = renderPane(baseReport({}));
    fireEvent.click(screen.getByRole("button", { name: /add section/i }));
    expect(handlers.onAddSection).toHaveBeenCalledOnce();
  });

  it("renames an existing section", () => {
    const handlers = renderPane(
      baseReport({ sections: [{ id: "s1", order: 0, title: "" }] })
    );
    fireEvent.change(screen.getByLabelText("Section title"), {
      target: { value: "Front slope" },
    });
    expect(handlers.onRenameSection).toHaveBeenCalledWith("s1", "Front slope");
  });

  it("assigns a photo to a created section", () => {
    const handlers = renderPane(
      baseReport({
        photos: [photo("a")],
        sections: [{ id: "s1", order: 0, title: "Front slope" }],
      })
    );
    // The photo row exposes a Section select listing the section.
    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: "s1" },
    });
    expect(handlers.onSectionChange).toHaveBeenCalledWith("a", "s1");
  });
});
