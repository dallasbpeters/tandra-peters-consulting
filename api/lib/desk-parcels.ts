/**
 * Texas County Appraisal District (CAD) ArcGIS parcel source.
 *
 * Live, per-county ArcGIS REST parcel queries that replace the paid RentCast
 * `/properties` API as the source of INDIVIDUAL property points inside a drawn
 * polygon (or radius / tract) zone. See `specs/property-data-source.md`.
 *
 * Why this exists / what it structurally fixes:
 *   - RentCast is radius-only, so a drawn polygon was approximated by a single
 *     centroid circle clamped to <= 1 mi and then lossily post-filtered — a
 *     1,400-piece polygon returned ~16 homes. ArcGIS accepts the drawn ring
 *     directly (`esriGeometryPolygon` + `spatialRel=esriSpatialRelIntersects`)
 *     and PAGINATES via `resultOffset`/`resultRecordCount`, so the full audience
 *     is returned with no centroid/radius clamp and no lossy post-filter.
 *
 * PII: the owner-occupancy signal is derived SERVER-SIDE from the homestead
 * value / homestead-exemption flag; owner NAME and raw owner MAILING address are
 * never requested into the emitted record — only the boolean proxy plus non-PII
 * situs fields leave this module. Keep `outFields` free of owner-name columns.
 *
 * Records are normalized to the SAME shape RentCast returned so the existing
 * mappers in `desk-direct-mail.ts` (`rosterHomeOf` / `recipientOf` /
 * `formattedAddressOf`) consume them unchanged.
 */

/**
 * Deliverable "home" = any residential land use with a built structure. Texas
 * SPTB state category codes: A1 single-family, A2 mobile/leased-land home, A3
 * condo/townhome, E1 rural land w/ residence. This is intentionally BROADER than
 * single-family A1: the headline MAIL PIECES number is the total deliverable
 * rooftops in the outline, not just older owner-occupied single-family — that
 * roof-age/owner audience is a downstream targeting refinement, not the headline.
 */
export const RESIDENTIAL_LAND_USE_CODES = ["A1", "A2", "A3", "E1"] as const;
/** A home counts as an (older) roof-age target when built on/before this year. */
export const OLDER_HOME_BUILT_ON_OR_BEFORE = 2009;
/** ArcGIS page size — servers cap ~1000–2000/query; paginate past it. */
const PARCEL_PAGE_SIZE = 1000;
/** Safety ceiling so a huge zone can't fan out into an unbounded fetch. */
export const PARCEL_FETCH_HARD_CAP = 5000;
/** Max pages regardless of cap (belt-and-suspenders against a bad server). */
const MAX_PARCEL_PAGES =
  Math.ceil(PARCEL_FETCH_HARD_CAP / PARCEL_PAGE_SIZE) + 1;
/** Circle/tract zones have no ring — approximate with an N-gon this many sides. */
const CIRCLE_RING_SEGMENTS = 48;
/** Default query radius for a tract selection that carries no explicit radius. */
const DEFAULT_TRACT_QUERY_RADIUS_MILES = 0.6;
const MILES_PER_DEGREE_LAT = 69;
/** In-process cache lifetime (short — county GIS data changes monthly at most). */
const CACHE_TTL_MS = 1000 * 60 * 10;

const HOMESTEAD_EXEMPTION = /(^|[,\s])HS([,\s]|$)/i;

/** Common, non-PII normalized parcel — mirrors the RentCast property shape. */
export interface NormalizedParcel {
  addressLine1: string;
  city: string;
  county: string;
  formattedAddress: string;
  id: string;
  landUseCode: string;
  latitude: number | null;
  longitude: number | null;
  /** Owner-occupancy PROXY (homestead present, or owner-mail == situs). */
  ownerOccupied: boolean;
  propertyType: string;
  squareFootage: number | null;
  state: string;
  yearBuilt: number | null;
  zipCode: string;
}

type Ring = [number, number][];

interface ArcgisGeometry {
  rings?: number[][][];
  x?: number;
  y?: number;
}

interface ArcgisFeature {
  attributes: Record<string, unknown>;
  geometry?: ArcgisGeometry;
}

interface CountySource {
  /** [minLng, minLat, maxLng, maxLat] — routes a zone to the right county(ies). */
  bbox: [number, number, number, number];
  /** True only for endpoints verified live with the targeting fields present. */
  confirmed: boolean;
  fips: string;
  key: string;
  label: string;
  /** ArcGIS attribute → normalized parcel. Returns null to drop the record. */
  normalize: (
    attributes: Record<string, unknown>
  ) => Omit<NormalizedParcel, "latitude" | "longitude"> | null;
  /** Field to sort by for STABLE pagination (usually the OID). */
  orderByField: string;
  outFields: string[];
  /** null when no live queryable endpoint is confirmed (skipped, never fails). */
  queryUrl: string | null;
  /** ArcGIS WHERE clause: deliverable residential homes (any age). */
  where: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const stringField = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

const numberField = (
  record: Record<string, unknown>,
  key: string
): number | null => {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && stringField(record, key) !== ""
    ? parsed
    : null;
};

const joinParts = (parts: readonly string[]): string =>
  parts.filter(Boolean).join(" ").replaceAll(/\s+/g, " ").trim();

/** First segment of a comma-separated situs string ("123 Main St, City, TX"). */
const streetFromSitus = (situs: string): string => {
  const [line1] = situs.split(",");
  return (line1 ?? "").trim();
};

const composedAddress = (line1: string, city: string, zip: string): string => {
  const cityState = [city, "TX"].filter(Boolean).join(", ");
  return joinParts([line1, cityState, zip].filter(Boolean));
};

const RESIDENTIAL_TYPE_LABELS: Record<string, string> = {
  A1: "Single Family",
  A2: "Mobile / Manufactured",
  A3: "Condo / Townhome",
  E1: "Rural Residence",
};

/** Human property type from a Texas SPTB code (defaults to single-family). */
const residentialType = (landUseCode: string): string =>
  RESIDENTIAL_TYPE_LABELS[landUseCode] ?? "Single Family";

// --- Travis (TCAD) — CONFIRMED live: TCAD_Parcels_Dec_2025 -------------------
// Fields verified live: situs_num/situs_street(_prefx/_suffix)/situs_city/
// situs_zip, land_state_cd ('A1'), F1year_imprv (year built), imprv_homesite_val
// (homestead value → owner-occupancy proxy). Owner name (py_owner_name) is
// intentionally NOT requested.
const normalizeTravis = (
  attributes: Record<string, unknown>
): Omit<NormalizedParcel, "latitude" | "longitude"> | null => {
  const line1 = joinParts([
    stringField(attributes, "situs_num"),
    stringField(attributes, "situs_street_prefx"),
    stringField(attributes, "situs_street"),
    stringField(attributes, "situs_street_suffix"),
  ]);
  const fallbackLine1 = streetFromSitus(
    stringField(attributes, "situs_address")
  );
  const addressLine1 = line1 || fallbackLine1;
  const zip = stringField(attributes, "situs_zip");
  if (!(addressLine1 && zip)) {
    return null;
  }
  const city = stringField(attributes, "situs_city") || "Austin";
  const homesiteValue = numberField(attributes, "imprv_homesite_val") ?? 0;
  const landUseCode = stringField(attributes, "land_state_cd") || "A1";
  return {
    addressLine1,
    city,
    county: "travis",
    formattedAddress: composedAddress(addressLine1, city, zip),
    id: `travis-${stringField(attributes, "PROP_ID")}`,
    landUseCode,
    ownerOccupied: homesiteValue > 0,
    propertyType: residentialType(landUseCode),
    squareFootage: null,
    state: "TX",
    yearBuilt: numberField(attributes, "F1year_imprv"),
    zipCode: zip,
  };
};

// --- Williamson (WCAD) — CONFIRMED live: county_wcad_parcels -----------------
// USEDSCRP='Residential' is the closest single-family class (no A1 state code
// exposed). RESYRBLT = year built; ExemptionList carries 'HS' (homestead) →
// owner-occupancy proxy, with owner-mail == situs as a fallback. Owner NAME
// columns (PrimaryOwner/OWNERNME1/FullName) are intentionally NOT requested;
// Mailing1 is read only to compute the proxy and is never emitted.
const normalizeWilliamson = (
  attributes: Record<string, unknown>
): Omit<NormalizedParcel, "latitude" | "longitude"> | null => {
  const situs =
    stringField(attributes, "SITEADDRESS") ||
    stringField(attributes, "SitusAddress");
  const addressLine1 = streetFromSitus(situs);
  const zip = stringField(attributes, "Szip");
  if (!(addressLine1 && zip)) {
    return null;
  }
  const city = stringField(attributes, "Scity") || "";
  const exemptions = stringField(attributes, "ExemptionList");
  const mailingStreet = streetFromSitus(stringField(attributes, "Mailing1"));
  const ownerOccupied =
    HOMESTEAD_EXEMPTION.test(exemptions) ||
    (mailingStreet !== "" &&
      mailingStreet.toLowerCase() === addressLine1.toLowerCase());
  return {
    addressLine1,
    city,
    county: "williamson",
    formattedAddress: composedAddress(addressLine1, city, zip),
    id: `williamson-${stringField(attributes, "PARCELID") || stringField(attributes, "OBJECTID")}`,
    landUseCode: "A1",
    ownerOccupied,
    propertyType: "Single Family",
    squareFootage: numberField(attributes, "TotalSqFtLivingArea"),
    state: "TX",
    yearBuilt: numberField(attributes, "RESYRBLT"),
    zipCode: zip,
  };
};

// --- Hays (HCAD) — NOT CONFIRMED --------------------------------------------
// No live ArcGIS layer with year-built + land-use + situs could be confirmed
// (the reachable Hays layers are either a raw CAD drawing export or owner/
// boundary-only). Kept in the registry so it can be wired later: fill in a
// verified `queryUrl`, confirm `outFields`, and flip `confirmed` to true. Until
// then it has no `queryUrl`, so a Hays-area zone simply returns no CAD parcels
// (graceful degradation) rather than hard-failing the request. The field map
// below assumes the same True Automation vendor schema Travis uses.
const normalizeHays = (
  attributes: Record<string, unknown>
): Omit<NormalizedParcel, "latitude" | "longitude"> | null => {
  const line1 =
    joinParts([
      stringField(attributes, "situs_num"),
      stringField(attributes, "situs_street"),
    ]) || streetFromSitus(stringField(attributes, "situs_address"));
  const zip = stringField(attributes, "situs_zip");
  if (!(line1 && zip)) {
    return null;
  }
  const city = stringField(attributes, "situs_city") || "";
  const homesiteValue = numberField(attributes, "imprv_homesite_val") ?? 0;
  const landUseCode = stringField(attributes, "land_state_cd") || "A1";
  return {
    addressLine1: line1,
    city,
    county: "hays",
    formattedAddress: composedAddress(line1, city, zip),
    id: `hays-${stringField(attributes, "PROP_ID")}`,
    landUseCode,
    ownerOccupied: homesiteValue > 0,
    propertyType: residentialType(landUseCode),
    squareFootage: null,
    state: "TX",
    yearBuilt: numberField(attributes, "F1year_imprv"),
    zipCode: zip,
  };
};

/**
 * Deliverable-home WHERE clause: a residential land use (`codes`) that carries a
 * built structure (`yearField > 0`, which also excludes vacant lots). Age is NOT
 * filtered here — the headline count is every deliverable rooftop; the roof-age
 * subset is computed downstream from each parcel's `yearBuilt`.
 */
const deliverableHomeClause = (
  landUseField: string,
  yearField: string,
  codes: readonly string[]
): string => {
  const list = codes.map((code) => `'${code}'`).join(", ");
  return `${landUseField} IN (${list}) AND ${yearField} > 0`;
};

/**
 * Per-county-FIPS registry. v1 wires Travis + Williamson (confirmed live) and
 * carries Hays as an unconfirmed placeholder. Add more counties by appending an
 * entry with a verified `queryUrl`, `outFields`, `where`, and `normalize` map.
 */
export const COUNTY_REGISTRY: readonly CountySource[] = [
  {
    bbox: [-98.17, 30.02, -97.37, 30.63],
    confirmed: true,
    fips: "48453",
    key: "travis",
    label: "Travis County",
    normalize: normalizeTravis,
    orderByField: "OBJECTID",
    outFields: [
      "PROP_ID",
      "situs_num",
      "situs_street_prefx",
      "situs_street",
      "situs_street_suffix",
      "situs_city",
      "situs_zip",
      "situs_address",
      "land_state_cd",
      "F1year_imprv",
      "imprv_homesite_val",
    ],
    queryUrl:
      "https://services1.arcgis.com/HGcSYZ5bvjRswoCb/arcgis/rest/services/TCAD_Parcels_Dec_2025/FeatureServer/0/query",
    where: deliverableHomeClause(
      "land_state_cd",
      "F1year_imprv",
      RESIDENTIAL_LAND_USE_CODES
    ),
  },
  {
    bbox: [-98.06, 30.44, -97.35, 30.95],
    confirmed: true,
    fips: "48491",
    key: "williamson",
    label: "Williamson County",
    normalize: normalizeWilliamson,
    orderByField: "OBJECTID",
    outFields: [
      "PARCELID",
      "OBJECTID",
      "SITEADDRESS",
      "SitusAddress",
      "Scity",
      "Szip",
      "Sstate",
      "USEDSCRP",
      "RESYRBLT",
      "ExemptionList",
      "TotalSqFtLivingArea",
      "Mailing1",
    ],
    queryUrl:
      "https://gis.wilco.org/arcgis/rest/services/public/county_wcad_parcels/MapServer/0/query",
    // WCAD exposes no A-code; `USEDSCRP='Residential'` is the residential class.
    // Any age (roof-age targeting is applied downstream), structure required.
    where: "USEDSCRP = 'Residential' AND RESYRBLT > 0",
  },
  {
    bbox: [-98.28, 29.83, -97.66, 30.29],
    confirmed: false,
    fips: "48209",
    key: "hays",
    label: "Hays County",
    normalize: normalizeHays,
    orderByField: "OBJECTID",
    outFields: [
      "PROP_ID",
      "situs_num",
      "situs_street",
      "situs_city",
      "situs_zip",
      "situs_address",
      "land_state_cd",
      "F1year_imprv",
      "imprv_homesite_val",
    ],
    // Unconfirmed: no verified live endpoint. See the note above normalizeHays.
    queryUrl: null,
    where: deliverableHomeClause(
      "land_state_cd",
      "F1year_imprv",
      RESIDENTIAL_LAND_USE_CODES
    ),
  },
];

const boundsOfRing = (ring: Ring): [number, number, number, number] | null => {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
};

const bboxesIntersect = (
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** Counties whose bbox intersects the given ring(s) AND have a live endpoint. */
export const countiesForRings = (rings: readonly Ring[]): CountySource[] => {
  const ringBoxes = rings
    .map(boundsOfRing)
    .filter((box): box is [number, number, number, number] => box !== null);
  if (ringBoxes.length === 0) {
    return [];
  }
  return COUNTY_REGISTRY.filter(
    (county) =>
      county.queryUrl !== null &&
      ringBoxes.some((box) => bboxesIntersect(box, county.bbox))
  );
};

/** Closed [lng, lat] ring approximating a circle of `radiusMiles` at a center. */
export const circleRing = (
  longitude: number,
  latitude: number,
  radiusMiles: number
): Ring => {
  const latRadius = radiusMiles / MILES_PER_DEGREE_LAT;
  const lngRadius =
    radiusMiles /
    (MILES_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180) || 1e-6);
  const ring: Ring = [];
  for (let index = 0; index < CIRCLE_RING_SEGMENTS; index++) {
    const angle = (index / CIRCLE_RING_SEGMENTS) * Math.PI * 2;
    ring.push([
      longitude + Math.cos(angle) * lngRadius,
      latitude + Math.sin(angle) * latRadius,
    ]);
  }
  ring.push([...ring[0]] as [number, number]);
  return ring;
};

/**
 * Parse a drawn polygon outline into a `[lng, lat]` ring. Accepts BOTH the
 * nested pair shape (`[[lng, lat], ...]`, what the map emits) and a flat
 * interleaved shape (`[lng, lat, lng, lat, ...]`) so a serialization that
 * flattens the ring still queries the real outline instead of silently falling
 * back to a centroid circle. Mirrors `zoneRingFrom` in `desk-direct-mail.ts`.
 */
const ringFromPolygon = (value: unknown): Ring | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const flat: number[] = [];
  for (const point of value) {
    if (Array.isArray(point) && point.length >= 2) {
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        flat.push(lng, lat);
      }
    } else {
      const num = Number(point);
      if (Number.isFinite(num)) {
        flat.push(num);
      }
    }
  }
  const ring: Ring = [];
  for (let index = 0; index + 1 < flat.length; index += 2) {
    ring.push([flat[index], flat[index + 1]]);
  }
  return ring.length >= 3 ? ring : null;
};

const coord = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

/**
 * Exterior ring(s) of a GeoJSON Polygon/MultiPolygon — the TRUE boundary of a
 * selected census tract / neighborhood. Using this (instead of a small centroid
 * circle) is what makes a selected zone count its whole footprint: a real tract
 * dwarfs a 0.6-mi circle, so the circle badly undercounts (e.g. 558 vs 1,506).
 */
const ringsFromGeoJson = (geometry: unknown): Ring[] => {
  const geo = asRecord(geometry);
  const rings: Ring[] = [];
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
    const exterior = ringFromPolygon(geo.coordinates[0]);
    if (exterior) {
      rings.push(exterior);
    }
  } else if (geo.type === "MultiPolygon" && Array.isArray(geo.coordinates)) {
    for (const polygon of geo.coordinates) {
      const exterior = ringFromPolygon(
        Array.isArray(polygon) ? polygon[0] : null
      );
      if (exterior) {
        rings.push(exterior);
      }
    }
  }
  return rings;
};

/**
 * Derive the ArcGIS query ring(s) from a request payload.
 *
 * Precedence (CAD queries the geometry natively, so it differs from the old
 * radius-only RentCast order):
 *   1. A drawn POLYGON zone is the authoritative outline — query it directly.
 *      This MUST win over `neighborhoods`, because a SAVED polygon target also
 *      carries the tracts its outline overlaps in `neighborhoods` (for the
 *      area estimate). Preferring those centroids would query small offset
 *      circles instead of the drawn shape, and the roster's point-in-polygon
 *      post-filter would then clip the result to a tiny sliver (the undercount
 *      bug: a 1,500-home polygon collapsing to ~20).
 *   2. Otherwise a tract/neighborhood selection (`neighborhoods[]`): query each
 *      one's TRUE boundary polygon when it carries `geometry`, falling back to a
 *      small centroid circle only when no boundary is available. Querying the
 *      real boundary is what fixes the selected-zone undercount (a tract is much
 *      larger than a 0.6-mi circle, so the circle collapses the count).
 *   3. Otherwise a radius/circle zone → a circle at its centroid.
 * Returns [] when the payload carries no usable geometry.
 */
export const deriveQueryRings = (payload: Record<string, unknown>): Ring[] => {
  const zone = asRecord(payload.zone);
  if (zone.kind === "polygon") {
    const ring = ringFromPolygon(zone.polygon);
    if (ring) {
      return [ring];
    }
  }
  const neighborhoods = Array.isArray(payload.neighborhoods)
    ? payload.neighborhoods.map(asRecord)
    : [];
  const neighborhoodRings: Ring[] = [];
  for (const item of neighborhoods) {
    const boundaryRings = ringsFromGeoJson(item.geometry);
    if (boundaryRings.length > 0) {
      neighborhoodRings.push(...boundaryRings);
      continue;
    }
    const centroidLng = coord(item, "longitude");
    const centroidLat = coord(item, "latitude");
    if (centroidLng !== null && centroidLat !== null) {
      neighborhoodRings.push(
        circleRing(
          centroidLng,
          centroidLat,
          coord(item, "radiusMiles") ?? DEFAULT_TRACT_QUERY_RADIUS_MILES
        )
      );
    }
  }
  if (neighborhoodRings.length > 0) {
    return neighborhoodRings;
  }
  const lng = coord(zone, "longitude");
  const lat = coord(zone, "latitude");
  if (lng !== null && lat !== null) {
    return [
      circleRing(
        lng,
        lat,
        coord(zone, "radiusMiles") ?? DEFAULT_TRACT_QUERY_RADIUS_MILES
      ),
    ];
  }
  return [];
};

/** Ensure the ring is closed (ArcGIS wants the first vertex repeated as last). */
const closedRing = (ring: Ring): number[][] => {
  const points = ring.map(([lng, lat]) => [lng, lat]);
  const first = points.at(0);
  const last = points.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    points.push([first[0], first[1]]);
  }
  return points;
};

const arcgisPolygonGeometry = (ring: Ring): string =>
  JSON.stringify({
    rings: [closedRing(ring)],
    spatialReference: { wkid: 4326 },
  });

/** bbox-center of a returned polygon (outSR=4326), or the point for point layers. */
const centroidOf = (
  geometry: ArcgisGeometry | undefined
): { latitude: number | null; longitude: number | null } => {
  if (!geometry) {
    return { latitude: null, longitude: null };
  }
  if (typeof geometry.x === "number" && typeof geometry.y === "number") {
    return { latitude: geometry.y, longitude: geometry.x };
  }
  const exterior = geometry.rings?.[0];
  if (!Array.isArray(exterior) || exterior.length === 0) {
    return { latitude: null, longitude: null };
  }
  const ring: Ring = [];
  for (const point of exterior) {
    if (Array.isArray(point) && point.length >= 2) {
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        ring.push([lng, lat]);
      }
    }
  }
  const box = boundsOfRing(ring);
  if (!box) {
    return { latitude: null, longitude: null };
  }
  return {
    latitude: (box[1] + box[3]) / 2,
    longitude: (box[0] + box[2]) / 2,
  };
};

const parcelQueryBody = (
  county: CountySource,
  ring: Ring,
  offset: number
): string => {
  const params = new URLSearchParams({
    f: "json",
    geometry: arcgisPolygonGeometry(ring),
    geometryType: "esriGeometryPolygon",
    inSR: "4326",
    orderByFields: county.orderByField,
    outFields: county.outFields.join(","),
    outSR: "4326",
    resultOffset: String(offset),
    resultRecordCount: String(PARCEL_PAGE_SIZE),
    returnGeometry: "true",
    spatialRel: "esriSpatialRelIntersects",
    where: county.where,
  });
  return params.toString();
};

const fetchParcelPage = async (
  county: CountySource,
  ring: Ring,
  offset: number
): Promise<ArcgisFeature[]> => {
  const response = await fetch(county.queryUrl as string, {
    body: parcelQueryBody(county, ring, offset),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`CAD parcel request failed: ${response.status}`);
  }
  const payload = asRecord(await response.json());
  if (payload.error) {
    throw new Error(`CAD parcel query error: ${JSON.stringify(payload.error)}`);
  }
  const features = payload.features;
  return Array.isArray(features) ? (features as ArcgisFeature[]) : [];
};

/**
 * Page a single county over a single ring until the server returns a short page
 * (exhausted), the page cap is hit, or the hard cap is reached. This is the
 * loop that replaces the old single non-paginated RentCast circle — the 16-cap
 * bug is gone because we keep advancing `resultOffset` past page one.
 */
const fetchCountyRing = async (
  county: CountySource,
  ring: Ring,
  limit: number
): Promise<NormalizedParcel[]> => {
  const parcels: NormalizedParcel[] = [];
  for (let page = 0; page < MAX_PARCEL_PAGES; page++) {
    const features = await fetchParcelPage(
      county,
      ring,
      page * PARCEL_PAGE_SIZE
    );
    for (const feature of features) {
      const base = county.normalize(asRecord(feature.attributes));
      if (base) {
        parcels.push({ ...base, ...centroidOf(feature.geometry) });
      }
    }
    if (features.length < PARCEL_PAGE_SIZE || parcels.length >= limit) {
      break;
    }
  }
  return parcels;
};

interface ParcelCacheEntry {
  expiresAt: number;
  parcels: NormalizedParcel[];
}

const parcelCache = new Map<string, ParcelCacheEntry>();

const roundCoord = (value: number): string => value.toFixed(4);

const cacheKeyFor = (county: CountySource, ring: Ring): string => {
  const box = boundsOfRing(ring);
  const bounds = box ? box.map(roundCoord).join(",") : "none";
  return `${county.key}|${ring.length}|${bounds}`;
};

/**
 * Fetch and normalize every deliverable residential parcel (any age) whose
 * geometry intersects the given ring(s), across all confirmed counties the
 * ring(s) touch. Deduped by parcel id, bounded by `hardCap`, cached briefly per
 * county+ring. Errors on any one county are swallowed so a single flaky GIS
 * server degrades gracefully instead of failing the whole request. Roof-age /
 * owner-occupancy targeting is a downstream refinement over `yearBuilt` /
 * `ownerOccupied`, not applied here.
 */
export const fetchParcelsInZone = async (
  rings: readonly Ring[],
  options: { hardCap?: number } = {}
): Promise<NormalizedParcel[]> => {
  const hardCap = options.hardCap ?? PARCEL_FETCH_HARD_CAP;
  const counties = countiesForRings(rings);
  if (counties.length === 0) {
    return [];
  }
  const byId = new Map<string, NormalizedParcel>();
  const now = Date.now();
  for (const county of counties) {
    for (const ring of rings) {
      if (byId.size >= hardCap) {
        break;
      }
      const cacheKey = cacheKeyFor(county, ring);
      const cached = parcelCache.get(cacheKey);
      let parcels: NormalizedParcel[];
      if (cached && cached.expiresAt > now) {
        parcels = cached.parcels;
      } else {
        try {
          parcels = await fetchCountyRing(county, ring, hardCap);
          parcelCache.set(cacheKey, {
            expiresAt: now + CACHE_TTL_MS,
            parcels,
          });
        } catch {
          // Degrade gracefully — skip this county/ring, keep the rest.
          parcels = [];
        }
      }
      for (const parcel of parcels) {
        if (!byId.has(parcel.id)) {
          byId.set(parcel.id, parcel);
        }
      }
    }
  }
  return [...byId.values()].slice(0, hardCap);
};

/** Convenience: derive rings from a request payload and fetch their parcels. */
export const fetchParcelsForPayload = async (
  payload: Record<string, unknown>,
  options: { hardCap?: number } = {}
): Promise<{ hasZone: boolean; parcels: NormalizedParcel[] }> => {
  const rings = deriveQueryRings(payload);
  if (rings.length === 0) {
    return { hasZone: false, parcels: [] };
  }
  return { hasZone: true, parcels: await fetchParcelsInZone(rings, options) };
};

/** Reset the in-process cache (tests only). */
export const clearParcelCache = (): void => {
  parcelCache.clear();
};
