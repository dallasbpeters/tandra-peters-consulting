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

/** Today as `YYYY-MM-DD` in local time (default report date). */
export const todayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};
