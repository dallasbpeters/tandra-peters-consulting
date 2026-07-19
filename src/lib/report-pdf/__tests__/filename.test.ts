import { describe, expect, it } from "vitest";

import { buildReportFilename } from "../filename";

describe(buildReportFilename, () => {
  it("slugs the title and appends the date", () => {
    expect(buildReportFilename("123 Main St", "2026-07-18")).toBe(
      "123-main-st-2026-07-18.pdf"
    );
  });

  it("collapses punctuation and casing into a single slug", () => {
    expect(buildReportFilename("Smith & Co. — Roof!!", "2026-01-02")).toBe(
      "smith-co-roof-2026-01-02.pdf"
    );
  });

  it("falls back to a default stem when the title is empty", () => {
    expect(buildReportFilename("   ", "2026-07-18")).toBe(
      "roof-inspection-report-2026-07-18.pdf"
    );
  });

  it("omits the date segment when the date is blank", () => {
    expect(buildReportFilename("Garage", "")).toBe("garage.pdf");
  });

  it("uses only the default stem when both inputs are empty", () => {
    expect(buildReportFilename("", "")).toBe("roof-inspection-report.pdf");
  });
});
