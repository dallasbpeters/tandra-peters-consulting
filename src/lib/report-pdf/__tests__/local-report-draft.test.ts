import { afterEach, describe, expect, it } from "vitest";

import {
  loadLocalReportDraft,
  saveLocalReportDraft,
} from "../local-report-draft";
import type { Report } from "../types";

const LOCAL_REPORT_DRAFT_KEY = "tandra:report:current-draft";

const makeReport = (): Report => ({
  contactAddress: "Waco, TX",
  contactEmail: "hello@example.com",
  contactIntro: "Thanks for trusting me with your roof.",
  contactPhone: "254-555-0100",
  contactWebsite: "example.com",
  coverHeading: "Roof Inspection Report",
  coverImageUrl: null,
  date: "2026-07-21",
  jobNumber: "JOB-42",
  overallNote: "Draft note",
  photos: [
    {
      annotations: null,
      caption: "Front slope",
      id: "photo-1",
      order: 0,
      previewUrl: "blob:preview",
      processedImage: new Blob(["photo"], { type: "image/jpeg" }),
      sectionId: null,
      sourceName: "roof.jpg",
      table: null,
      takenAt: "2026-07-20",
    },
  ],
  propertyAddress: "123 Main St",
  sections: [],
  title: "Main Street inspection",
});

describe("local report draft", () => {
  afterEach(() => {
    window.localStorage.removeItem(LOCAL_REPORT_DRAFT_KEY);
  });

  it("returns null when no draft has been saved", async () => {
    await expect(loadLocalReportDraft()).resolves.toBeNull();
  });

  it("restores report fields and processed photos", async () => {
    const report = makeReport();
    await saveLocalReportDraft(report);

    const restored = await loadLocalReportDraft();

    expect(restored).not.toBeNull();
    expect(restored?.title).toBe(report.title);
    expect(restored?.jobNumber).toBe(report.jobNumber);
    expect(restored?.photos[0]?.caption).toBe("Front slope");
    expect(restored?.photos[0]?.processedImage).toBeInstanceOf(Blob);
  });

  it("discards an invalid draft", async () => {
    window.localStorage.setItem(LOCAL_REPORT_DRAFT_KEY, "not-json");

    await expect(loadLocalReportDraft()).resolves.toBeNull();
    expect(window.localStorage.getItem(LOCAL_REPORT_DRAFT_KEY)).toBeNull();
  });
});
