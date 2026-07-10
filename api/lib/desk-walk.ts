import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_NOTE_LENGTH = 1400;
const MAX_ID_LENGTH = 240;
const MAX_KEY_LENGTH = 200;

const ID_PREFIX = "drafts.deskWalkVisit.";

// The 8-value per-home status enum — must match `WalkStatus` in
// `src/lib/desk-walk.ts`. Anything else is coerced to `not-started`.
const STATUS_OPTIONS = new Set([
  "not-started",
  "no-answer",
  "talked",
  "not-interested",
  "come-back",
  "left-material",
  "booked",
  "skip",
] as const);

const DEFAULT_STATUS = "not-started";

export interface WalkVisitRecord {
  createdAt: string;
  createdBy: string;
  followUpDate?: string;
  homeKey: string;
  notes?: string;
  status: string;
  targetId: string;
  updatedAt: string;
}

export interface WalkVisitBody {
  error?: string;
  ok: boolean;
  visit?: WalkVisitRecord;
  visits?: WalkVisitRecord[];
}

export interface WalkVisitResult {
  body: WalkVisitBody;
  status: number;
}

interface UpsertOptions {
  createdBy: string;
  sanityWriteToken: string | undefined;
}

type ListOptions = Pick<UpsertOptions, "sanityWriteToken">;

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

const ensureWriteToken = (token: string | undefined): token is string =>
  Boolean(token?.trim());

const missingTokenResult = (): WalkVisitResult => ({
  body: {
    error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    ok: false,
  },
  status: 500,
});

const coerceStatus = (value: unknown): string => {
  const raw = trimTo(value, 20);
  return STATUS_OPTIONS.has(raw as never) ? raw : DEFAULT_STATUS;
};

const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?$/u.test(value);

// Sanity ids allow [a-zA-Z0-9._-]. `targetId` (itself a `drafts.…` id) and a
// RentCast `homeKey` can contain other characters, so slug each segment for the
// deterministic doc id — the raw values are still stored as fields for queries.
const idSegment = (value: string): string =>
  value.replaceAll(/[^a-zA-Z0-9]+/gu, "-").replaceAll(/^-+|-+$/gu, "");

/** Deterministic id so `createOrReplace` upserts one home without clobbering siblings. */
export const walkVisitDocId = (targetId: string, homeKey: string): string =>
  `${ID_PREFIX}${idSegment(targetId)}.${idSegment(homeKey)}`;

const toRecord = (doc: Record<string, unknown>): WalkVisitRecord => ({
  createdAt: trimTo(doc.createdAt, 40),
  createdBy: trimTo(doc.createdBy, 120),
  followUpDate: trimTo(doc.followUpDate, 40) || undefined,
  homeKey: trimTo(doc.homeKey, MAX_KEY_LENGTH),
  notes: trimTo(doc.notes, MAX_NOTE_LENGTH) || undefined,
  status: coerceStatus(doc.status),
  targetId: trimTo(doc.targetId, MAX_ID_LENGTH),
  updatedAt: trimTo(doc.updatedAt, 40) || trimTo(doc.createdAt, 40),
});

const LIST_QUERY = `*[_type == "deskWalkVisit" && targetId == $targetId]{
  targetId,
  homeKey,
  status,
  notes,
  followUpDate,
  createdAt,
  updatedAt,
  createdBy
}`;

export const listWalkVisits = async (
  rawTargetId: unknown,
  options: ListOptions
): Promise<WalkVisitResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const targetId = trimTo(rawTargetId, MAX_ID_LENGTH);
  if (!targetId) {
    return {
      body: { error: "A targetId is required.", ok: false },
      status: 400,
    };
  }
  const docs = await sanityClient(options.sanityWriteToken).fetch<
    Record<string, unknown>[]
  >(LIST_QUERY, { targetId });
  return { body: { ok: true, visits: docs.map(toRecord) }, status: 200 };
};

export const upsertWalkVisit = async (
  payload: Record<string, unknown>,
  options: UpsertOptions
): Promise<WalkVisitResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const targetId = trimTo(payload.targetId, MAX_ID_LENGTH);
  const homeKey = trimTo(payload.homeKey, MAX_KEY_LENGTH);
  if (!(targetId && homeKey)) {
    return {
      body: { error: "targetId and homeKey are required.", ok: false },
      status: 400,
    };
  }

  const status = coerceStatus(payload.status);
  const notes = trimTo(payload.notes, MAX_NOTE_LENGTH);
  const followUpRaw = trimTo(payload.followUpDate, 40);
  const followUpDate =
    followUpRaw && isIsoDate(followUpRaw) ? followUpRaw : undefined;
  const now = new Date().toISOString();
  const id = walkVisitDocId(targetId, homeKey);

  const client = sanityClient(options.sanityWriteToken);
  const existing = await client.getDocument(id).catch(() => null);
  const createdAt = trimTo(existing?.createdAt, 40) || now;

  const doc = await client.createOrReplace({
    _id: id,
    _type: "deskWalkVisit",
    createdAt,
    createdBy:
      trimTo(existing?.createdBy, 120) || options.createdBy || "unknown",
    followUpDate: followUpDate || undefined,
    homeKey,
    notes: notes || undefined,
    status,
    targetId,
    updatedAt: now,
  });

  return { body: { ok: true, visit: toRecord(doc) }, status: 200 };
};
