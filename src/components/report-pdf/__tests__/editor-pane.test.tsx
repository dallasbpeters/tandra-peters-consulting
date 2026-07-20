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

const makeReport = (photos: PhotoItem[]): Report => ({
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
  propertyAddress: "",
  sections: [],
  title: "",
  jobNumber: "",
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

describe(EditorPane, () => {
  it("shows an empty hint and no photo list before any photos are added", () => {
    renderPane(makeReport([]));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Add photos from your camera roll/i)
    ).toBeInTheDocument();
  });

  it("passes selected files to onAddFiles", () => {
    const handlers = renderPane(makeReport([]));
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(handlers.onAddFiles).toHaveBeenCalledOnce();
    expect(handlers.onAddFiles.mock.calls[0][0][0]).toBe(file);
  });

  it("disables reorder at the boundaries and moves photos otherwise", () => {
    const handlers = renderPane(makeReport([photo("a", 0), photo("b", 1)]));

    expect(screen.getByLabelText("Move photo 1 up")).toBeDisabled();
    expect(screen.getByLabelText("Move photo 2 down")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Move photo 1 down"));
    expect(handlers.onMovePhoto).toHaveBeenCalledWith("a", 1);
  });

  it("removes a photo when its remove button is clicked", () => {
    const handlers = renderPane(makeReport([photo("a", 0)]));
    fireEvent.click(screen.getByLabelText("Remove photo 1"));
    expect(handlers.onRemovePhoto).toHaveBeenCalledWith("a");
  });

  it("edits report fields", () => {
    const handlers = renderPane(makeReport([]));
    fireEvent.change(screen.getByLabelText("Report title / property"), {
      target: { value: "123 Main St" },
    });
    expect(handlers.onFieldChange).toHaveBeenCalledWith("title", "123 Main St");
  });
});
