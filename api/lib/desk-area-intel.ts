const CENSUS_REPORTER_URL = "https://api.censusreporter.org/1.0/data/show";
const TIGER_TRACTS_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7/query";
const MAPBOX_REVERSE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

const OWNER_TABLE = "B25003";
const AGE_TABLE = "B25034";
const OWNER_TOTAL = "B25003001";
const OWNER_OCCUPIED = "B25003002";
const HOUSING_TOTAL = "B25034001";
const BUILT_BEFORE_2010_COLUMNS = [
  "B25034004",
  "B25034005",
  "B25034006",
  "B25034007",
  "B25034008",
  "B25034009",
  "B25034010",
  "B25034011",
] as const;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_TARGETS = 12;

interface TargetCounty {
  capturePath: string;
  countyFips: string;
  label: string;
  stateFips: string;
}

interface TractCentroid {
  latitude: number;
  longitude: number;
  name: string;
  polygon: TractPolygon | null;
  tractFips: string;
}

interface TractPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

interface AreaPlaceContext {
  city: string;
  neighborhood: string;
  postcode: string;
}

interface CountyIntel {
  capturePath: string;
  countyFips: string;
  label: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  targetCount: number;
  totalHousingUnits: number;
}

export interface DeskAreaTarget {
  capturePath: string;
  countyFips: string;
  countyLabel: string;
  firstMove: string;
  geometry: TractPolygon | null;
  id: string;
  latitude: number;
  longitude: number;
  mailingAudience: string;
  mailingCity: string;
  mailingOffer: string;
  mailingRouteName: string;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  postalCode: string;
  priorityScore: number;
  recommendedMailerCount: number;
  totalHousingUnits: number;
  tractLabel: string;
  why: string;
}

export interface DeskAreaIntelBody {
  counties: CountyIntel[];
  error?: string;
  generatedAt: string;
  ok: boolean;
  release: string;
  source: string;
  targets: DeskAreaTarget[];
}

export interface DeskAreaIntelResult {
  body: DeskAreaIntelBody;
  status: number;
}

const TARGET_COUNTIES: readonly TargetCounty[] = [
  {
    capturePath: "/estimate",
    countyFips: "491",
    label: "Williamson County",
    stateFips: "48",
  },
  {
    capturePath: "/estimate",
    countyFips: "027",
    label: "Bell County",
    stateFips: "48",
  },
  {
    capturePath: "/estimate",
    countyFips: "309",
    label: "McLennan County",
    stateFips: "48",
  },
  {
    capturePath: "/estimate",
    countyFips: "453",
    label: "Travis County",
    stateFips: "48",
  },
  {
    capturePath: "/estimate",
    countyFips: "209",
    label: "Hays County",
    stateFips: "48",
  },
] as const;

let cached: {
  body: DeskAreaIntelBody;
  expiresAt: number;
  placeDataKey: string;
} | null = null;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberValue = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeRatio = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
};

const round = (value: number): number => Math.round(value);

const percent = (value: number): number => Math.round(value * 1000) / 10;

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Area data request failed: ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const censusReporterUrl = (county: TargetCounty): string => {
  const params = new URLSearchParams({
    geo_ids: `140|05000US${county.stateFips}${county.countyFips}`,
    table_ids: `${OWNER_TABLE},${AGE_TABLE}`,
  });
  return `${CENSUS_REPORTER_URL}/latest?${params.toString()}`;
};

const tigerUrl = (county: TargetCounty): string => {
  const params = new URLSearchParams({
    f: "json",
    geometryPrecision: "5",
    outFields: "GEOID,NAME,BASENAME,INTPTLAT,INTPTLON",
    outSR: "4326",
    returnGeometry: "true",
    where: `STATE='${county.stateFips}' AND COUNTY='${county.countyFips}'`,
  });
  return `${TIGER_TRACTS_URL}?${params.toString()}`;
};

const estimate = (
  tractRecord: Record<string, unknown>,
  tableId: string,
  columnId: string
): number => {
  const table = asRecord(tractRecord[tableId]);
  const estimates = asRecord(table.estimate);
  return numberValue(estimates[columnId]);
};

const tractFipsFromReporterId = (geoId: string): string =>
  geoId.replace("14000US", "");

const parseRing = (ring: unknown): number[][] => {
  if (!Array.isArray(ring)) {
    return [];
  }

  const points: number[][] = [];
  for (const point of ring) {
    if (!Array.isArray(point)) {
      continue;
    }
    const longitude = numberValue(point[0]);
    const latitude = numberValue(point[1]);
    if (!(longitude && latitude)) {
      continue;
    }
    points.push([longitude, latitude]);
  }
  return points;
};

const parsePolygon = (feature: unknown): TractPolygon | null => {
  const geometry = asRecord(asRecord(feature).geometry);
  const { rings } = geometry;
  if (!Array.isArray(rings)) {
    return null;
  }

  const coordinates: number[][][] = [];
  for (const ring of rings) {
    const parsedRing = parseRing(ring);
    if (parsedRing.length >= 4) {
      coordinates.push(parsedRing);
    }
  }

  if (coordinates.length === 0) {
    return null;
  }

  return { coordinates, type: "Polygon" };
};

const parseCentroids = (payload: unknown): Map<string, TractCentroid> => {
  const centroids = new Map<string, TractCentroid>();
  const { features } = asRecord(payload);
  if (!Array.isArray(features)) {
    return centroids;
  }

  for (const feature of features) {
    const attributes = asRecord(asRecord(feature).attributes);
    const tractFips = String(attributes.GEOID ?? "");
    const latitude = numberValue(attributes.INTPTLAT);
    const longitude = numberValue(attributes.INTPTLON);
    if (!(tractFips && latitude && longitude)) {
      continue;
    }
    centroids.set(tractFips, {
      latitude,
      longitude,
      name: String(attributes.NAME ?? `Census tract ${tractFips}`),
      polygon: parsePolygon(feature),
      tractFips,
    });
  }
  return centroids;
};

const releaseName = (payload: unknown): string => {
  const release = asRecord(asRecord(payload).release);
  return String(release.name ?? "ACS latest");
};

const moveForCounty = (county: TargetCounty): string => {
  if (county.countyFips === "491") {
    return "Start with the estimate page, one postcard route, and a neighborhood post.";
  }
  if (county.countyFips === "027") {
    return "Use partner email plus a repair-or-replace post before paid mail.";
  }
  if (county.countyFips === "309") {
    return "Warm the area with inspection education and one short trust-building video.";
  }
  return "Use an estimate post and save paid outreach for the highest-scoring tracts.";
};

const mapboxToken = (): string =>
  process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
  process.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ||
  "";

const placeDataKey = (): string => (mapboxToken() ? "mapbox" : "fallback");

const mapboxReverseUrl = (longitude: number, latitude: number): string => {
  const params = new URLSearchParams({
    access_token: mapboxToken(),
    country: "US",
    language: "en",
    types: "neighborhood,place,postcode",
  });
  return `${MAPBOX_REVERSE_URL}/${longitude},${latitude}.json?${params.toString()}`;
};

const placeTypeIncludes = (
  feature: Record<string, unknown>,
  type: string
): boolean =>
  Array.isArray(feature.place_type) && feature.place_type.includes(type);

const featureText = (feature: Record<string, unknown>): string =>
  String(feature.text ?? feature.place_name ?? "").trim();

const placeContextFromMapbox = (payload: unknown): AreaPlaceContext => {
  const context: AreaPlaceContext = {
    city: "",
    neighborhood: "",
    postcode: "",
  };
  const { features } = asRecord(payload);
  if (!Array.isArray(features)) {
    return context;
  }

  for (const featureValue of features) {
    const feature = asRecord(featureValue);
    const text = featureText(feature);
    if (!text) {
      continue;
    }
    if (!context.neighborhood && placeTypeIncludes(feature, "neighborhood")) {
      context.neighborhood = text;
    }
    if (!context.city && placeTypeIncludes(feature, "place")) {
      context.city = text;
    }
    if (!context.postcode && placeTypeIncludes(feature, "postcode")) {
      context.postcode = text;
    }
  }

  return context;
};

const fallbackPlaceContext = (target: DeskAreaTarget): AreaPlaceContext => ({
  city: target.countyLabel.replace(" County", ""),
  neighborhood: "",
  postcode: "",
});

const loadPlaceContext = async (
  target: DeskAreaTarget
): Promise<AreaPlaceContext> => {
  if (!mapboxToken()) {
    return fallbackPlaceContext(target);
  }

  try {
    const payload = await fetchJson(
      mapboxReverseUrl(target.longitude, target.latitude)
    );
    const context = placeContextFromMapbox(payload);
    return {
      city: context.city || fallbackPlaceContext(target).city,
      neighborhood: context.neighborhood,
      postcode: context.postcode,
    };
  } catch {
    return fallbackPlaceContext(target);
  }
};

const recommendedMailerCount = (target: DeskAreaTarget): number => {
  const sized = Math.round(target.olderHomeEstimate * 0.65);
  return Math.min(2500, Math.max(400, sized));
};

const mailingOfferForCounty = (county: TargetCounty): string => {
  if (county.countyFips === "491") {
    return "Free roof-age check for Georgetown-area homeowners";
  }
  if (county.countyFips === "027") {
    return "Repair-or-replace second opinion before filing a claim";
  }
  if (county.countyFips === "309") {
    return "Plain-English roof check before small problems get expensive";
  }
  return "Free roof check for older owner-occupied homes";
};

const buildTarget = (
  county: TargetCounty,
  tractGeoId: string,
  tractRecord: Record<string, unknown>,
  centroid: TractCentroid
): DeskAreaTarget => {
  const occupiedTotal = estimate(tractRecord, OWNER_TABLE, OWNER_TOTAL);
  const ownerOccupied = estimate(tractRecord, OWNER_TABLE, OWNER_OCCUPIED);
  const totalHousingUnits = estimate(tractRecord, AGE_TABLE, HOUSING_TOTAL);
  const olderHomes = BUILT_BEFORE_2010_COLUMNS.reduce(
    (sum, columnId) => sum + estimate(tractRecord, AGE_TABLE, columnId),
    0
  );
  const ownerOccupiedShare = safeRatio(ownerOccupied, occupiedTotal);
  const olderHomeShare = safeRatio(olderHomes, totalHousingUnits);
  const olderHomeEstimate = ownerOccupied * olderHomeShare;
  const rawScore =
    olderHomeEstimate + ownerOccupiedShare * 1200 + olderHomeShare * 900;

  return {
    capturePath: county.capturePath,
    countyFips: county.countyFips,
    countyLabel: county.label,
    firstMove: moveForCounty(county),
    geometry: centroid.polygon,
    id: tractGeoId,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    mailingAudience: "Owner-occupied homes likely built before 2010",
    mailingCity: "",
    mailingOffer: mailingOfferForCounty(county),
    mailingRouteName: `${centroid.name} estimate route`,
    neighborhoodLabel: "",
    olderHomeEstimate: round(olderHomeEstimate),
    olderHomeShare: percent(olderHomeShare),
    ownerOccupied: round(ownerOccupied),
    ownerOccupiedShare: percent(ownerOccupiedShare),
    postalCode: "",
    priorityScore: round(rawScore),
    recommendedMailerCount: 0,
    totalHousingUnits: round(totalHousingUnits),
    tractLabel: centroid.name,
    why: `${round(olderHomeEstimate).toLocaleString()} likely owner-occupied homes built before 2010.`,
  };
};

const countySummary = (
  county: TargetCounty,
  targets: DeskAreaTarget[]
): CountyIntel => {
  const ownerOccupied = targets.reduce(
    (sum, target) => sum + target.ownerOccupied,
    0
  );
  const totalHousingUnits = targets.reduce(
    (sum, target) => sum + target.totalHousingUnits,
    0
  );
  const olderHomeEstimate = targets.reduce(
    (sum, target) => sum + target.olderHomeEstimate,
    0
  );
  return {
    capturePath: county.capturePath,
    countyFips: county.countyFips,
    label: county.label,
    olderHomeEstimate,
    olderHomeShare: percent(safeRatio(olderHomeEstimate, ownerOccupied)),
    ownerOccupied,
    ownerOccupiedShare: percent(safeRatio(ownerOccupied, totalHousingUnits)),
    targetCount: targets.length,
    totalHousingUnits,
  };
};

const rankByPriority = (
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  const ranked: DeskAreaTarget[] = [];

  for (const target of targets) {
    const insertionIndex = ranked.findIndex(
      (rankedTarget) => rankedTarget.priorityScore < target.priorityScore
    );

    if (insertionIndex === -1) {
      ranked.push(target);
      continue;
    }

    ranked.splice(insertionIndex, 0, target);
  }

  return ranked;
};

const enrichTarget = async (
  target: DeskAreaTarget
): Promise<DeskAreaTarget> => {
  const context = await loadPlaceContext(target);
  const neighborhoodLabel =
    context.neighborhood ||
    `${target.tractLabel}, ${target.countyLabel.replace(" County", "")}`;

  return {
    ...target,
    mailingCity: context.city,
    mailingRouteName: `${neighborhoodLabel} estimate route`,
    neighborhoodLabel,
    postalCode: context.postcode,
    recommendedMailerCount: recommendedMailerCount(target),
  };
};

const loadCountyIntel = async (
  county: TargetCounty
): Promise<{
  county: CountyIntel;
  release: string;
  targets: DeskAreaTarget[];
}> => {
  const [censusPayload, tigerPayload] = await Promise.all([
    fetchJson(censusReporterUrl(county)),
    fetchJson(tigerUrl(county)),
  ]);
  const centroids = parseCentroids(tigerPayload);
  const data = asRecord(asRecord(censusPayload).data);
  const targets: DeskAreaTarget[] = [];

  for (const [reporterId, tractValue] of Object.entries(data)) {
    const tractFips = tractFipsFromReporterId(reporterId);
    const centroid = centroids.get(tractFips);
    if (!centroid) {
      continue;
    }
    targets.push(
      buildTarget(county, tractFips, asRecord(tractValue), centroid)
    );
  }

  const viableTargets = rankByPriority(
    targets.filter(
      (target) =>
        target.ownerOccupied >= 350 &&
        target.olderHomeEstimate >= 250 &&
        target.totalHousingUnits >= 500
    )
  );

  return {
    county: countySummary(county, viableTargets),
    release: releaseName(censusPayload),
    targets: viableTargets.slice(0, 4),
  };
};

const normalizeScores = (targets: DeskAreaTarget[]): DeskAreaTarget[] => {
  const maxScore = Math.max(
    ...targets.map((target) => target.priorityScore),
    1
  );
  return targets.map((target) => ({
    ...target,
    priorityScore: Math.max(
      1,
      Math.round((target.priorityScore / maxScore) * 100)
    ),
  }));
};

const loadAreaIntel = async (): Promise<DeskAreaIntelBody> => {
  const results = await Promise.all(TARGET_COUNTIES.map(loadCountyIntel));
  const rankedTargets = normalizeScores(
    rankByPriority(results.flatMap((result) => result.targets))
  ).slice(0, MAX_TARGETS);
  const targets = await Promise.all(rankedTargets.map(enrichTarget));

  return {
    counties: results.map((result) => result.county),
    generatedAt: new Date().toISOString(),
    ok: true,
    release: results[0]?.release ?? "ACS latest",
    source:
      "Census Reporter ACS housing tables + Census TigerWeb tract centroids",
    targets,
  };
};

export const getDeskAreaIntel = async (): Promise<DeskAreaIntelResult> => {
  const now = Date.now();
  const activePlaceDataKey = placeDataKey();
  if (
    cached &&
    cached.expiresAt > now &&
    cached.placeDataKey === activePlaceDataKey
  ) {
    return { body: cached.body, status: 200 };
  }

  try {
    const body = await loadAreaIntel();
    cached = {
      body,
      expiresAt: now + CACHE_TTL_MS,
      placeDataKey: activePlaceDataKey,
    };
    return { body, status: 200 };
  } catch (error) {
    return {
      body: {
        counties: [],
        error:
          error instanceof Error
            ? error.message
            : "Could not load area intelligence.",
        generatedAt: new Date().toISOString(),
        ok: false,
        release: "Unavailable",
        source:
          "Census Reporter ACS housing tables + Census TigerWeb tract centroids",
        targets: [],
      },
      status: 502,
    };
  }
};
