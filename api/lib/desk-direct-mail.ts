const RENTCAST_PROPERTIES_URL = "https://api.rentcast.io/v1/properties";
const DEFAULT_MAIL_PROVIDER = "mock";
const MAX_RENTCAST_NEIGHBORHOOD_QUERIES = 3;
const RENTCAST_SAMPLE_LIMIT = 100;
const RENTCAST_RADIUS_MILES = 0.45;
/** How many real matched addresses to return for the capture preview. */
const RENTCAST_ADDRESS_SAMPLE_LIMIT = 60;
// Full-address verification popup: bound RentCast usage so a broad selection
// can't fan out into a huge (and costly) number of paid property lookups.
const MAX_ADDRESS_NEIGHBORHOOD_QUERIES = 12;
const RENTCAST_ADDRESS_QUERY_LIMIT = 500;
const ADDRESS_LIST_HARD_CAP = 750;

const PROVIDERS = {
  stannp: {
    approxCost: "~$0.50–0.76 per 4x6 (print + postage, no minimums)",
    canTestProof: true,
    env: ["STANNP_API_KEY"],
    fit: "Cheapest true API for small tests — single-call postcard send, free no-charge test proofs, no minimums.",
    name: "Stannp",
    recommended: true,
    setupLabel: "Get API key",
    setupUrl: "https://www.stannp.com/us/direct-mail-api",
    uploadMode: "PDF/JPG/PNG or URL/base64 for front & back",
  },
  lob: {
    approxCost: "~$0.91 per 4x6 / ~$1.03 per 6x9 (print + postage)",
    canTestProof: false,
    // LOB_FROM_ADDRESS_ID is an optional fallback — the editable return address
    // is used as the inline `from`, so only the API key is required to submit.
    env: ["LOB_API_KEY"],
    fit: "Robust US developer API for postcards, address verification, templates, and send primitives.",
    name: "Lob",
    recommended: false,
    setupLabel: "Open setup",
    setupUrl: "https://www.lob.com/docs",
    uploadMode: "Inline HTML creative + inline to/from address objects",
  },
  postgrid: {
    approxCost: "~$0.86 per 4x6 / ~$0.96 per 6x9 (print + postage)",
    canTestProof: false,
    env: ["POSTGRID_API_KEY"],
    fit: "Strong address verification, audit trail, templates, and print/mail API coverage.",
    name: "PostGrid",
    recommended: false,
    setupLabel: "Open setup",
    setupUrl: "https://www.postgrid.com/docs/",
    uploadMode: "Template/contact API with PDF support",
  },
  click2mail: {
    approxCost: "Budget per-piece; volume tiers",
    canTestProof: false,
    env: ["CLICK2MAIL_USERNAME", "CLICK2MAIL_PASSWORD"],
    fit: "Budget-friendly print workflow that can receive uploaded documents and mailing lists.",
    name: "Click2Mail",
    recommended: false,
    setupLabel: "Open setup",
    setupUrl: "https://developers.click2mail.com/",
    uploadMode: "PDF/document upload plus mailing list API",
  },
  postalytics: {
    approxCost: "Platform fee + per-piece",
    canTestProof: false,
    env: ["POSTALYTICS_API_KEY"],
    fit: "Campaign-oriented direct mail automation with contacts, templates, and sends.",
    name: "Postalytics",
    recommended: false,
    setupLabel: "Open setup",
    setupUrl: "https://www.postalytics.com/direct-mail-api/",
    uploadMode: "Contacts, templates, campaigns, and sends",
  },
  mock: {
    approxCost: "Free — no mail is sent",
    canTestProof: false,
    env: [],
    fit: "Local planning mode. Builds a batch plan without sending mail.",
    name: "Planning mode",
    recommended: false,
    setupLabel: "Use planning mode",
    setupUrl: "",
    uploadMode: "No live upload",
  },
} as const;

type ProviderKey = keyof typeof PROVIDERS;

/**
 * Single source of truth for which env/secret names each sendable provider
 * needs. Consumed by the secret store (save/status) and key resolution so the
 * provider→env mapping is never duplicated.
 */
export const PROVIDER_ENV_KEYS: Record<string, readonly string[]> =
  Object.fromEntries(
    (Object.keys(PROVIDERS) as ProviderKey[])
      .filter((key) => key !== "mock")
      .map((key) => [key, PROVIDERS[key].env])
  );

interface DirectMailNeighborhood {
  county?: string;
  homes?: number;
  label?: string;
  latitude?: number | null;
  longitude?: number | null;
  medianHomeAge?: number | null;
  medianIncome?: number | null;
  medianYearBuilt?: number | null;
  neighborhood?: string;
  postalCode?: string;
  /** Query radius override (miles) for a drawn zone's equivalent radius. */
  radiusMiles?: number;
  recommendedMailerCount?: number;
  tractFips?: string;
}

interface RentCastAudience {
  matchedProperties: number;
  neighborhoodsQueried: number;
  recipientReadyCount: number;
  /** A capped, de-duplicated sample of real matched mailing addresses. */
  sampleAddresses: string[];
  status: "configured" | "missing-key" | "not-requested" | "unavailable";
}

interface ProviderRecommendation {
  approxCost: string;
  canTestProof: boolean;
  fit: string;
  key: ProviderKey;
  name: string;
  ready: boolean;
  recommended: boolean;
  requiredEnv: string[];
  setupLabel: string;
  setupUrl: string;
  uploadMode: string;
}

export interface DirectMailPlanBody {
  estimatedPieces: number;
  generatedAt: string;
  nextSteps: string[];
  ok: boolean;
  provider: string;
  providerKey: ProviderKey;
  providerReady: boolean;
  providers: ProviderRecommendation[];
  rentcast: RentCastAudience;
  requiredEnv: string[];
  sendEnabled: boolean;
  status: "draft" | "ready-for-recipients" | "send-disabled";
}

export interface DirectMailPlanResult {
  body: DirectMailPlanBody;
  status: number;
}

export interface DirectMailAddressListBody {
  addresses: string[];
  /** True when the matched list was trimmed to the hard cap. */
  capped: boolean;
  matchedProperties: number;
  neighborhoodsQueried: number;
  ok: boolean;
  status: "configured" | "missing-key" | "unavailable";
  /** Total distinct addresses found before the hard cap was applied. */
  totalAddresses: number;
}

export interface DirectMailAddressListResult {
  body: DirectMailAddressListBody;
  status: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberValue = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const boolValue = (value: unknown): boolean =>
  value === true || value === "true";

const providerKeyFromValue = (value: unknown): ProviderKey | null => {
  if (typeof value !== "string") {
    return null;
  }
  const raw = value.trim().toLowerCase();
  return raw && raw in PROVIDERS ? (raw as ProviderKey) : null;
};

const providerKey = (override: unknown): ProviderKey => {
  const configuredProvider = providerKeyFromValue(
    process.env.DIRECT_MAIL_PROVIDER
  );
  return (
    providerKeyFromValue(override) ??
    configuredProvider ??
    DEFAULT_MAIL_PROVIDER
  );
};

const missingEnv = (keys: readonly string[]): string[] =>
  keys.filter((key) => !process.env[key]?.trim());

const sendEnabled = (): boolean =>
  process.env.DIRECT_MAIL_SEND_ENABLED?.trim().toLowerCase() === "true";

const rentcastKey = (): string => process.env.RENTCAST_API_KEY?.trim() ?? "";

const normalizeNeighborhoods = (value: unknown): DirectMailNeighborhood[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asRecord(item) as DirectMailNeighborhood);
};

/**
 * A drawn (polygon) zone carries no `neighborhoods[]` — its audience is the
 * outline itself. Turn it into a single query neighborhood at the polygon
 * centroid with the zone's equivalent radius so RentCast still runs for the
 * drawn area. Returns null unless the zone has usable centroid coordinates.
 */
const zoneNeighborhoodFrom = (
  value: unknown
): DirectMailNeighborhood | null => {
  const zone = asRecord(value);
  const { latitude, longitude } = zone;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return {
    label: typeof zone.label === "string" ? zone.label : "Drawn zone",
    latitude,
    longitude,
    radiusMiles:
      typeof zone.radiusMiles === "number" ? zone.radiusMiles : undefined,
    recommendedMailerCount:
      typeof zone.mailPieces === "number" ? zone.mailPieces : undefined,
  };
};

/**
 * Resolve the neighborhoods to query for RentCast. Tract-based selections send
 * `neighborhoods[]` and win; a drawn polygon zone (no neighborhoods) falls back
 * to a single centroid + equivalent-radius query derived from the zone.
 */
const resolveQueryNeighborhoods = (
  payload: Record<string, unknown>
): DirectMailNeighborhood[] => {
  const neighborhoods = normalizeNeighborhoods(payload.neighborhoods);
  if (neighborhoods.length > 0) {
    return neighborhoods;
  }
  const zone = zoneNeighborhoodFrom(payload.zone);
  return zone ? [zone] : [];
};

const estimatePieces = (
  neighborhoods: readonly DirectMailNeighborhood[]
): number =>
  neighborhoods.reduce((sum, neighborhood) => {
    const recommended = numberValue(neighborhood.recommendedMailerCount);
    const homes = numberValue(neighborhood.homes);
    return sum + (recommended > 0 ? recommended : homes);
  }, 0);

// Bounds for a drawn zone's equivalent-radius query so a huge or tiny outline
// can't run an unreasonable RentCast search.
const RENTCAST_MIN_RADIUS = 0.1;
const RENTCAST_MAX_RADIUS = 1;

const radiusForNeighborhood = (
  neighborhood: DirectMailNeighborhood
): number => {
  if (typeof neighborhood.radiusMiles !== "number") {
    return RENTCAST_RADIUS_MILES;
  }
  return Math.min(
    RENTCAST_MAX_RADIUS,
    Math.max(RENTCAST_MIN_RADIUS, neighborhood.radiusMiles)
  );
};

const rentcastUrl = (neighborhood: DirectMailNeighborhood): string => {
  const params = new URLSearchParams({
    includeTotalCount: "true",
    limit: String(RENTCAST_SAMPLE_LIMIT),
    propertyType: "Single Family",
    radius: String(radiusForNeighborhood(neighborhood)),
    state: "TX",
    yearBuilt: ":2009",
  });
  if (typeof neighborhood.latitude === "number") {
    params.set("latitude", String(neighborhood.latitude));
  }
  if (typeof neighborhood.longitude === "number") {
    params.set("longitude", String(neighborhood.longitude));
  }
  if (!(params.has("latitude") && params.has("longitude"))) {
    params.set("city", "Austin");
    if (neighborhood.postalCode) {
      params.set("zipCode", neighborhood.postalCode);
    }
  }
  return `${RENTCAST_PROPERTIES_URL}?${params.toString()}`;
};

const hasMailingAddress = (property: unknown): boolean => {
  const record = asRecord(property);
  const owner = asRecord(record.owner);
  const ownerAddress = asRecord(owner.mailingAddress);
  const mailingAddress = asRecord(record.mailingAddress);
  return Boolean(
    record.ownerMailingAddress ||
    record.mailingAddress ||
    owner.mailingAddress ||
    ownerAddress.formattedAddress ||
    mailingAddress.formattedAddress
  );
};

const stringField = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === "string" ? (record[key] as string).trim() : "";

/** Best-effort display address for a matched property (the mailing target). */
const formattedAddressOf = (property: unknown): string | null => {
  const record = asRecord(property);
  const formatted = stringField(record, "formattedAddress");
  if (formatted) {
    return formatted;
  }
  const line1 = stringField(record, "addressLine1");
  const cityStates = [stringField(record, "city"), stringField(record, "state")]
    .filter(Boolean)
    .join(", ");
  const composed = [line1, cityStates, stringField(record, "zipCode")]
    .filter(Boolean)
    .join(" ");
  return composed || null;
};

const sampleAddressesFrom = (properties: readonly unknown[]): string[] =>
  [
    ...new Set(
      properties
        .map(formattedAddressOf)
        .filter((value): value is string => Boolean(value))
    ),
  ].slice(0, RENTCAST_ADDRESS_SAMPLE_LIMIT);

const fetchRentcastAudience = async (
  neighborhoods: readonly DirectMailNeighborhood[],
  requested: boolean
): Promise<RentCastAudience> => {
  const apiKey = rentcastKey();
  if (!requested) {
    return {
      matchedProperties: 0,
      neighborhoodsQueried: 0,
      recipientReadyCount: 0,
      sampleAddresses: [],
      status: "not-requested",
    };
  }
  if (!apiKey) {
    return {
      matchedProperties: 0,
      neighborhoodsQueried: 0,
      recipientReadyCount: 0,
      sampleAddresses: [],
      status: "missing-key",
    };
  }

  const queries = neighborhoods
    .filter(
      (neighborhood) =>
        typeof neighborhood.latitude === "number" &&
        typeof neighborhood.longitude === "number"
    )
    .slice(0, MAX_RENTCAST_NEIGHBORHOOD_QUERIES);
  if (queries.length === 0) {
    return {
      matchedProperties: 0,
      neighborhoodsQueried: 0,
      recipientReadyCount: 0,
      sampleAddresses: [],
      status: "unavailable",
    };
  }

  const responses = await Promise.all(
    queries.map(async (neighborhood) => {
      const response = await fetch(rentcastUrl(neighborhood), {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`RentCast request failed: ${response.status}`);
      }
      const properties = (await response.json()) as unknown;
      return Array.isArray(properties) ? properties : [];
    })
  );

  const properties = responses.flat();
  return {
    matchedProperties: properties.length,
    neighborhoodsQueried: queries.length,
    recipientReadyCount: properties.filter(hasMailingAddress).length,
    sampleAddresses: sampleAddressesFrom(properties),
    status: "configured",
  };
};

const rentcastAddressUrl = (neighborhood: DirectMailNeighborhood): string => {
  const params = new URLSearchParams({
    limit: String(RENTCAST_ADDRESS_QUERY_LIMIT),
    propertyType: "Single Family",
    radius: String(radiusForNeighborhood(neighborhood)),
    state: "TX",
    yearBuilt: ":2009",
  });
  if (typeof neighborhood.latitude === "number") {
    params.set("latitude", String(neighborhood.latitude));
  }
  if (typeof neighborhood.longitude === "number") {
    params.set("longitude", String(neighborhood.longitude));
  }
  if (!(params.has("latitude") && params.has("longitude"))) {
    params.set("city", "Austin");
    if (neighborhood.postalCode) {
      params.set("zipCode", neighborhood.postalCode);
    }
  }
  return `${RENTCAST_PROPERTIES_URL}?${params.toString()}`;
};

/** Neighborhoods that carry usable coordinates, bounded to the query budget. */
const addressQueryNeighborhoods = (
  neighborhoods: readonly DirectMailNeighborhood[]
): DirectMailNeighborhood[] =>
  neighborhoods
    .filter(
      (neighborhood) =>
        typeof neighborhood.latitude === "number" &&
        typeof neighborhood.longitude === "number"
    )
    .slice(0, MAX_ADDRESS_NEIGHBORHOOD_QUERIES);

/** Fetch and flatten the full matched property records across all queries. */
const fetchMatchedProperties = async (
  queries: readonly DirectMailNeighborhood[],
  apiKey: string
): Promise<unknown[]> => {
  const responses = await Promise.all(
    queries.map(async (neighborhood) => {
      const response = await fetch(rentcastAddressUrl(neighborhood), {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`RentCast request failed: ${response.status}`);
      }
      const properties = (await response.json()) as unknown;
      return Array.isArray(properties) ? properties : [];
    })
  );
  return responses.flat();
};

/** Structured mailing recipient with the fields print/mail providers require. */
export interface MailRecipient {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

export interface SubmitRecipientsResult {
  /** Distinct structured recipients, ordered, bounded by ADDRESS_LIST_HARD_CAP. */
  recipients: MailRecipient[];
  status: "configured" | "missing-key" | "unavailable";
  /** Distinct recipients matched before any submit-time safety cap. */
  totalMatched: number;
}

/** Structured recipient from a matched property, or null when unmailable. */
const recipientOf = (property: unknown): MailRecipient | null => {
  const record = asRecord(property);
  const addressLine1 = stringField(record, "addressLine1");
  const zip = stringField(record, "zipCode");
  if (!(addressLine1 && zip)) {
    return null;
  }
  return {
    addressLine1,
    city: stringField(record, "city") || "Austin",
    state: (stringField(record, "state") || "TX").toUpperCase(),
    zip,
  };
};

/**
 * Rebuild the FULL structured recipient list for a selection/zone server-side,
 * so a submit mails the whole audience — not the ~60-address preview sample the
 * client shows. Deduped and ordered; works for both the tract/radius path and a
 * drawn polygon zone (centroid + equivalent radius via `resolveQueryNeighborhoods`).
 */
export const collectSubmitRecipients = async (
  payload: Record<string, unknown>
): Promise<SubmitRecipientsResult> => {
  const apiKey = rentcastKey();
  if (!apiKey) {
    return { recipients: [], status: "missing-key", totalMatched: 0 };
  }
  const queries = addressQueryNeighborhoods(resolveQueryNeighborhoods(payload));
  if (queries.length === 0) {
    return { recipients: [], status: "unavailable", totalMatched: 0 };
  }
  const properties = await fetchMatchedProperties(queries, apiKey);
  const byKey = new Map<string, MailRecipient>();
  for (const property of properties) {
    const recipient = recipientOf(property);
    if (!recipient) {
      continue;
    }
    const key = `${recipient.addressLine1.toLowerCase()}|${recipient.zip}`;
    if (!byKey.has(key)) {
      byKey.set(key, recipient);
    }
  }
  const distinct = [...byKey.values()].toSorted((left, right) =>
    left.addressLine1.localeCompare(right.addressLine1)
  );
  return {
    recipients: distinct.slice(0, ADDRESS_LIST_HARD_CAP),
    status: "configured",
    totalMatched: distinct.length,
  };
};

/**
 * Pull the full (bounded) list of matched mailing addresses for a selection so
 * the operator can eyeball every recipient before spending on a real send.
 */
export const prepareDirectMailAddresses = async (
  payload: Record<string, unknown>
): Promise<DirectMailAddressListResult> => {
  const neighborhoods = resolveQueryNeighborhoods(payload);
  const apiKey = rentcastKey();
  if (!apiKey) {
    return {
      body: {
        addresses: [],
        capped: false,
        matchedProperties: 0,
        neighborhoodsQueried: 0,
        ok: true,
        status: "missing-key",
        totalAddresses: 0,
      },
      status: 200,
    };
  }

  const queries = addressQueryNeighborhoods(neighborhoods);
  if (queries.length === 0) {
    return {
      body: {
        addresses: [],
        capped: false,
        matchedProperties: 0,
        neighborhoodsQueried: 0,
        ok: true,
        status: "unavailable",
        totalAddresses: 0,
      },
      status: 200,
    };
  }

  const properties = await fetchMatchedProperties(queries, apiKey);
  const distinct = [
    ...new Set(
      properties
        .map(formattedAddressOf)
        .filter((value): value is string => Boolean(value))
    ),
  ].toSorted((left, right) => left.localeCompare(right));

  return {
    body: {
      addresses: distinct.slice(0, ADDRESS_LIST_HARD_CAP),
      capped: distinct.length > ADDRESS_LIST_HARD_CAP,
      matchedProperties: properties.length,
      neighborhoodsQueried: queries.length,
      ok: true,
      status: "configured",
      totalAddresses: distinct.length,
    },
    status: 200,
  };
};

const providerRecommendations = (): ProviderRecommendation[] =>
  (Object.keys(PROVIDERS) as ProviderKey[])
    .filter((key) => key !== "mock")
    .map((key) => ({
      approxCost: PROVIDERS[key].approxCost,
      canTestProof: PROVIDERS[key].canTestProof,
      fit: PROVIDERS[key].fit,
      key,
      name: PROVIDERS[key].name,
      ready: missingEnv(PROVIDERS[key].env).length === 0,
      recommended: PROVIDERS[key].recommended,
      requiredEnv: [...PROVIDERS[key].env],
      setupLabel: PROVIDERS[key].setupLabel,
      setupUrl: PROVIDERS[key].setupUrl,
      uploadMode: PROVIDERS[key].uploadMode,
    }));

const nextStepsFor = ({
  pieces,
  providerReady,
  rentcast,
  selectedProvider,
}: {
  pieces: number;
  providerReady: boolean;
  rentcast: RentCastAudience;
  selectedProvider: ProviderKey;
}): string[] => {
  const steps: string[] = [];
  if (pieces === 0) {
    steps.push("Select at least one neighborhood with a mail-piece count.");
  }
  if (rentcast.status === "missing-key") {
    steps.push(
      "Connect homeowner matching or upload a recipient list before sending."
    );
  }
  if (rentcast.status === "not-requested") {
    steps.push("Run recipient matching before sending.");
  }
  if (rentcast.status === "configured" && rentcast.recipientReadyCount === 0) {
    steps.push(
      "No mailing addresses matched these filters; widen the area or review the recipient rules."
    );
  }
  if (selectedProvider === "mock") {
    steps.push("Choose a print/mail service before sending live mail.");
  }
  if (!providerReady) {
    steps.push("Finish the selected print/mail service setup before sending.");
  }
  if (!sendEnabled()) {
    steps.push("Keep sending off until creative and recipients are reviewed.");
  }
  return steps;
};

export const prepareDirectMailBatch = async (
  payload: Record<string, unknown>
): Promise<DirectMailPlanResult> => {
  const neighborhoods = resolveQueryNeighborhoods(payload);
  const selectedProvider = providerKey(payload.provider);
  const provider = PROVIDERS[selectedProvider];
  const requiredEnv = [...provider.env];
  const missing = missingEnv(requiredEnv);
  const providerReady = missing.length === 0;
  const pieces = estimatePieces(neighborhoods);
  const rentcast = await fetchRentcastAudience(
    neighborhoods,
    boolValue(payload.includeRecipients)
  );

  return {
    body: {
      estimatedPieces: pieces,
      generatedAt: new Date().toISOString(),
      nextSteps: nextStepsFor({
        pieces,
        providerReady,
        rentcast,
        selectedProvider,
      }),
      ok: true,
      provider: provider.name,
      providerKey: selectedProvider,
      providerReady,
      providers: providerRecommendations(),
      rentcast,
      requiredEnv: missing,
      sendEnabled: sendEnabled(),
      status:
        providerReady && rentcast.status === "configured"
          ? "ready-for-recipients"
          : sendEnabled()
            ? "send-disabled"
            : "draft",
    },
    status: 200,
  };
};
