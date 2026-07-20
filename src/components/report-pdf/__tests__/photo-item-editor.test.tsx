import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  DetailsTable,
  PhotoItem,
  SectionHeading,
} from "../../../lib/report-pdf/types";
import { PhotoItemEditor } from "../photo-item-editor";

const basePhoto: PhotoItem = {
  annotations: null,
  caption: "",
  id: "a",
  order: 0,
  previewUrl: "blob:a",
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: "a.jpg",
  table: null,
  takenAt: null,
};

const renderItem = (photo: PhotoItem, sections: SectionHeading[] = []) => {
  const handlers = {
    onAnnotate: vi.fn<(id: string) => void>(),
    onCaptionChange: vi.fn<(id: string, caption: string) => void>(),
    onMove: vi.fn<(id: string, direction: -1 | 1) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
    onSectionChange: vi.fn<(id: string, sectionId: string | null) => void>(),
    onTableChange: vi.fn<(id: string, table: DetailsTable | null) => void>(),
  };
  render(
    <ul>
      <PhotoItemEditor
        idToken="test-id-token"
        index={0}
        photo={photo}
        sections={sections}
        total={1}
        {...handlers}
      />
    </ul>
  );
  return handlers;
};

describe(PhotoItemEditor, () => {
  it("edits the caption", () => {
    const handlers = renderItem(basePhoto);
    fireEvent.change(screen.getByLabelText("Caption"), {
      target: { value: "Cracked flashing" },
    });
    expect(handlers.onCaptionChange).toHaveBeenCalledWith(
      "a",
      "Cracked flashing"
    );
  });

  it("adds a default Finding/Detail table (no cost column)", () => {
    const handlers = renderItem(basePhoto);
    fireEvent.click(screen.getByRole("button", { name: /add details table/i }));
    const table = handlers.onTableChange.mock.calls[0][1] as DetailsTable;
    expect(table.columns).toStrictEqual(["Finding", "Detail"]);
    expect(table.columns).not.toContain("Cost");
  });

  it("edits a column header on an existing table", () => {
    const table: DetailsTable = {
      columns: ["Finding", "Detail"],
      rows: [["Leak", "Vent"]],
    };
    const handlers = renderItem({ ...basePhoto, table });
    fireEvent.change(screen.getByLabelText("Column 1 name"), {
      target: { value: "Issue" },
    });
    expect(handlers.onTableChange).toHaveBeenCalledWith("a", {
      columns: ["Issue", "Detail"],
      rows: [["Leak", "Vent"]],
    });
  });

  it("adds a row to the table", () => {
    const table: DetailsTable = {
      columns: ["Finding", "Detail"],
      rows: [["Leak", "Vent"]],
    };
    const handlers = renderItem({ ...basePhoto, table });
    fireEvent.click(screen.getByRole("button", { name: /add row/i }));
    const next = handlers.onTableChange.mock.calls[0][1] as DetailsTable;
    expect(next.rows).toHaveLength(2);
    expect(next.rows[1]).toStrictEqual(["", ""]);
  });

  it("assigns the photo to a section", () => {
    const handlers = renderItem(basePhoto, [
      { id: "s1", order: 0, title: "Front slope" },
    ]);
    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: "s1" },
    });
    expect(handlers.onSectionChange).toHaveBeenCalledWith("a", "s1");
  });
});
