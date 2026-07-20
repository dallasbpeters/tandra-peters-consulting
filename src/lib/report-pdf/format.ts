/** Format an ISO date (`YYYY-MM-DD`) for display; passes through anything else. */
export const formatDisplayDate = (iso: string): string => {
  if (!iso.trim()) {
    return "";
  }
  // Parse as local date to avoid timezone shifting a bare YYYY-MM-DD back a day.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso.trim());
  if (!match) {
    return iso.trim();
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) {
    return iso.trim();
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const ORDINAL_SUFFIXES = new Map([
  [1, "st"],
  [2, "nd"],
  [3, "rd"],
  [21, "st"],
  [22, "nd"],
  [23, "rd"],
  [31, "st"],
]);

const dayWithOrdinal = (day: number): string => {
  const suffix = ORDINAL_SUFFIXES.get(day) ?? "th";
  return `${day}${suffix}`;
};

/**
 * Format a photo-taken ISO date for the on-image badge, e.g.
 * `Photo Taken: Sunday, May 3rd, 2026`. Returns "" when empty/invalid.
 */
export const formatPhotoTakenLabel = (
  iso: string | null | undefined
): string => {
  if (!iso?.trim()) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso.trim());
  if (!match) {
    return "";
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-US", { month: "long" });
  return `Photo Taken: ${weekday}, ${monthName} ${dayWithOrdinal(date.getDate())}, ${year}`;
};

/** Today as `YYYY-MM-DD` in local time (default report date). */
export const todayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Format a `Date` as local `YYYY-MM-DD`. */
export const toLocalIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
