/** Derive a safe PDF filename from the report title + date (FR-014). */

const SLUG_RE = /[^a-z0-9]+/giu;
const TRIM_DASH_RE = /^-+|-+$/gu;

const slugify = (value: string): string =>
  value.trim().toLowerCase().replace(SLUG_RE, "-").replace(TRIM_DASH_RE, "");

/** e.g. `roof-inspection-report-123-main-st-2026-07-18.pdf`. */
export const buildReportFilename = (title: string, date: string): string => {
  const titleSlug = slugify(title) || "roof-inspection-report";
  const dateSlug = slugify(date);
  const stem = dateSlug ? `${titleSlug}-${dateSlug}` : titleSlug;
  return `${stem}.pdf`;
};
