/**
 * Shared between the site (`src/**`) and `api/contact.ts`.
 * Vercel bundles `api/contact` separately — keep this file at repo root so the
 * serverless function can import it reliably (`../contactServiceOptions`).
 */
export const CONTACT_SERVICE_OPTIONS = [
  { value: "shingle-roofing", label: "Shingle Roofing" },
  { value: "metal-roofing", label: "Metal Roofing" },
  { value: "storm-damage-restoration", label: "Storm Damage Restoration" },
  { value: "commercial-roofing", label: "Commercial Roofing" },
  {
    value: "hail-wind-damage-roof-inspection",
    label: "Hail & Wind Damage Roof Inspection",
  },
] as const;

export type ContactServiceValue =
  (typeof CONTACT_SERVICE_OPTIONS)[number]["value"];

const SERVICE_VALUES = new Set<string>(
  CONTACT_SERVICE_OPTIONS.map((o) => o.value),
);

export const isValidContactServiceValue = (
  v: string,
): v is ContactServiceValue => SERVICE_VALUES.has(v);

export const contactServiceLabel = (value: string): string | null => {
  const row = CONTACT_SERVICE_OPTIONS.find((o) => o.value === value);
  return row?.label ?? null;
};
