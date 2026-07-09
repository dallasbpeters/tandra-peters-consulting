export const waFieldValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const publishDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatPublishDate = (value: string | undefined): string => {
  if (!value) {
    return "Unscheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }
  return publishDateFormatter.format(date);
};

const numberFormatter = new Intl.NumberFormat("en-US");

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

export const formatCurrencyValue = (value: number | null | undefined): string =>
  typeof value === "number" ? currencyFormatter.format(value) : "No data";

export const formatYearValue = (value: number | null | undefined): string =>
  typeof value === "number" ? String(value) : "No data";

export const formatSavedCreativeDate = (savedAt?: string): string => {
  if (!savedAt) {
    return "Saved creative";
  }
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return "Saved creative";
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "") || "target";

export const escapeCsvField = (value: number | string): string => {
  const text = String(value);
  if (!(text.includes(",") || text.includes('"') || text.includes("\n"))) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

export const averageValue = (
  values: readonly (number | null | undefined)[]
): number | null => {
  const usable = values.filter(
    (value): value is number => typeof value === "number"
  );
  if (usable.length === 0) {
    return null;
  }
  return Math.round(
    usable.reduce((sum, value) => sum + value, 0) / usable.length
  );
};

export const stringFromRecord = (
  record: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const numberFromRecord = (
  record: Record<string, unknown>,
  key: string
): number | undefined => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};
