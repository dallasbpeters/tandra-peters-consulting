export type PropertyLookupResult = {
  stories: number | null;
  totalAreaSqft: number | null;
  footprintSqft: number | null;
  yearBuilt: number | null;
  formattedAddress: string;
};

export type PropertyLookupStatus = "idle" | "loading" | "found" | "not_found" | "error" | "skipped";

export const lookupProperty = async (address: string): Promise<PropertyLookupResult> => {
  const res = await fetch("/api/property-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Property lookup failed (${res.status})`);
  }

  return res.json() as Promise<PropertyLookupResult>;
};

export const storiesLabel = (stories: number | null): string => {
  if (stories === 1) return "1 story";
  if (stories === 2) return "2 stories";
  if (stories !== null && stories >= 3) return `${stories} stories`;
  return "";
};
