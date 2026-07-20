import { describe, expect, it } from "vitest";

import { formatPhotoTakenLabel } from "../format";

describe(formatPhotoTakenLabel, () => {
  it("formats an ISO date with weekday and ordinal day", () => {
    expect(formatPhotoTakenLabel("2026-05-03")).toBe(
      "Photo Taken: Sunday, May 3rd, 2026"
    );
  });

  it("uses st/nd/rd/th ordinals correctly", () => {
    expect(formatPhotoTakenLabel("2026-05-01")).toContain("1st");
    expect(formatPhotoTakenLabel("2026-05-02")).toContain("2nd");
    expect(formatPhotoTakenLabel("2026-05-04")).toContain("4th");
    expect(formatPhotoTakenLabel("2026-05-21")).toContain("21st");
  });

  it("returns an empty string when the date is missing or invalid", () => {
    expect(formatPhotoTakenLabel(null)).toBe("");
    expect(formatPhotoTakenLabel("")).toBe("");
    expect(formatPhotoTakenLabel("not-a-date")).toBe("");
  });
});
