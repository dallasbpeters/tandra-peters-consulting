import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_TITLE_LENGTH = 200;
const MAX_DETAIL_LENGTH = 1400;
const MAX_SHORT_LENGTH = 160;
const MAX_SEED_KEY_LENGTH = 200;
const LIST_LIMIT = 200;

const ID_PREFIX = "drafts.deskBoardItem.";

const KIND_OPTIONS = new Set(["task", "content"] as const);
const ORIGIN_OPTIONS = new Set(["seed", "generated", "manual"] as const);
const TASK_STATUS_OPTIONS = new Set(["todo", "done"] as const);
const CONTENT_STATUS_OPTIONS = new Set([
  "idea",
  "scheduled",
  "published",
] as const);
const BUYER_STAGE_OPTIONS = new Set([
  "awareness",
  "consideration",
  "decision",
  "retention",
] as const);

export type DeskBoardKind = "task" | "content";

export interface DeskBoardItemRecord {
  buyerStage?: string;
  channel?: string;
  completedAt?: string;
  createdAt: string;
  createdBy: string;
  detail?: string;
  href?: string;
  id: string;
  kind: DeskBoardKind;
  origin: string;
  pillar?: string;
  publishDate?: string;
  seedKey?: string;
  status: string;
  title: string;
  updatedAt: string;
}

export interface DeskBoardBody {
  error?: string;
  item?: DeskBoardItemRecord;
  items?: DeskBoardItemRecord[];
  ok: boolean;
}

export interface DeskBoardResult {
  body: DeskBoardBody;
  status: number;
}

interface SaveOptions {
  createdBy: string;
  sanityWriteToken: string | undefined;
}

type ListOptions = Pick<SaveOptions, "sanityWriteToken"> & {
  kind?: string;
};

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

const missingTokenResult = (): DeskBoardResult => ({
  body: {
    error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    ok: false,
  },
  status: 500,
});

const normalizeKind = (value: unknown): DeskBoardKind =>
  KIND_OPTIONS.has(trimTo(value, 20) as never)
    ? (trimTo(value, 20) as DeskBoardKind)
    : "task";

const defaultStatusFor = (kind: DeskBoardKind): string =>
  kind === "content" ? "idea" : "todo";

const normalizeStatus = (value: unknown, kind: DeskBoardKind): string => {
  const candidate = trimTo(value, 20);
  const allowed =
    kind === "content" ? CONTENT_STATUS_OPTIONS : TASK_STATUS_OPTIONS;
  return allowed.has(candidate as never) ? candidate : defaultStatusFor(kind);
};

const normalizeOrigin = (value: unknown): string => {
  const candidate = trimTo(value, 20);
  return ORIGIN_OPTIONS.has(candidate as never) ? candidate : "manual";
};

const optionalTrim = (value: unknown, maxLength: number): string | undefined =>
  trimTo(value, maxLength) || undefined;

const normalizeBuyerStage = (value: unknown): string | undefined => {
  const candidate = trimTo(value, 20);
  return BUYER_STAGE_OPTIONS.has(candidate as never) ? candidate : undefined;
};

const PUBLISH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const normalizePublishDate = (value: unknown): string | undefined => {
  const candidate = trimTo(value, 10);
  return PUBLISH_DATE_PATTERN.test(candidate) ? candidate : undefined;
};

const toRecord = (
  doc: Record<string, unknown>,
  fallbackId: string
): DeskBoardItemRecord => {
  const kind = normalizeKind(doc.kind);
  return {
    buyerStage: normalizeBuyerStage(doc.buyerStage),
    channel: optionalTrim(doc.channel, MAX_SHORT_LENGTH),
    completedAt: optionalTrim(doc.completedAt, 40),
    createdAt: trimTo(doc.createdAt, 40),
    createdBy: trimTo(doc.createdBy, MAX_SHORT_LENGTH),
    detail: optionalTrim(doc.detail, MAX_DETAIL_LENGTH),
    href: optionalTrim(doc.href, MAX_SHORT_LENGTH),
    id: trimTo(doc._id, 200) || fallbackId,
    kind,
    origin: normalizeOrigin(doc.origin),
    pillar: optionalTrim(doc.pillar, MAX_SHORT_LENGTH),
    publishDate: normalizePublishDate(doc.publishDate),
    seedKey: optionalTrim(doc.seedKey, MAX_SEED_KEY_LENGTH),
    status: normalizeStatus(doc.status, kind),
    title: trimTo(doc.title, MAX_TITLE_LENGTH),
    updatedAt: trimTo(doc.updatedAt, 40) || trimTo(doc.createdAt, 40),
  };
};

const LIST_QUERY = `*[_type == "deskBoardItem" && ($kind == "" || kind == $kind)] | order(createdAt desc)[0...${LIST_LIMIT}]{
  "id": _id,
  kind,
  title,
  detail,
  channel,
  href,
  status,
  origin,
  seedKey,
  pillar,
  buyerStage,
  publishDate,
  createdBy,
  createdAt,
  completedAt,
  updatedAt
}`;

export const listBoardItems = async (
  options: ListOptions
): Promise<DeskBoardResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const kind = KIND_OPTIONS.has(trimTo(options.kind, 20) as never)
    ? trimTo(options.kind, 20)
    : "";
  const items = await sanityClient(options.sanityWriteToken).fetch<
    DeskBoardItemRecord[]
  >(LIST_QUERY, { kind });
  return { body: { items, ok: true }, status: 200 };
};

const validId = (value: unknown): string | null => {
  const id = trimTo(value, 200);
  return id.startsWith(ID_PREFIX) ? id : null;
};

const findBySeedKey = async (
  client: ReturnType<typeof sanityClient>,
  seedKey: string
): Promise<string | null> => {
  if (!seedKey) {
    return null;
  }
  const existing = await client.fetch<string | null>(
    `*[_type == "deskBoardItem" && seedKey == $seedKey][0]._id`,
    { seedKey }
  );
  return existing ?? null;
};

export const saveBoardItem = async (
  payload: Record<string, unknown>,
  options: SaveOptions
): Promise<DeskBoardResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }

  const title = trimTo(payload.title, MAX_TITLE_LENGTH);
  if (!title) {
    return {
      body: { error: "Give the item a title.", ok: false },
      status: 400,
    };
  }

  const kind = normalizeKind(payload.kind);
  const status = normalizeStatus(payload.status, kind);
  const seedKey = trimTo(payload.seedKey, MAX_SEED_KEY_LENGTH);
  const now = new Date().toISOString();
  const client = sanityClient(options.sanityWriteToken);

  const existingId =
    validId(payload.id) ?? (await findBySeedKey(client, seedKey));
  const id = existingId ?? `${ID_PREFIX}${randomUUID()}`;
  const isDone =
    kind === "content" ? status === "published" : status === "done";

  const doc = await client.createOrReplace({
    _id: id,
    _type: "deskBoardItem",
    buyerStage: normalizeBuyerStage(payload.buyerStage),
    channel: optionalTrim(payload.channel, MAX_SHORT_LENGTH),
    completedAt: isDone ? now : undefined,
    createdAt: now,
    createdBy: options.createdBy,
    detail: optionalTrim(payload.detail, MAX_DETAIL_LENGTH),
    href: optionalTrim(payload.href, MAX_SHORT_LENGTH),
    kind,
    origin: normalizeOrigin(payload.origin),
    pillar: optionalTrim(payload.pillar, MAX_SHORT_LENGTH),
    publishDate: normalizePublishDate(payload.publishDate),
    seedKey: seedKey || undefined,
    status,
    title,
    updatedAt: now,
  });

  return { body: { item: toRecord(doc, id), ok: true }, status: 200 };
};

export const deleteBoardItem = async (
  rawId: unknown,
  options: Pick<SaveOptions, "sanityWriteToken">
): Promise<DeskBoardResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return missingTokenResult();
  }
  const id = validId(rawId);
  if (!id) {
    return { body: { error: "Unknown item id.", ok: false }, status: 400 };
  }
  await sanityClient(options.sanityWriteToken).delete(id);
  return { body: { ok: true }, status: 200 };
};
