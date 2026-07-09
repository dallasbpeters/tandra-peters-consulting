import { averageValue, slugify } from "./desk-format";
import type {
  DeskAreaTarget,
  DirectMailPlanResponse,
  PostcardBackCopy,
  PostcardReturnAddress,
} from "./desk-types";

const POSTCARD_LANDING_PATH = "/estimate";
const TRAILING_SLASH_RE = /\/+$/;

/**
 * Scan destination for the postcard QR. Always points at the production site
 * (never localhost) so a printed proof resolves, and tags the source so scans
 * are attributable in analytics.
 */
export const postcardScanUrl = (
  zone: { label: string } | null,
  batchName: string
): string => {
  const origin =
    import.meta.env.VITE_SITE_URL?.trim().replace(TRAILING_SLASH_RE, "") ||
    "https://www.tandra.me";
  const source = (zone?.label ?? batchName ?? "").trim();
  const campaign = source ? slugify(source) : "postcard";
  const params = new URLSearchParams({
    utm_campaign: campaign,
    utm_medium: "direct_mail",
    utm_source: "postcard",
  });
  return `${origin}${POSTCARD_LANDING_PATH}?${params.toString()}`;
};

export const BACK_COPY_STORAGE_KEY = "desk-postcard-back-copy";
export const EMPTY_BACK_COPY: PostcardBackCopy = {
  body: "",
  cta: "",
  headline: "",
};
export const DEFAULT_BACK_CTA = "Scan for a roof check or text 512-968-3965.";

export const defaultBackHeadline = (zoneName: string): string =>
  `Roof age check for ${zoneName}`;

export const defaultBackBody = (roofAgePhrase: string): string =>
  `I'm checking older roofs in this area this week. If your roof is ${roofAgePhrase}, I can take a look and explain what matters before you file anything.`;

export const loadBackCopy = (): PostcardBackCopy => {
  if (typeof window === "undefined") {
    return EMPTY_BACK_COPY;
  }
  try {
    const raw = window.localStorage.getItem(BACK_COPY_STORAGE_KEY);
    if (!raw) {
      return EMPTY_BACK_COPY;
    }
    const parsed = JSON.parse(raw) as Partial<PostcardBackCopy>;
    return {
      body: typeof parsed.body === "string" ? parsed.body : "",
      cta: typeof parsed.cta === "string" ? parsed.cta : "",
      headline: typeof parsed.headline === "string" ? parsed.headline : "",
    };
  } catch {
    return EMPTY_BACK_COPY;
  }
};

export const isBackCopyCustomized = (copy: PostcardBackCopy): boolean =>
  Boolean(copy.headline.trim() || copy.body.trim() || copy.cta.trim());

export const roofAgePhraseFor = (
  selectedTargets: readonly DeskAreaTarget[]
): string => {
  const averageHomeAge = averageValue(
    selectedTargets.map((target) => target.medianHomeAge)
  );
  return averageHomeAge
    ? `around ${averageHomeAge} years old`
    : "15+ years old";
};

/** Resolved back copy: custom values, falling back to the suggested defaults. */
export const resolveBackCopy = (
  copy: PostcardBackCopy,
  zoneName: string,
  roofAgePhrase: string
): PostcardBackCopy => ({
  body: copy.body.trim() || defaultBackBody(roofAgePhrase),
  cta: copy.cta.trim() || DEFAULT_BACK_CTA,
  headline: copy.headline.trim() || defaultBackHeadline(zoneName),
});

export const RETURN_ADDRESS_STORAGE_KEY = "desk-postcard-return-address";

export const DEFAULT_RETURN_ADDRESS: PostcardReturnAddress = {
  city: "Austin",
  company: "Birdcreek Roofing",
  line1: "2300 Forsam Bend",
  line2: "",
  name: "Tandra Peters",
  state: "TX",
  zip: "78725",
};

const RETURN_ADDRESS_FIELDS: (keyof PostcardReturnAddress)[] = [
  "city",
  "company",
  "line1",
  "line2",
  "name",
  "state",
  "zip",
];

const ZIP_RE = /^\d{5}(-\d{4})?$/;
const STATE_RE = /^[A-Za-z]{2}$/;

export const loadReturnAddress = (): PostcardReturnAddress => {
  if (typeof window === "undefined") {
    return DEFAULT_RETURN_ADDRESS;
  }
  try {
    const raw = window.localStorage.getItem(RETURN_ADDRESS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RETURN_ADDRESS;
    }
    const parsed = JSON.parse(raw) as Partial<PostcardReturnAddress>;
    const merged = { ...DEFAULT_RETURN_ADDRESS };
    for (const field of RETURN_ADDRESS_FIELDS) {
      if (typeof parsed[field] === "string") {
        merged[field] = parsed[field] as string;
      }
    }
    return merged;
  } catch {
    return DEFAULT_RETURN_ADDRESS;
  }
};

export const isReturnAddressCustomized = (
  address: PostcardReturnAddress
): boolean =>
  RETURN_ADDRESS_FIELDS.some(
    (field) => address[field].trim() !== DEFAULT_RETURN_ADDRESS[field].trim()
  );

/** Display lines for the postcard-back return block (blank fields dropped). */
export const returnAddressLines = (
  address: PostcardReturnAddress
): string[] => {
  const cityLine = [
    address.city.trim(),
    [address.state.trim(), address.zip.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [
    address.name.trim(),
    address.company.trim(),
    address.line1.trim(),
    address.line2.trim(),
    cityLine,
  ].filter(Boolean);
};

/** Basic required-field / ZIP sanity check. Returns null when valid. */
export const returnAddressError = (
  address: PostcardReturnAddress
): string | null => {
  if (!(address.name.trim() || address.company.trim())) {
    return "Add a return name or company.";
  }
  if (!address.line1.trim()) {
    return "Add a return street address.";
  }
  if (!address.city.trim()) {
    return "Add a return city.";
  }
  if (!STATE_RE.test(address.state.trim())) {
    return "Return state must be a 2-letter code (e.g. TX).";
  }
  if (!ZIP_RE.test(address.zip.trim())) {
    return "Return ZIP must be 5 digits (e.g. 78680).";
  }
  return null;
};

export const rentcastPreviewNote = (
  status: DirectMailPlanResponse["rentcast"]["status"]
): string => {
  switch (status) {
    case "missing-key": {
      return "Connect recipient matching (set RENTCAST_API_KEY) or upload a list to preview individual addresses.";
    }
    case "unavailable": {
      return "These areas have no coordinates for address matching — upload a recipient list instead.";
    }
    case "not-requested": {
      return "Prepare the batch to match individual mailing addresses.";
    }
    default: {
      return "No single-family homes (built 2009 or earlier) matched inside these areas. Widen the zone or review the rules.";
    }
  }
};
