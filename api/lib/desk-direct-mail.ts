const RENTCAST_PROPERTIES_URL = "https://api.rentcast.io/v1/properties";
const DEFAULT_MAIL_PROVIDER = "mock";
const MAX_RENTCAST_NEIGHBORHOOD_QUERIES = 3;
const RENTCAST_SAMPLE_LIMIT = 100;
const RENTCAST_RADIUS_MILES = 0.45;

const PROVIDERS = {
  click2mail: {
    env: ["CLICK2MAIL_USERNAME", "CLICK2MAIL_PASSWORD"],
    fit: "Budget-friendly print workflow with REST and Batch XML options.",
    name: "Click2Mail",
  },
  lob: {
    env: ["LOB_API_KEY", "LOB_FROM_ADDRESS_ID"],
    fit: "Best first developer API for postcards, letters, address verification, and simple send primitives.",
    name: "Lob",
  },
  mock: {
    env: [],
    fit: "Local planning mode. Builds a batch plan without sending mail.",
    name: "Planning mode",
  },
  postalytics: {
    env: ["POSTALYTICS_API_KEY"],
    fit: "Campaign-oriented direct mail automation with contacts, templates, and sends.",
    name: "Postalytics",
  },
  postgrid: {
    env: ["POSTGRID_API_KEY"],
    fit: "Good fit when address verification, audit trail, and print/mail API coverage matter.",
    name: "PostGrid",
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
  status: "configured" | "missing-key" | "not-requested" | "unavailable";
}

interface ProviderRecommendation {
  fit: string;
  name: string;
  requiredEnv: string[];
}

export interface DirectMailPlanBody {
  estimatedPieces: number;
  generatedAt: string;
  nextSteps: string[];
  ok: boolean;
  provider: string;
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

const providerKey = (): ProviderKey => {
  const raw = process.env.DIRECT_MAIL_PROVIDER?.trim().toLowerCase();
  return raw && raw in PROVIDERS ? (raw as ProviderKey) : DEFAULT_MAIL_PROVIDER;
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
      status: "not-requested",
    };
  }
  if (!apiKey) {
    return {
      matchedProperties: 0,
      neighborhoodsQueried: 0,
      recipientReadyCount: 0,
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
    status: "configured",
  };
};

const providerRecommendations = (): ProviderRecommendation[] =>
  (Object.keys(PROVIDERS) as ProviderKey[])
    .filter((key) => key !== "mock")
    .map((key) => ({
      fit: PROVIDERS[key].fit,
      name: PROVIDERS[key].name,
      requiredEnv: [...PROVIDERS[key].env],
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
      "Add RENTCAST_API_KEY to pull property-level homeowner recipients."
    );
  }
  if (rentcast.status === "not-requested") {
    steps.push("Request recipient matching before sending.");
  }
  if (rentcast.status === "configured" && rentcast.recipientReadyCount === 0) {
    steps.push(
      "Review RentCast filters; no recipient-ready properties were returned."
    );
  }
  if (selectedProvider === "mock") {
    steps.push(
      "Set DIRECT_MAIL_PROVIDER to lob, click2mail, postgrid, or postalytics."
    );
  }
  if (!providerReady) {
    steps.push("Add the selected direct-mail provider API credentials.");
  }
  if (!sendEnabled()) {
    steps.push(
      "Keep DIRECT_MAIL_SEND_ENABLED=false until creative and recipients are reviewed."
    );
  }
  return steps;
};

export const prepareDirectMailBatch = async (
  payload: Record<string, unknown>
): Promise<DirectMailPlanResult> => {
  const neighborhoods = normalizeNeighborhoods(payload.neighborhoods);
  const selectedProvider = providerKey();
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
