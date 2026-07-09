import type { AdCreativeVersion } from "../hooks/use-ad-versions";
import { numberFromRecord, stringFromRecord } from "./desk-format";
import type { AdVersionSummary } from "./desk-types";

export const creativeRecordFromConfig = (
  config: string
): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(config) as Record<string, unknown>;
    const creative = parsed.creative;
    return creative && typeof creative === "object"
      ? (creative as Record<string, unknown>)
      : parsed;
  } catch {
    return null;
  }
};

export const summarizeAdVersion = (
  version: AdCreativeVersion | null
): AdVersionSummary | null => {
  if (!version) {
    return null;
  }
  const creative = creativeRecordFromConfig(version.config);
  if (!creative) {
    return null;
  }
  const width = numberFromRecord(creative, "adWidth");
  const height = numberFromRecord(creative, "adHeight");
  const unit = stringFromRecord(creative, "unit") ?? "px";
  return {
    body: stringFromRecord(creative, "body"),
    dimensions:
      typeof width === "number" && typeof height === "number"
        ? `${width} x ${height}${unit === "in" ? "in" : "px"}`
        : undefined,
    headline: stringFromRecord(creative, "headline"),
    layout: stringFromRecord(creative, "layout"),
    platformId: stringFromRecord(creative, "platformId"),
  };
};
