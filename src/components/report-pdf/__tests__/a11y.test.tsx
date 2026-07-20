import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildLayoutModel } from "../../../lib/report-pdf/layout-model";
import type {
  BrandProfile,
  DetailsTable,
  PhotoItem,
  Report,
} from "../../../lib/report-pdf/types";
import { runAxe } from "../../../test/axe";
import { EditorPane } from "../editor-pane";
import { ReportPreview } from "../report-preview";

const brand: BrandProfile = {
  address: "100 Roof Ln, Waco TX",
  colors: { accent: "#3f7d5f", primary: "#0f3d2a", text: "#1b1b1b" },
  email: "hello@birdcreek.com",
  footerText: "Birdcreek Roofing",
  logoUrl: null,
  phone: "254-555-0100",
  website: "birdcreek.com",
};

const photo = (id: string, order: number): PhotoItem => ({
  annotations: null,
  caption: "Ridge cap lifting",
  id,
  order,
  previewUrl: "blob:a",
  processedImage: new Blob(["x"], { type: "image/jpeg" }),
  sectionId: null,
  sourceName: `${id}.jpg`,
  table: { columns: ["Finding", "Detail"], rows: [["Leak", "Vent"]] },
  takenAt: null,
});

const report: Report = {
  contactAddress: "",
  contactEmail: "",
  contactIntro: "",
  contactPhone: "",
  contactWebsite: "",
  coverHeading: "Roof Inspection Report",
  coverImageUrl: null,
  date: "2026-07-18",
  overallNote: "Roof is serviceable with minor repairs.",
  photos: [photo("a", 0), photo("b", 1)],
  propertyAddress: "123 Main St",
  sections: [{ id: "s1", order: 0, title: "Front slope" }],
  title: "123 Main St",
  jobNumber: "",
};

const noopHandlers = {
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

describe("report-pdf accessibility", () => {
  it("editor pane has no axe violations", async () => {
    const { container } = render(
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
        {...noopHandlers}
      />
    );
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it("report preview has no axe violations", async () => {
    const model = buildLayoutModel(report, brand);
    const { container } = render(<ReportPreview brand={brand} model={model} />);
    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});
