import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_TITLE_LENGTH = 160;
const MAX_KEYWORD_LENGTH = 160;
const MAX_AREA_LENGTH = 140;
const MAX_BRIEF_LENGTH = 1400;
const MAX_ID_LENGTH = 200;
const MAX_SHORT_LENGTH = 160;
const MAX_LIST_SIZE = 200;

const ID_PREFIX = "drafts.deskBoardItem.";
const DOCUMENT_TYPE = "deskBoardItem";
const DOCUMENT_KIND = "content";

export const CHANNEL_OPTIONS = new Set([
  "article",
  "neighborhood-post",
  "google-post",
  "email",
  "ad",
  "postcard",
  "video",
] as const);

export const STATUS_OPTIONS = new Set([
  "idea",
  "scheduled",
  "published",
] as const);

const GENERATED_BY_OPTIONS = new Set(["manual", "calendar-agent"] as const);

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/u;

export interface CalendarEntryRecord {
  area?: string;
  brief?: string;
  channel: string;
  createdAt: string;
  createdBy: string;
  generatedBy: string;
  id: string;
  scheduledFor: string;
  sourceLeadId?: string;
  status: string;
  targetKeyword?: string;
  title: string;
}

export interface CalendarEntryBody {
  entries?: CalendarEntryRecord[];
  entry?: CalendarEntryRecord;
  error?: string;
  ok: boolean;
}

export interface CalendarEntryResult {
  body: CalendarEntryBody;
  status: number;
}

interface WriteOptions {
  createdBy: string;
  sanityWriteToken: string | undefined;
}

type TokenOptions = Pick<WriteOptions, "sanityWriteToken">;

export interface ListCalendarRange {
  /** YYYY-MM-DD inclusive */
  end?: string;
  /** YYYY-MM-DD inclusive */
  start?: string;
}

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

const pickOption = (
  value: unknown,
  allowed: ReadonlySet<string>,
  fallback: string
): string => {
  const normalized = trimTo(value, 40);
  return allowed.has(normalized) ? normalized : fallback;
};

const channelLabel = (channel: string): string => {
  switch (channel) {
    case "ad":
      return "Ad";
    case "email":
      return "Email";
    case "google-post":
      return "Google post";
    case "neighborhood-post":
      return "Neighborhood post";
    case "postcard":
      return "Postcard";
    case "video":
      return "Video";
    default:
      return "Blog";
  }
};

const normalizeDeskChannel = (value: unknown): string => {
  const raw = trimTo(value, MAX_SHORT_LENGTH).toLowerCase();
  if (!raw) {
    return "article";
  }
  if (raw.includes("video")) {
    return "video";
  }
  if (raw.includes("email")) {
    return "email";
  }
  if (raw.includes("postcard") || raw.includes("direct mail")) {
    return "postcard";
  }
  if (raw.includes("ad") || raw.includes("instagram") || raw.includes("paid")) {
    return "ad";
  }
  if (raw.includes("google") && raw.includes("post")) {
    return "google-post";
  }
  if (
    raw.includes("nextdoor") ||
    raw.includes("neighborhood") ||
    raw.includes("facebook")
  ) {
    return "neighborhood-post";
  }
  if (CHANNEL_OPTIONS.has(raw as never)) {
    return raw;
  }
  return "article";
};

const isIsoDay = (value: string): boolean => {
  if (!ISO_DAY_RE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const ensureWriteToken = (token: string | undefined): token is string =>
  Boolean(token?.trim());

const missingTokenResult = (): CalendarEntryResult => ({
  body: {
    error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    ok: false,
  },
  status: 500,
});

const badRequest = (error: string): CalendarEntryResult => ({
  body: { error, ok: false },
  status: 400,
});

const validId = (value: unknown): string | null => {
  const id = trimTo(value, MAX_ID_LENGTH);
  return id.startsWith(ID_PREFIX) ? id : null;
};

const toEntryRecord = (
  doc: Record<string, unknown>,
  fallbackId: string
): CalendarEntryRecord => ({
  area: trimTo(doc.pillar ?? doc.area, MAX_AREA_LENGTH) || undefined,
  brief: trimTo(doc.detail ?? doc.brief, MAX_BRIEF_LENGTH) || undefined,
  channel: normalizeDeskChannel(doc.channel),
  createdAt: trimTo(doc.createdAt, 40),
  createdBy: trimTo(doc.createdBy, MAX_TITLE_LENGTH),
  generatedBy:
    trimTo(doc.origin, 40) === "generated" ||
    trimTo(doc.generatedBy, 40) === "calendar-agent"
      ? "calendar-agent"
      : "manual",
  id: trimTo(doc._id ?? doc.id, MAX_ID_LENGTH) || fallbackId,
  scheduledFor: trimTo(doc.publishDate ?? doc.scheduledFor, 10),
  status: pickOption(doc.status, STATUS_OPTIONS, "idea"),
  targetKeyword:
    trimTo(doc.buyerStage ?? doc.targetKeyword, MAX_KEYWORD_LENGTH) ||
    undefined,
  title: trimTo(doc.title, MAX_TITLE_LENGTH),
});

export interface NormalizedCalendarEntry {
  area?: string;
  brief?: string;
  channel: string;
  generatedBy: string;
  scheduledFor: string;
  sourceLeadId?: string;
  status: string;
  targetKeyword?: string;
  title: string;
}

/**
 * Validate a create/update payload. Returns an error message string when the
 * payload is unusable, otherwise the normalized entry fields.
 */
export const normalizeEntryPayload = (
  payload: Record<string, unknown>
): NormalizedCalendarEntry | string => {
  const title = trimTo(payload.title, MAX_TITLE_LENGTH);
  if (!title) {
    return "Give the calendar entry a title.";
  }

  const scheduledFor = trimTo(payload.scheduledFor, 10);
  if (!isIsoDay(scheduledFor)) {
    return "scheduledFor must be a valid YYYY-MM-DD date.";
  }

  const channel = trimTo(payload.channel, 40);
  if (!CHANNEL_OPTIONS.has(channel as never)) {
    return "Pick a valid channel for this entry.";
  }

  return {
    area: trimTo(payload.area, MAX_AREA_LENGTH) || undefined,
    brief: trimTo(payload.brief, MAX_BRIEF_LENGTH) || undefined,
    channel,
    generatedBy: pickOption(
      payload.generatedBy,
      GENERATED_BY_OPTIONS,
      "manual"
    ),
    scheduledFor,
    sourceLeadId: trimTo(payload.sourceLeadId, MAX_ID_LENGTH) || undefined,
    status: pickOption(payload.status, STATUS_OPTIONS, "idea"),
    targetKeyword:
      trimTo(payload.targetKeyword, MAX_KEYWORD_LENGTH) || undefined,
    title,
  };
};

const LIST_QUERY = `*[_type == "deskBoardItem" && kind == "content" && publishDate >= $start && publishDate <= $end] | order(publishDate asc)[0...${MAX_LIST_SIZE}]{
  "id": _id,
  title,
  detail,
  channel,
  status,
  origin,
  pillar,
  buyerStage,
  publishDate,
  createdAt,
  createdBy
}`;

const DEFAULT_RANGE_START = "0000-01-01";
const DEFAULT_RANGE_END = "9999-12-31";

const createDraftId = (): string => {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${ID_PREFIX}${randomId}`;
};

export const listCalendarEntries = async (
  range: ListCalendarRange,
  options: TokenOptions
): Promise<CalendarEntryResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }

  const start = trimTo(range.start, 10);
  const end = trimTo(range.end, 10);
  if ((start && !isIsoDay(start)) || (end && !isIsoDay(end))) {
    return badRequest("start and end must be YYYY-MM-DD dates.");
  }

  const entries = await sanityClient(options.sanityWriteToken).fetch<
    Record<string, unknown>[]
  >(LIST_QUERY, {
    end: end || DEFAULT_RANGE_END,
    start: start || DEFAULT_RANGE_START,
  });

  return {
    body: {
      entries: entries.map((doc) => toEntryRecord(doc, "")),
      ok: true,
    },
    status: 200,
  };
};

export const createCalendarEntry = async (
  payload: Record<string, unknown>,
  options: WriteOptions
): Promise<CalendarEntryResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }

  const normalized = normalizeEntryPayload(payload);
  if (typeof normalized === "string") {
    return badRequest(normalized);
  }

  const id = createDraftId();
  const now = new Date().toISOString();
  const created = await sanityClient(options.sanityWriteToken).create({
    _id: id,
    _type: DOCUMENT_TYPE,
    buyerStage: normalized.targetKeyword,
    channel: channelLabel(normalized.channel),
    createdAt: now,
    createdBy: options.createdBy,
    detail: normalized.brief,
    kind: DOCUMENT_KIND,
    origin:
      normalized.generatedBy === "calendar-agent" ? "generated" : "manual",
    pillar: normalized.area,
    publishDate: normalized.scheduledFor,
    status: normalized.status,
    title: normalized.title,
    updatedAt: now,
  });

  return { body: { entry: toEntryRecord(created, id), ok: true }, status: 200 };
};

const UPDATABLE_FIELDS = [
  "area",
  "brief",
  "channel",
  "scheduledFor",
  "status",
  "targetKeyword",
  "title",
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];
type FieldValidation = { error: string } | { value: unknown };

const fieldToDeskPatchKey = (field: UpdatableField): string => {
  switch (field) {
    case "area":
      return "pillar";
    case "brief":
      return "detail";
    case "scheduledFor":
      return "publishDate";
    case "targetKeyword":
      return "buyerStage";
    default:
      return field;
  }
};

const validateUpdatableField = (
  field: UpdatableField,
  payload: Record<string, unknown>
): FieldValidation => {
  switch (field) {
    case "title": {
      const title = trimTo(payload.title, MAX_TITLE_LENGTH);
      return title
        ? { value: title }
        : { error: "Give the calendar entry a title." };
    }
    case "scheduledFor": {
      const scheduledFor = trimTo(payload.scheduledFor, 10);
      return isIsoDay(scheduledFor)
        ? { value: scheduledFor }
        : { error: "scheduledFor must be a valid YYYY-MM-DD date." };
    }
    case "channel": {
      const channel = trimTo(payload.channel, 40);
      return CHANNEL_OPTIONS.has(channel as never)
        ? { value: channelLabel(channel) }
        : { error: "Pick a valid channel for this entry." };
    }
    case "status": {
      const status = trimTo(payload.status, 40);
      return STATUS_OPTIONS.has(status as never)
        ? { value: status }
        : { error: "Pick a valid status for this entry." };
    }
    case "brief":
      return { value: trimTo(payload.brief, MAX_BRIEF_LENGTH) || undefined };
    case "area":
      return { value: trimTo(payload.area, MAX_AREA_LENGTH) || undefined };
    default:
      return {
        value: trimTo(payload.targetKeyword, MAX_KEYWORD_LENGTH) || undefined,
      };
  }
};

/**
 * Patch a subset of entry fields. Only fields present in the payload are
 * touched; each provided field is validated with the same rules as create.
 */
export const updateCalendarEntry = async (
  payload: Record<string, unknown>,
  options: TokenOptions
): Promise<CalendarEntryResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }

  const id = validId(payload.id);
  if (!id) {
    return badRequest("Unknown calendar entry id.");
  }

  const patch: Record<string, unknown> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (!(field in payload)) {
      continue;
    }
    const result = validateUpdatableField(field, payload);
    if ("error" in result) {
      return badRequest(result.error);
    }
    patch[fieldToDeskPatchKey(field)] = result.value;
  }

  if (Object.keys(patch).length === 0) {
    return badRequest("Nothing to update.");
  }

  patch.updatedAt = new Date().toISOString();

  const updated = await sanityClient(options.sanityWriteToken)
    .patch(id)
    .set(patch)
    .commit();

  return {
    body: { entry: toEntryRecord(updated, id), ok: true },
    status: 200,
  };
};

export const deleteCalendarEntry = async (
  rawId: unknown,
  options: TokenOptions
): Promise<CalendarEntryResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const id = validId(rawId);
  if (!id) {
    return badRequest("Unknown calendar entry id.");
  }
  await sanityClient(options.sanityWriteToken).delete(id);
  return { body: { ok: true }, status: 200 };
};
