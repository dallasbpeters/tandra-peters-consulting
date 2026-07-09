import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_NAME_LENGTH = 120;
const MAX_LABEL_LENGTH = 160;
const MAX_NOTE_LENGTH = 1400;
const MAX_NEIGHBORHOODS = 60;
/** Bound the stored outline so a runaway ring can't bloat the document. */
const MAX_POLYGON_POINTS = 400;

const STATUS_OPTIONS = new Set(["planned", "walking", "done"] as const);

const ID_PREFIX = "drafts.deskCanvassTarget.";

export interface CanvassNeighborhood {
  county: string;
  dataStatus?: string;
  homes: number;
  label: string;
  latitude: number | null;
  longitude: number | null;
  medianHomeAge?: number | null;
  medianIncome?: number | null;
  medianYearBuilt?: number | null;
  neighborhood: string;
  postalCode: string;
  recommendedMailerCount?: number;
  tractFips: string;
}

export interface SavedZone {
  estimatedPieces?: number;
  kind: "circle" | "polygon";
  latitude: number;
  longitude: number;
  polygon?: [number, number][];
  radiusMiles: number;
}

export interface CanvassTargetRecord {
  createdAt: string;
  createdBy: string;
  homesTotal: number;
  id: string;
  name: string;
  neighborhoods: CanvassNeighborhood[];
  notes?: string;
  status: string;
  updatedAt: string;
  zone?: SavedZone;
}

export interface CanvassTargetBody {
  error?: string;
  ok: boolean;
  target?: CanvassTargetRecord;
  targets?: CanvassTargetRecord[];
}

export interface CanvassTargetResult {
  body: CanvassTargetBody;
  status: number;
}

interface SaveOptions {
  createdBy: string;
  sanityWriteToken: string | undefined;
}

type ListOptions = Pick<SaveOptions, "sanityWriteToken">;

const sanityClient = (token: string) =>
  createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    perspective: "raw",
    projectId: SANITY_PROJECT_ID,
    token,
    useCdn: false,
  });

const trimTo = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const optionalNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegativeInt = (value: unknown): number => {
  const parsed = optionalNumber(value);
  return parsed === null ? 0 : Math.max(0, Math.round(parsed));
};

const ensureWriteToken = (token: string | undefined): token is string =>
  Boolean(token?.trim());

const missingTokenResult = (): CanvassTargetResult => ({
  body: {
    error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    ok: false,
  },
  status: 500,
});

const normalizeNeighborhoods = (value: unknown): CanvassNeighborhood[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, MAX_NEIGHBORHOODS).map((raw) => {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const recommendedMailerCount = optionalNumber(item.recommendedMailerCount);
    return {
      county: trimTo(item.county, MAX_LABEL_LENGTH),
      dataStatus: trimTo(item.dataStatus, MAX_NOTE_LENGTH) || undefined,
      homes: nonNegativeInt(item.homes),
      label: trimTo(item.label, MAX_LABEL_LENGTH),
      latitude: optionalNumber(item.latitude),
      longitude: optionalNumber(item.longitude),
      medianHomeAge: optionalNumber(item.medianHomeAge),
      medianIncome: optionalNumber(item.medianIncome),
      medianYearBuilt: optionalNumber(item.medianYearBuilt),
      neighborhood: trimTo(item.neighborhood, MAX_LABEL_LENGTH),
      postalCode: trimTo(item.postalCode, 16),
      recommendedMailerCount:
        recommendedMailerCount === null
          ? undefined
          : Math.max(0, Math.round(recommendedMailerCount)),
      tractFips: trimTo(item.tractFips, 32),
    };
  });
};

/**
 * Coerce an outline into [lng, lat] pairs. Accepts BOTH the client payload
 * shape (array of [lng, lat] pairs) and the stored shape (a flat interleaved
 * number array) — Sanity does not allow arrays-of-arrays, so the ring is
 * persisted flat and rehydrated here.
 */
const asRing = (value: unknown): [number, number][] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const flat: number[] = [];
  for (const point of value) {
    if (Array.isArray(point)) {
      const lng = optionalNumber(point[0]);
      const lat = optionalNumber(point[1]);
      if (lng !== null && lat !== null) {
        flat.push(lng, lat);
      }
    } else {
      const num = optionalNumber(point);
      if (num !== null) {
        flat.push(num);
      }
    }
  }
  const ring: [number, number][] = [];
  for (
    let index = 0;
    index + 1 < flat.length && ring.length < MAX_POLYGON_POINTS;
    index += 2
  ) {
    ring.push([flat[index], flat[index + 1]]);
  }
  return ring;
};

const normalizeZone = (value: unknown): SavedZone | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const latitude = optionalNumber(record.latitude);
  const longitude = optionalNumber(record.longitude);
  const radiusMiles = optionalNumber(record.radiusMiles);
  if (latitude === null || longitude === null || radiusMiles === null) {
    return undefined;
  }
  const kind = record.kind === "polygon" ? "polygon" : "circle";
  const estimated = optionalNumber(record.estimatedPieces);
  const zone: SavedZone = {
    estimatedPieces:
      estimated === null ? undefined : Math.max(0, Math.round(estimated)),
    kind,
    latitude,
    longitude,
    radiusMiles,
  };
  if (kind === "polygon") {
    const ring = asRing(record.polygon);
    if (ring.length >= 3) {
      zone.polygon = ring;
    }
  }
  return zone;
};

/** Storage shape: polygon flattened to interleaved numbers (Sanity-safe). */
const zoneForStorage = (
  zone: SavedZone | undefined
): Record<string, unknown> | undefined => {
  if (!zone) {
    return undefined;
  }
  return {
    estimatedPieces: zone.estimatedPieces,
    kind: zone.kind,
    latitude: zone.latitude,
    longitude: zone.longitude,
    polygon: zone.polygon ? zone.polygon.flat() : undefined,
    radiusMiles: zone.radiusMiles,
  };
};

const toRecord = (
  doc: Record<string, unknown>,
  fallbackId: string
): CanvassTargetRecord => {
  const neighborhoods = normalizeNeighborhoods(doc.neighborhoods);
  return {
    createdAt: trimTo(doc.createdAt, 40),
    createdBy: trimTo(doc.createdBy, MAX_NAME_LENGTH),
    homesTotal: nonNegativeInt(doc.homesTotal),
    id: trimTo(doc._id, 200) || trimTo(doc.id, 200) || fallbackId,
    name: trimTo(doc.name, MAX_NAME_LENGTH),
    neighborhoods,
    notes: trimTo(doc.notes, MAX_NOTE_LENGTH) || undefined,
    status: STATUS_OPTIONS.has(trimTo(doc.status, 20) as never)
      ? trimTo(doc.status, 20)
      : "planned",
    updatedAt: trimTo(doc.updatedAt, 40) || trimTo(doc.createdAt, 40),
    zone: normalizeZone(doc.zone),
  };
};

const LIST_QUERY = `*[_type == "deskCanvassTarget"] | order(updatedAt desc)[0...50]{
  _id,
  name,
  status,
  homesTotal,
  neighborhoods,
  notes,
  zone,
  createdAt,
  updatedAt,
  createdBy
}`;

export const listCanvassTargets = async (
  options: ListOptions
): Promise<CanvassTargetResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const docs = await sanityClient(options.sanityWriteToken).fetch<
    Record<string, unknown>[]
  >(LIST_QUERY);
  // Normalize each doc (rehydrates the flat-stored polygon into [lng,lat] pairs).
  const targets = docs.map((doc) => toRecord(doc, trimTo(doc._id, 200)));
  return { body: { ok: true, targets }, status: 200 };
};

const validId = (value: unknown): string | null => {
  const id = trimTo(value, 200);
  return id.startsWith(ID_PREFIX) ? id : null;
};

export const saveCanvassTarget = async (
  payload: Record<string, unknown>,
  options: SaveOptions
): Promise<CanvassTargetResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }

  const name = trimTo(payload.name, MAX_NAME_LENGTH);
  const neighborhoods = normalizeNeighborhoods(payload.neighborhoods);
  const zone = normalizeZone(payload.zone);
  const isDrawnZone = (zone?.polygon?.length ?? 0) >= 3;
  if (!name) {
    return {
      body: { error: "Give the target a name.", ok: false },
      status: 400,
    };
  }
  // A drawn polygon zone is self-contained (no tracts), so allow it to save on
  // its own geometry; otherwise still require at least one selected neighborhood.
  if (neighborhoods.length === 0 && !isDrawnZone) {
    return {
      body: {
        error: "Select at least one neighborhood, or draw a zone, on the map.",
        ok: false,
      },
      status: 400,
    };
  }

  const status = STATUS_OPTIONS.has(trimTo(payload.status, 20) as never)
    ? trimTo(payload.status, 20)
    : "planned";
  const homesTotal =
    neighborhoods.length > 0
      ? neighborhoods.reduce(
          (sum, item) => sum + (item.recommendedMailerCount ?? item.homes),
          0
        )
      : nonNegativeInt(zone?.estimatedPieces);
  const notes = trimTo(payload.notes, MAX_NOTE_LENGTH);
  const now = new Date().toISOString();
  const existingId = validId(payload.id);
  const id = existingId ?? `${ID_PREFIX}${randomUUID()}`;

  const client = sanityClient(options.sanityWriteToken);
  const doc = await client.createOrReplace({
    _id: id,
    _type: "deskCanvassTarget",
    createdAt: now,
    createdBy: options.createdBy,
    homesTotal,
    name,
    neighborhoods: neighborhoods.map((item) => ({
      _key: item.tractFips || randomUUID(),
      _type: "neighborhood",
      ...item,
    })),
    notes: notes || undefined,
    status,
    updatedAt: now,
    zone: zoneForStorage(zone),
  });

  return { body: { ok: true, target: toRecord(doc, id) }, status: 200 };
};

export const deleteCanvassTarget = async (
  rawId: unknown,
  options: ListOptions
): Promise<CanvassTargetResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const id = validId(rawId);
  if (!id) {
    return { body: { error: "Unknown target id.", ok: false }, status: 400 };
  }
  await sanityClient(options.sanityWriteToken).delete(id);
  return { body: { ok: true }, status: 200 };
};
