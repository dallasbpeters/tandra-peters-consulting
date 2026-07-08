const CENSUS_REPORTER_URL = "https://api.censusreporter.org/1.0/data/show";
const TIGER_TRACTS_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7/query";
const AUSTIN_NEIGHBORHOODS_URL =
  "https://data.austintexas.gov/resource/a7ap-j2yt.geojson";

const AUSTIN_CITY_GEO_ID = "16000US4805000";
const STATE_FIPS = "48";

const INCOME_TABLE = "B19013";
const MEDIAN_YEAR_BUILT_TABLE = "B25035";
const OWNER_TABLE = "B25003";
const AGE_TABLE = "B25034";

const MEDIAN_INCOME = "B19013001";
const MEDIAN_YEAR_BUILT = "B25035001";
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
const MAX_NEAREST_TRACT_MILES = 1.2;
const MAX_RECOMMENDED_MAILERS = 3500;
const MIN_RECOMMENDED_MAILERS = 150;
const SQMI_PER_SQ_METER = 0.000000386102;

const COUNTY_LABELS: Record<string, string> = {
  "021": "Bastrop County",
  "209": "Hays County",
  "453": "Travis County",
  "491": "Williamson County",
};

type Coordinate = [number, number];

interface PolygonGeometry {
  coordinates: number[][][];
  type: "Polygon";
}

interface MultiPolygonGeometry {
  coordinates: number[][][][];
  type: "MultiPolygon";
}

type AreaGeometry = MultiPolygonGeometry | PolygonGeometry;

interface NeighborhoodBoundary {
  geometry: AreaGeometry;
  id: string;
  name: string;
  squareMiles: number | null;
}

interface TractCentroid {
  geometry: PolygonGeometry | null;
  latitude: number;
  longitude: number;
  name: string;
  tractFips: string;
}

interface TractSignal extends TractCentroid {
  countyFips: string;
  medianIncome: number | null;
  medianYearBuilt: number | null;
  occupiedTotal: number;
  olderHomes: number;
  ownerOccupied: number;
  totalHousingUnits: number;
}

interface MatchedTracts {
  method: string;
  signals: TractSignal[];
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
  dataMethod: string;
  dataStatus: string;
  firstMove: string;
  geometry: AreaGeometry | null;
  id: string;
  latitude: number;
  longitude: number;
  mailingAudience: string;
  mailingCity: string;
  mailingOffer: string;
  mailingRouteName: string;
  medianHomeAge: number | null;
  medianIncome: number | null;
  medianYearBuilt: number | null;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  olderHomeShare: number;
  ownerOccupied: number;
  ownerOccupiedShare: number;
  postalCode: string;
  priorityScore: number;
  recommendedMailerCount: number;
  squareMiles: number | null;
  totalHousingUnits: number;
  tractCount: number;
  tractLabel: string;
  why: string;
}

export interface DeskAreaIntelBody {
  counties: CountyIntel[];
  error?: string;
  generatedAt: string;
  ok: boolean;
  release: string;
  rentcastReady: boolean;
  source: string;
  targets: DeskAreaTarget[];
}

export interface DeskAreaIntelResult {
  body: DeskAreaIntelBody;
  status: number;
}

let cached: {
  body: DeskAreaIntelBody;
  expiresAt: number;
} | null = null;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberValue = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const positiveNumberValue = (value: unknown): number | null => {
  const parsed = numberValue(value);
  return parsed > 0 ? parsed : null;
};

const safeRatio = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
};

const round = (value: number): number => Math.round(value);

const percent = (value: number): number => Math.round(value * 1000) / 10;

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : ""
    )
    .join(" ");

const rentcastReady = (): boolean => Boolean(process.env.RENTCAST_API_KEY);

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Area data request failed: ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const neighborhoodsUrl = (): string => {
  const params = new URLSearchParams({ $limit: "5000" });
  return `${AUSTIN_NEIGHBORHOODS_URL}?${params.toString()}`;
};

const censusReporterUrl = (): string => {
  const params = new URLSearchParams({
    geo_ids: `140|${AUSTIN_CITY_GEO_ID}`,
    table_ids: [
      INCOME_TABLE,
      MEDIAN_YEAR_BUILT_TABLE,
      AGE_TABLE,
      OWNER_TABLE,
    ].join(","),
  });
  return `${CENSUS_REPORTER_URL}/latest?${params.toString()}`;
};

const tigerUrl = (countyFips: string): string => {
  const params = new URLSearchParams({
    f: "json",
    geometryPrecision: "5",
    outFields: "GEOID,NAME,BASENAME,INTPTLAT,INTPTLON",
    outSR: "4326",
    returnGeometry: "true",
    where: `STATE='${STATE_FIPS}' AND COUNTY='${countyFips}'`,
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

const positiveEstimate = (
  tractRecord: Record<string, unknown>,
  tableId: string,
  columnId: string
): number | null => {
  const table = asRecord(tractRecord[tableId]);
  const estimates = asRecord(table.estimate);
  return positiveNumberValue(estimates[columnId]);
};

const tractFipsFromReporterId = (geoId: string): string =>
  geoId.replace("14000US", "");

const countyFipsFromTract = (tractFips: string): string =>
  tractFips.slice(2, 5);

const parsePosition = (value: unknown): Coordinate | null => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  const longitude = numberValue(value[0]);
  const latitude = numberValue(value[1]);
  if (!(Number.isFinite(longitude) && Number.isFinite(latitude))) {
    return null;
  }
  return [longitude, latitude];
};

const parseRing = (ring: unknown): number[][] => {
  if (!Array.isArray(ring)) {
    return [];
  }

  const points: number[][] = [];
  for (const point of ring) {
    const parsed = parsePosition(point);
    if (parsed) {
      points.push(parsed);
    }
  }
  return points;
};

const parsePolygonCoordinates = (value: unknown): number[][][] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const coordinates: number[][][] = [];
  for (const ring of value) {
    const parsedRing = parseRing(ring);
    if (parsedRing.length >= 4) {
      coordinates.push(parsedRing);
    }
  }
  return coordinates;
};

const parseMultiPolygonCoordinates = (value: unknown): number[][][][] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const coordinates: number[][][][] = [];
  for (const polygon of value) {
    const parsedPolygon = parsePolygonCoordinates(polygon);
    if (parsedPolygon.length > 0) {
      coordinates.push(parsedPolygon);
    }
  }
  return coordinates;
};

const parseGeoJsonGeometry = (value: unknown): AreaGeometry | null => {
  const geometry = asRecord(value);
  if (geometry.type === "Polygon") {
    const coordinates = parsePolygonCoordinates(geometry.coordinates);
    return coordinates.length > 0 ? { coordinates, type: "Polygon" } : null;
  }
  if (geometry.type === "MultiPolygon") {
    const coordinates = parseMultiPolygonCoordinates(geometry.coordinates);
    return coordinates.length > 0
      ? { coordinates, type: "MultiPolygon" }
      : null;
  }
  return null;
};

const parseTigerPolygon = (feature: unknown): PolygonGeometry | null => {
  const geometry = asRecord(asRecord(feature).geometry);
  const coordinates = parsePolygonCoordinates(geometry.rings);
  if (coordinates.length === 0) {
    return null;
  }
  return { coordinates, type: "Polygon" };
};

const geometryPoints = (geometry: AreaGeometry): Coordinate[] => {
  const points: Coordinate[] = [];
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const point of ring) {
        const parsed = parsePosition(point);
        if (parsed) {
          points.push(parsed);
        }
      }
    }
  }

  return points;
};

const geometryCenter = (geometry: AreaGeometry): Coordinate => {
  const points = geometryPoints(geometry);
  if (points.length === 0) {
    return [-97.7431, 30.2672];
  }

  let minLongitude = points[0]?.[0] ?? -97.7431;
  let maxLongitude = minLongitude;
  let minLatitude = points[0]?.[1] ?? 30.2672;
  let maxLatitude = minLatitude;

  for (const [longitude, latitude] of points) {
    minLongitude = Math.min(minLongitude, longitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }

  return [(minLongitude + maxLongitude) / 2, (minLatitude + maxLatitude) / 2];
};

const pointInRing = (point: Coordinate, ring: number[][]): boolean => {
  let inside = false;
  const [longitude, latitude] = point;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (!(currentPoint && previousPoint)) {
      continue;
    }
    const [currentLongitude, currentLatitude] = currentPoint;
    const [previousLongitude, previousLatitude] = previousPoint;
    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;
    const crossingLongitude =
      ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude || Number.EPSILON) +
      currentLongitude;
    if (crossesLatitude && longitude < crossingLongitude) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInPolygon = (point: Coordinate, polygon: number[][][]): boolean => {
  const exterior = polygon[0];
  if (!(exterior && pointInRing(point, exterior))) {
    return false;
  }

  for (const hole of polygon.slice(1)) {
    if (pointInRing(point, hole)) {
      return false;
    }
  }

  return true;
};

const pointInGeometry = (
  point: Coordinate,
  geometry: AreaGeometry
): boolean => {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInPolygon(point, polygon));
};

const milesBetween = (first: Coordinate, second: Coordinate): number => {
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;
  const latitudeMiles = (firstLatitude - secondLatitude) * 69;
  const longitudeMiles =
    (firstLongitude - secondLongitude) *
    Math.cos(((firstLatitude + secondLatitude) / 2 / 180) * Math.PI) *
    69.172;
  return Math.hypot(latitudeMiles, longitudeMiles);
};

const releaseName = (payload: unknown): string => {
  const release = asRecord(asRecord(payload).release);
  return String(release.name ?? "ACS latest");
};

const parseNeighborhoods = (payload: unknown): NeighborhoodBoundary[] => {
  const { features } = asRecord(payload);
  if (!Array.isArray(features)) {
    return [];
  }

  const neighborhoods: NeighborhoodBoundary[] = [];
  for (const feature of features) {
    const properties = asRecord(asRecord(feature).properties);
    const geometry = parseGeoJsonGeometry(asRecord(feature).geometry);
    const name = String(properties.neighname ?? "").trim();
    const id = String(properties.fid ?? properties.target_fid ?? name).trim();
    if (!(geometry && name && id)) {
      continue;
    }
    const shapeAreaSquareMiles =
      (positiveNumberValue(properties.shape_area) ?? 0) * SQMI_PER_SQ_METER;
    const squareMiles =
      positiveNumberValue(properties.sqmiles) ||
      (shapeAreaSquareMiles > 0 ? shapeAreaSquareMiles : null);
    neighborhoods.push({
      geometry,
      id: `austin-neighborhood-${id}`,
      name: titleCase(name),
      squareMiles,
    });
  }

  return neighborhoods.toSorted((first, second) =>
    first.name.localeCompare(second.name)
  );
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
      geometry: parseTigerPolygon(feature),
      latitude,
      longitude,
      name: String(attributes.NAME ?? `Census tract ${tractFips}`),
      tractFips,
    });
  }
  return centroids;
};

const parseTractSignals = (
  censusPayload: unknown,
  centroids: Map<string, TractCentroid>
): TractSignal[] => {
  const data = asRecord(asRecord(censusPayload).data);
  const signals: TractSignal[] = [];

  for (const [reporterId, tractValue] of Object.entries(data)) {
    const tractFips = tractFipsFromReporterId(reporterId);
    const centroid = centroids.get(tractFips);
    if (!centroid) {
      continue;
    }
    const tractRecord = asRecord(tractValue);
    const totalHousingUnits = estimate(tractRecord, AGE_TABLE, HOUSING_TOTAL);
    const olderHomes = BUILT_BEFORE_2010_COLUMNS.reduce(
      (sum, columnId) => sum + estimate(tractRecord, AGE_TABLE, columnId),
      0
    );
    signals.push({
      ...centroid,
      countyFips: countyFipsFromTract(tractFips),
      medianIncome: positiveEstimate(tractRecord, INCOME_TABLE, MEDIAN_INCOME),
      medianYearBuilt: positiveEstimate(
        tractRecord,
        MEDIAN_YEAR_BUILT_TABLE,
        MEDIAN_YEAR_BUILT
      ),
      occupiedTotal: estimate(tractRecord, OWNER_TABLE, OWNER_TOTAL),
      olderHomes,
      ownerOccupied: estimate(tractRecord, OWNER_TABLE, OWNER_OCCUPIED),
      totalHousingUnits,
    });
  }

  return signals;
};

const countyFipsInCensusPayload = (payload: unknown): string[] => {
  const data = asRecord(asRecord(payload).data);
  const counties = new Set<string>();
  for (const reporterId of Object.keys(data)) {
    counties.add(countyFipsFromTract(tractFipsFromReporterId(reporterId)));
  }
  return [...counties].toSorted();
};

const weightedAverage = (
  signals: readonly TractSignal[],
  signalValue: (signal: TractSignal) => number | null,
  signalWeight: (signal: TractSignal) => number
): number | null => {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const value = signalValue(signal);
    const weight = signalWeight(signal);
    if (value === null || weight <= 0) {
      continue;
    }
    weightedSum += value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
};

const matchedTractsForNeighborhood = (
  neighborhood: NeighborhoodBoundary,
  signals: readonly TractSignal[]
): MatchedTracts => {
  const centroidMatches = signals.filter((signal) =>
    pointInGeometry([signal.longitude, signal.latitude], neighborhood.geometry)
  );
  if (centroidMatches.length > 0) {
    return {
      method: "ACS tract centroid inside neighborhood",
      signals: centroidMatches,
    };
  }

  const center = geometryCenter(neighborhood.geometry);
  const containingMatches = signals.filter(
    (signal) => signal.geometry && pointInGeometry(center, signal.geometry)
  );
  if (containingMatches.length > 0) {
    return {
      method: "Neighborhood center inside ACS tract geometry",
      signals: containingMatches,
    };
  }

  let nearest: TractSignal | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const signal of signals) {
    const distance = milesBetween(center, [signal.longitude, signal.latitude]);
    if (distance < nearestDistance) {
      nearest = signal;
      nearestDistance = distance;
    }
  }

  if (nearest && nearestDistance <= MAX_NEAREST_TRACT_MILES) {
    return {
      method: `Nearest ACS tract centroid (${nearestDistance.toFixed(1)} mi)`,
      signals: [nearest],
    };
  }

  return { method: "No ACS tract match", signals: [] };
};

const majorityCountyFips = (signals: readonly TractSignal[]): string => {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    counts.set(signal.countyFips, (counts.get(signal.countyFips) ?? 0) + 1);
  }

  let bestCounty = "453";
  let bestCount = 0;
  for (const [countyFips, count] of counts) {
    if (count > bestCount) {
      bestCounty = countyFips;
      bestCount = count;
    }
  }
  return bestCounty;
};

const recommendedMailerCount = (
  olderHomeEstimate: number,
  ownerOccupied: number
): number => {
  if (olderHomeEstimate <= 0 || ownerOccupied <= 0) {
    return 0;
  }
  const sized = Math.round(olderHomeEstimate * 0.72);
  return Math.min(
    ownerOccupied,
    MAX_RECOMMENDED_MAILERS,
    Math.max(MIN_RECOMMENDED_MAILERS, sized)
  );
};

const moveForNeighborhood = (targetName: string): string =>
  `Pull property recipients for ${targetName}, then send a one-off roof-age postcard test before spending on broader ads.`;

const mailingOfferForNeighborhood = (targetName: string): string =>
  `Free roof-age check for ${targetName} homeowners`;

const dataStatusFor = (method: string, tractCount: number): string => {
  if (tractCount === 0) {
    return "No matching ACS tract data available for this city neighborhood boundary.";
  }
  return `${tractCount} ACS tract${tractCount === 1 ? "" : "s"} matched by ${method}.`;
};

const buildTarget = (
  neighborhood: NeighborhoodBoundary,
  matched: MatchedTracts
): DeskAreaTarget => {
  const center = geometryCenter(neighborhood.geometry);
  const ownerOccupied = matched.signals.reduce(
    (sum, signal) => sum + signal.ownerOccupied,
    0
  );
  const occupiedTotal = matched.signals.reduce(
    (sum, signal) => sum + signal.occupiedTotal,
    0
  );
  const totalHousingUnits = matched.signals.reduce(
    (sum, signal) => sum + signal.totalHousingUnits,
    0
  );
  const olderHomes = matched.signals.reduce(
    (sum, signal) => sum + signal.olderHomes,
    0
  );
  const olderHomeShare = safeRatio(olderHomes, totalHousingUnits);
  const ownerOccupiedShare = safeRatio(ownerOccupied, occupiedTotal);
  const olderHomeEstimate = round(ownerOccupied * olderHomeShare);
  const medianIncome = weightedAverage(
    matched.signals,
    (signal) => signal.medianIncome,
    (signal) => signal.occupiedTotal || signal.totalHousingUnits
  );
  const medianYearBuilt = weightedAverage(
    matched.signals,
    (signal) => signal.medianYearBuilt,
    (signal) => signal.totalHousingUnits
  );
  const countyFips = majorityCountyFips(matched.signals);
  const tractCount = matched.signals.length;
  const medianHomeAge =
    medianYearBuilt === null
      ? null
      : new Date().getFullYear() - medianYearBuilt;
  const incomeScore = Math.min(medianIncome ?? 0, 180_000) / 250;
  const rawScore =
    olderHomeEstimate +
    ownerOccupiedShare * 900 +
    olderHomeShare * 900 +
    incomeScore;

  return {
    capturePath: "/estimate",
    countyFips,
    countyLabel: COUNTY_LABELS[countyFips] ?? "Austin area",
    dataMethod: matched.method,
    dataStatus: dataStatusFor(matched.method, tractCount),
    firstMove: moveForNeighborhood(neighborhood.name),
    geometry: neighborhood.geometry,
    id: neighborhood.id,
    latitude: center[1],
    longitude: center[0],
    mailingAudience: "Owner-occupied homes likely built before 2010",
    mailingCity: "Austin",
    mailingOffer: mailingOfferForNeighborhood(neighborhood.name),
    mailingRouteName: `${neighborhood.name} postcard test`,
    medianHomeAge: medianHomeAge === null ? null : round(medianHomeAge),
    medianIncome: medianIncome === null ? null : round(medianIncome),
    medianYearBuilt: medianYearBuilt === null ? null : round(medianYearBuilt),
    neighborhoodLabel: neighborhood.name,
    olderHomeEstimate,
    olderHomeShare: percent(olderHomeShare),
    ownerOccupied: round(ownerOccupied),
    ownerOccupiedShare: percent(ownerOccupiedShare),
    postalCode: "",
    priorityScore: round(rawScore),
    recommendedMailerCount: recommendedMailerCount(
      olderHomeEstimate,
      ownerOccupied
    ),
    squareMiles:
      neighborhood.squareMiles === null
        ? null
        : Math.round(neighborhood.squareMiles * 100) / 100,
    totalHousingUnits: round(totalHousingUnits),
    tractCount,
    tractLabel:
      tractCount === 0
        ? "No ACS tract match"
        : `${tractCount} ACS tract${tractCount === 1 ? "" : "s"}`,
    why:
      medianIncome === null || medianYearBuilt === null
        ? dataStatusFor(matched.method, tractCount)
        : `${round(olderHomeEstimate).toLocaleString()} likely older owner homes, median build year ${round(medianYearBuilt)}, median household income $${round(medianIncome).toLocaleString()}.`,
  };
};

const countySummary = (targets: readonly DeskAreaTarget[]): CountyIntel[] => {
  const summaries = new Map<string, DeskAreaTarget[]>();
  for (const target of targets) {
    const values = summaries.get(target.countyFips) ?? [];
    values.push(target);
    summaries.set(target.countyFips, values);
  }

  return [...summaries.entries()]
    .map(([countyFips, countyTargets]) => {
      const ownerOccupied = countyTargets.reduce(
        (sum, target) => sum + target.ownerOccupied,
        0
      );
      const totalHousingUnits = countyTargets.reduce(
        (sum, target) => sum + target.totalHousingUnits,
        0
      );
      const olderHomeEstimate = countyTargets.reduce(
        (sum, target) => sum + target.olderHomeEstimate,
        0
      );
      return {
        capturePath: "/estimate",
        countyFips,
        label: COUNTY_LABELS[countyFips] ?? "Austin area",
        olderHomeEstimate,
        olderHomeShare: percent(safeRatio(olderHomeEstimate, ownerOccupied)),
        ownerOccupied,
        ownerOccupiedShare: percent(
          safeRatio(ownerOccupied, totalHousingUnits)
        ),
        targetCount: countyTargets.length,
        totalHousingUnits,
      };
    })
    .toSorted(
      (first, second) => second.olderHomeEstimate - first.olderHomeEstimate
    );
};

const rankByPriority = (targets: readonly DeskAreaTarget[]): DeskAreaTarget[] =>
  targets.toSorted((first, second) => {
    if (second.priorityScore !== first.priorityScore) {
      return second.priorityScore - first.priorityScore;
    }
    return first.neighborhoodLabel.localeCompare(second.neighborhoodLabel);
  });

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

const loadCentroids = async (
  countyFips: readonly string[]
): Promise<Map<string, TractCentroid>> => {
  const payloads = await Promise.all(
    countyFips.map((county) => fetchJson(tigerUrl(county)))
  );
  const centroids = new Map<string, TractCentroid>();
  for (const payload of payloads) {
    for (const [tractFips, centroid] of parseCentroids(payload)) {
      centroids.set(tractFips, centroid);
    }
  }
  return centroids;
};

const loadAreaIntel = async (): Promise<DeskAreaIntelBody> => {
  const [neighborhoodPayload, censusPayload] = await Promise.all([
    fetchJson(neighborhoodsUrl()),
    fetchJson(censusReporterUrl()),
  ]);
  const neighborhoods = parseNeighborhoods(neighborhoodPayload);
  const centroids = await loadCentroids(
    countyFipsInCensusPayload(censusPayload)
  );
  const signals = parseTractSignals(censusPayload, centroids);
  const targets = normalizeScores(
    rankByPriority(
      neighborhoods.map((neighborhood) =>
        buildTarget(
          neighborhood,
          matchedTractsForNeighborhood(neighborhood, signals)
        )
      )
    )
  );

  return {
    counties: countySummary(targets),
    generatedAt: new Date().toISOString(),
    ok: true,
    release: releaseName(censusPayload),
    rentcastReady: rentcastReady(),
    source:
      "City of Austin Neighborhood Reporting Areas + Census Reporter ACS tables B19013/B25035/B25034/B25003 + Census TigerWeb tract geometry",
    targets,
  };
};

export const getDeskAreaIntel = async (): Promise<DeskAreaIntelResult> => {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { body: cached.body, status: 200 };
  }

  try {
    const body = await loadAreaIntel();
    cached = {
      body,
      expiresAt: now + CACHE_TTL_MS,
    };
    return { body, status: 200 };
  } catch (error) {
    return {
      body: {
        counties: [],
        error:
          error instanceof Error
            ? error.message
            : "Could not load Austin neighborhood intelligence.",
        generatedAt: new Date().toISOString(),
        ok: false,
        release: "Unavailable",
        rentcastReady: rentcastReady(),
        source:
          "City of Austin Neighborhood Reporting Areas + Census Reporter ACS tables B19013/B25035/B25034/B25003 + Census TigerWeb tract geometry",
        targets: [],
      },
      status: 502,
    };
  }
};
