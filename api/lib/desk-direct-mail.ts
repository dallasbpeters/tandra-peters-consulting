const RENTCAST_PROPERTIES_URL = "https://api.rentcast.io/v1/properties";
const DEFAULT_MAIL_PROVIDER = "mock";
const MAX_RENTCAST_NEIGHBORHOOD_QUERIES = 3;
const RENTCAST_SAMPLE_LIMIT = 100;
const RENTCAST_RADIUS_MILES = 0.45;
/** How many real matched addresses to return for the capture preview. */
const RENTCAST_ADDRESS_SAMPLE_LIMIT = 60;

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
    env: ["LOB_API_KEY", "LOB_FROM_ADDRESS_ID"],
    fit: "Robust US developer API for postcards, address verification, templates, and send primitives.",
    name: "Lob",
    recommended: false,
    setupLabel: "Open setup",
    setupUrl: "https://www.lob.com/docs",
    uploadMode: "HTML/PDF creative plus address objects",
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

const estimatePieces = (
  neighborhoods: readonly DirectMailNeighborhood[]
): number =>
  neighborhoods.reduce((sum, neighborhood) => {
    const recommended = numberValue(neighborhood.recommendedMailerCount);
    const homes = numberValue(neighborhood.homes);
    return sum + (recommended > 0 ? recommended : homes);
  }, 0);

const rentcastUrl = (neighborhood: DirectMailNeighborhood): string => {
  const params = new URLSearchParams({
    includeTotalCount: "true",
    limit: String(RENTCAST_SAMPLE_LIMIT),
    propertyType: "Single Family",
    radius: String(RENTCAST_RADIUS_MILES),
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
  const neighborhoods = normalizeNeighborhoods(payload.neighborhoods);
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
