import type { DeskAreaMapZonePoint } from "../components/desk-area-map";
import { averageValue } from "./desk-format";
import type {
  DeskAreaTarget,
  DeskTargetZone,
  SavedTargetZone,
  ZoneValidationResult,
} from "./desk-types";

export const DEFAULT_ZONE_RADIUS_MILES = 0.4;
export const MAX_STORED_ZONES = 8;
const MIN_ZONE_MAIL_PIECES = 35;
const MAX_ZONE_MAIL_PIECES = 275;
const MAX_ZONE_TARGET_COUNT = 5;

export const zoneRadiusOptions: readonly { label: string; value: number }[] = [
  { label: "0.25 mi", value: 0.25 },
  { label: "0.4 mi", value: DEFAULT_ZONE_RADIUS_MILES },
  { label: "0.6 mi", value: 0.6 },
] as const;

const METERS_PER_DEGREE_LAT = 111_320;
const SQ_METERS_PER_SQ_MILE = 2_589_988.11;

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

export const createZoneId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `zone-${Date.now().toString(36)}`;

export const zoneLabelFor = (
  zoneTargets: readonly DeskAreaTarget[],
  radiusMiles: number
): string => {
  const primary = zoneTargets[0]?.neighborhoodLabel ?? "Austin";
  return `${primary} ${radiusMiles} mi mail zone`;
};

export const selectedZoneTargets = (
  zone: DeskTargetZone | null,
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  if (!zone) {
    return [];
  }
  const zoneIds = new Set(zone.targetIds);
  return targets.filter((target) => zoneIds.has(target.id));
};

export { averageValue };

const zoneCircleAreaSqMiles = (radiusMiles: number): number =>
  Math.PI * radiusMiles * radiusMiles;

/** Approximate polygon area using a local equirectangular projection + shoelace. */
export const polygonAreaSqMiles = (
  ring: readonly [number, number][]
): number => {
  if (ring.length < 3) {
    return 0;
  }
  const latRef = degreesToRadians(
    ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  );
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos(latRef);
  let doubleArea = 0;
  for (let index = 0; index < ring.length; index++) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    const x1 = lng1 * metersPerDegreeLng;
    const y1 = lat1 * METERS_PER_DEGREE_LAT;
    const x2 = lng2 * metersPerDegreeLng;
    const y2 = lat2 * METERS_PER_DEGREE_LAT;
    doubleArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(doubleArea) / 2 / SQ_METERS_PER_SQ_MILE;
};

/** Ray-casting point-in-polygon test against a [lng, lat] ring. */
const pointInRing = (
  lng: number,
  lat: number,
  ring: readonly [number, number][]
): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
};

export const ringCentroid = (
  ring: readonly [number, number][]
): DeskAreaMapZonePoint => {
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({
      latitude: acc.latitude + lat,
      longitude: acc.longitude + lng,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / ring.length,
    longitude: sum.longitude / ring.length,
  };
};

/** Outer ring(s) of a tract's real boundary ([lng, lat]). Holes are ignored. */
const targetOuterRings = (target: DeskAreaTarget): [number, number][][] => {
  const geometry = target.geometry;
  if (!geometry) {
    return [];
  }
  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates[0];
    return outer ? [outer as [number, number][]] : [];
  }
  return geometry.coordinates
    .map((polygon) => polygon[0] as [number, number][])
    .filter((ring): ring is [number, number][] => Boolean(ring));
};

const pointInsideTarget = (
  lng: number,
  lat: number,
  target: DeskAreaTarget
): boolean =>
  targetOuterRings(target).some((ring) => pointInRing(lng, lat, ring));

/**
 * The single tract whose real boundary contains the clicked point. Never falls
 * back to a nearby tract by centroid distance — that produced the "phantom
 * neighborhood" the user could not deselect.
 */
export const targetContainingPoint = (
  point: DeskAreaMapZonePoint,
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget | null =>
  targets.find((target) =>
    pointInsideTarget(point.longitude, point.latitude, target)
  ) ?? null;

interface LngLatBounds {
  maxLat: number;
  maxLng: number;
  minLat: number;
  minLng: number;
}

const boundsOfRings = (
  rings: readonly (readonly [number, number][])[]
): LngLatBounds | null => {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return Number.isFinite(minLng) ? { maxLat, maxLng, minLat, minLng } : null;
};

const boundsIntersect = (a: LngLatBounds, b: LngLatBounds): boolean =>
  a.minLng <= b.maxLng &&
  a.maxLng >= b.minLng &&
  a.minLat <= b.maxLat &&
  a.maxLat >= b.minLat;

// A tract is kept only when its coverage share is within this fraction of the
// most-covered tract's share. So a draw that's mostly over one tract with a
// small sliver into a neighbor keeps ONLY the dominant tract (the sliver's
// share is far below the dominant one), while a deliberate straddle over two
// roughly-equal tracts keeps both. This is what fixes "drawing selects a
// nearby zone": a 70/30 split now yields just the 70% tract.
const COVERAGE_DOMINANCE_RATIO = 0.6;
// Grid resolution used to sample the drawn outline's area for coverage.
const COVERAGE_SAMPLE_GRID = 24;

/** Even grid of points that fall inside the drawn outline, for area sampling. */
const samplesInsidePolygon = (
  ring: readonly [number, number][],
  bounds: LngLatBounds
): [number, number][] => {
  const samples: [number, number][] = [];
  const spanLng = bounds.maxLng - bounds.minLng;
  const spanLat = bounds.maxLat - bounds.minLat;
  for (let i = 0; i < COVERAGE_SAMPLE_GRID; i++) {
    for (let j = 0; j < COVERAGE_SAMPLE_GRID; j++) {
      const lng = bounds.minLng + ((i + 0.5) / COVERAGE_SAMPLE_GRID) * spanLng;
      const lat = bounds.minLat + ((j + 0.5) / COVERAGE_SAMPLE_GRID) * spanLat;
      if (pointInRing(lng, lat, ring)) {
        samples.push([lng, lat]);
      }
    }
  }
  return samples;
};

/**
 * Fraction of the drawn outline's sampled area that sits over one tract. Each
 * sample belongs to at most one tract, so shares across tracts partition the
 * drawn area (ignoring gaps). Returns 0 when the tract's bounds do not even
 * intersect the drawn outline (cheap reject).
 */
const tractCoverageShare = (
  target: DeskAreaTarget,
  samples: readonly [number, number][],
  drawnBounds: LngLatBounds
): number => {
  const outerRings = targetOuterRings(target);
  const targetBounds = boundsOfRings(outerRings);
  if (!(targetBounds && boundsIntersect(drawnBounds, targetBounds))) {
    return 0;
  }
  let hits = 0;
  for (const [lng, lat] of samples) {
    if (outerRings.some((tractRing) => pointInRing(lng, lat, tractRing))) {
      hits++;
    }
  }
  return samples.length === 0 ? 0 : hits / samples.length;
};

/**
 * Tracts the user genuinely drew over. Selection is by AREA COVERAGE, not by
 * shared vertices/edges or centroid proximity: we sample the drawn outline,
 * measure what share of that area falls over each tract, then keep the most-
 * covered tract plus any other whose share is within `COVERAGE_DOMINANCE_RATIO`
 * of it. This means a small draw mostly over one tract picks EXACTLY that tract
 * (a thin sliver into a neighbor is dropped), while a deliberate straddle keeps
 * every substantially-covered tract. Handles MultiPolygon tracts.
 */
export const targetsOverlappingPolygon = (
  ring: readonly [number, number][],
  targets: readonly DeskAreaTarget[]
): DeskAreaTarget[] => {
  const drawnBounds = boundsOfRings([ring]);
  if (!drawnBounds) {
    return [];
  }
  const samples = samplesInsidePolygon(ring, drawnBounds);
  if (samples.length === 0) {
    // Outline too small to sample — fall back to the tract under its centroid.
    const centroid = ringCentroid(ring);
    return targets.filter((target) =>
      pointInsideTarget(centroid.longitude, centroid.latitude, target)
    );
  }
  const covered = targets
    .map((target) => ({
      share: tractCoverageShare(target, samples, drawnBounds),
      target,
    }))
    .filter((entry) => entry.share > 0);
  if (covered.length === 0) {
    return [];
  }
  const maxShare = Math.max(...covered.map((entry) => entry.share));
  const cutoff = maxShare * COVERAGE_DOMINANCE_RATIO;
  return covered
    .filter((entry) => entry.share >= cutoff)
    .map((entry) => entry.target);
};

/** Mail-piece density (pieces per square mile) for one tract, or null. */
const tractMailDensity = (target: DeskAreaTarget): number | null => {
  const area = target.squareMiles;
  if (
    typeof area !== "number" ||
    area <= 0 ||
    target.recommendedMailerCount <= 0
  ) {
    return null;
  }
  return target.recommendedMailerCount / area;
};

/**
 * Local mail-piece density for a drawn outline. Reads the tract(s) the outline
 * overlaps ONLY to derive a density figure — these tracts are never selected or
 * highlighted on the map. Falls back to the average density across all mapped
 * tracts when the outline doesn't overlap any known tract.
 */
const localMailDensity = (
  ring: readonly [number, number][],
  targets: readonly DeskAreaTarget[]
): number => {
  const overlapping = targetsOverlappingPolygon(ring, targets);
  const sample = overlapping.length > 0 ? overlapping : targets;
  const densities = sample
    .map(tractMailDensity)
    .filter((value): value is number => value !== null);
  if (densities.length === 0) {
    return 0;
  }
  return densities.reduce((sum, value) => sum + value, 0) / densities.length;
};

/**
 * Mail-piece estimate for a self-contained drawn polygon zone: polygon area ×
 * local homeowner density. Draw mode selects no predefined tracts, so the
 * audience size comes from the geometry itself, not from a tract selection.
 * The nearby-tract lookup here is internal density math only.
 */
export const polygonZoneMailEstimate = (
  ring: readonly [number, number][],
  targets: readonly DeskAreaTarget[]
): number => {
  const areaSqMiles = polygonAreaSqMiles(ring);
  if (areaSqMiles <= 0) {
    return 0;
  }
  const density = localMailDensity(ring, targets);
  if (density <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(density * areaSqMiles));
};

const zoneFootprintSqMiles = (zone: DeskTargetZone): number =>
  zone.kind === "polygon" && zone.polygon && zone.polygon.length >= 3
    ? polygonAreaSqMiles(zone.polygon)
    : zoneCircleAreaSqMiles(zone.radiusMiles);

/**
 * A zone snaps to whole neighborhoods, but it only mails the homes inside its
 * small footprint. Scale each neighborhood's mailer count by how much of it the
 * zone actually covers (footprint area ÷ neighborhood area) so the size changes
 * the count — otherwise every zone inherits the full tract and always reads
 * "too broad."
 */
const estimateMailPiecesForFootprint = (
  footprintSqMiles: number,
  zoneTargets: readonly DeskAreaTarget[]
): number => {
  const totalCount = zoneTargets.reduce(
    (sum, target) => sum + target.recommendedMailerCount,
    0
  );
  const totalArea = zoneTargets.reduce(
    (sum, target) =>
      sum +
      (typeof target.squareMiles === "number" && target.squareMiles > 0
        ? target.squareMiles
        : 0),
    0
  );
  if (totalArea <= 0) {
    return totalCount;
  }
  const density = totalCount / totalArea;
  return Math.min(
    totalCount,
    Math.max(1, Math.round(density * footprintSqMiles))
  );
};

export const zoneMailPieceEstimate = (
  zone: DeskTargetZone,
  zoneTargets: readonly DeskAreaTarget[]
): number => {
  // A drawn polygon zone selects no tracts — its audience is stored on the zone
  // itself (polygon area × density), so use that instead of a tract footprint.
  if (zoneTargets.length === 0 && typeof zone.estimatedPieces === "number") {
    return zone.estimatedPieces;
  }
  return estimateMailPiecesForFootprint(
    zoneFootprintSqMiles(zone),
    zoneTargets
  );
};

export const zoneValidationFor = (
  zone: DeskTargetZone | null,
  targets: readonly DeskAreaTarget[],
  mailPieces: number
): ZoneValidationResult => {
  if (!zone) {
    return {
      detail: "Turn on zone mode, choose a radius, then click the map.",
      items: ["No zone has been created yet."],
      title: "Create a small send zone",
      tone: "neutral",
    };
  }
  // A drawn polygon zone has zero selected tracts by design, so gate only on
  // the mail-piece estimate — never on the tract count — or a valid drawn zone
  // would wrongly read as "no homes."
  if (mailPieces === 0) {
    return {
      detail:
        "This zone didn't cover any mappable homes. Draw over a neighborhood or click closer to a labeled area.",
      items: ["Draw over a mapped neighborhood, or try a larger radius."],
      title: "No sendable homes found",
      tone: "error",
    };
  }
  if (
    mailPieces > MAX_ZONE_MAIL_PIECES ||
    targets.length > MAX_ZONE_TARGET_COUNT
  ) {
    return {
      detail: "This is likely bigger than Tandra should test first.",
      items: [
        "Lower the radius and click again.",
        "Split the area into two smaller postcard tests.",
      ],
      title: "Zone is too broad",
      tone: "error",
    };
  }
  if (mailPieces < MIN_ZONE_MAIL_PIECES) {
    return {
      detail:
        "This is small enough to be safe, but may be inefficient to print.",
      items: [
        "Increase the radius if the provider minimum is higher.",
        "Keep it if this is a hand-picked street cluster.",
      ],
      title: "Zone is very small",
      tone: "neutral",
    };
  }
  return {
    detail: "This is a reasonable first-send size for creative validation.",
    items: [
      "Save this target before changing the map.",
      "Prepare the mail batch and review addresses before sending.",
    ],
    title: "Zone is testable",
    tone: "good",
  };
};

/** Serialize a live zone into the persisted shape saved with a canvass target. */
export const savedZoneFrom = (
  zone: DeskTargetZone,
  mailPieces: number
): SavedTargetZone => ({
  estimatedPieces: mailPieces,
  kind: zone.kind,
  latitude: zone.latitude,
  longitude: zone.longitude,
  polygon:
    zone.kind === "polygon" && zone.polygon && zone.polygon.length >= 3
      ? zone.polygon
      : undefined,
  radiusMiles: zone.radiusMiles,
});

/** True when a saved zone carries enough geometry to reload into the builder. */
export const savedZoneIsRestorable = (
  saved?: SavedTargetZone
): saved is SavedTargetZone =>
  Boolean(
    saved && (saved.kind === "circle" || (saved.polygon?.length ?? 0) >= 3)
  );

/**
 * Rebuild a live zone from a saved target. Polygon zones restore the outline
 * with NO selected tracts (draw mode selects nothing); circle zones restore the
 * centroid + radius and reattach the saved tract ids.
 */
export const zoneFromSavedTarget = (
  saved: SavedTargetZone,
  label: string,
  tractIds: readonly string[]
): DeskTargetZone => ({
  createdAt: new Date().toISOString(),
  estimatedPieces: saved.estimatedPieces,
  id: createZoneId(),
  kind: saved.kind,
  label,
  latitude: saved.latitude,
  longitude: saved.longitude,
  polygon: saved.kind === "polygon" ? saved.polygon : undefined,
  radiusMiles: saved.radiusMiles,
  targetIds: saved.kind === "polygon" ? [] : [...tractIds],
});

export const zoneNotes = (
  zone: DeskTargetZone | null,
  mailPieces: number
): string | undefined => {
  if (!zone) {
    return undefined;
  }
  const audienceLine =
    zone.kind === "polygon"
      ? "Audience: drawn outline (area × local density)"
      : `Mapped target ids: ${zone.targetIds.join(", ")}`;
  return [
    "Small-zone mail target",
    `Center: ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}`,
    `Radius: ${zone.radiusMiles} miles`,
    `Estimated pieces: ${mailPieces}`,
    audienceLine,
  ].join("\n");
};
