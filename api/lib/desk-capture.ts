import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_NAME_LENGTH = 120;
const MAX_METHOD_LENGTH = 120;
const MAX_AREA_LENGTH = 140;
const MAX_ADDRESS_LENGTH = 500;
const MAX_TEXT_LENGTH = 900;
const MAX_NOTE_LENGTH = 1400;

const SOURCE_OPTIONS = new Set([
  "neighbor-referral",
  "postcard",
  "neighborhood-post",
  "google-post",
  "partner",
  "website-estimate",
  "other",
] as const);

const NEXT_STEP_OPTIONS = new Set([
  "call-today",
  "send-checklist",
  "book-inspection",
  "ask-for-photos",
  "no-action-yet",
] as const);

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/u;
const PHONE_RE = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/u;
const UNSAFE_ID_RE = /[^a-z0-9._-]+/gu;
const ID_EDGE_RE = /^[-.]+|[-.]+$/gu;

interface DeskCaptureOptions {
  capturedBy: string;
  sanityWriteToken: string | undefined;
}

export interface DeskLeadRecord {
  area: string;
  capturedAt: string;
  capturedBy: string;
  contactMethod: string;
  contactName: string;
  county?: string;
  email?: string;
  id: string;
  latitude?: number;
  longitude?: number;
  mailingAddress?: string;
  need: string;
  nextStep: string;
  notes?: string;
  phone?: string;
  postalCode?: string;
  propertyAddress?: string;
  source: string;
  status: string;
}

export interface DeskCaptureBody {
  error?: string;
  lead?: DeskLeadRecord;
  leads?: DeskLeadRecord[];
  ok: boolean;
}

export interface DeskCaptureResult {
  body: DeskCaptureBody;
  status: number;
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

const trimTo = (value: unknown, maxLength: number): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
};

const pickOption = (
  value: unknown,
  allowed: ReadonlySet<string>,
  fallback: string
): string => {
  const normalized = trimTo(value, MAX_METHOD_LENGTH);
  return allowed.has(normalized) ? normalized : fallback;
};

const normalizeContactMethod = (raw: string) => {
  const email = raw.match(EMAIL_RE)?.[0]?.toLowerCase();
  const phone = raw.match(PHONE_RE)?.[0];
  return { email, phone };
};

const optionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const contactDraftId = (email: string): string => {
  const key = email
    .trim()
    .toLowerCase()
    .replaceAll("@", "-at-")
    .replaceAll(UNSAFE_ID_RE, "-")
    .replaceAll(ID_EDGE_RE, "");
  return `drafts.emailContact.${key}`;
};

const toLeadRecord = (
  doc: Record<string, unknown>,
  fallbackId: string
): DeskLeadRecord => ({
  area: trimTo(doc.area, MAX_AREA_LENGTH),
  capturedAt: trimTo(doc.capturedAt, MAX_METHOD_LENGTH),
  capturedBy: trimTo(doc.capturedBy, MAX_METHOD_LENGTH),
  contactMethod: trimTo(doc.contactMethod, MAX_METHOD_LENGTH),
  contactName: trimTo(doc.contactName, MAX_NAME_LENGTH),
  county: trimTo(doc.county, MAX_AREA_LENGTH) || undefined,
  email: trimTo(doc.email, MAX_METHOD_LENGTH) || undefined,
  id: trimTo(doc._id, MAX_METHOD_LENGTH) || fallbackId,
  latitude: optionalNumber(doc.latitude),
  longitude: optionalNumber(doc.longitude),
  mailingAddress: trimTo(doc.mailingAddress, MAX_ADDRESS_LENGTH) || undefined,
  need: trimTo(doc.need, MAX_TEXT_LENGTH),
  nextStep: trimTo(doc.nextStep, MAX_METHOD_LENGTH),
  notes: trimTo(doc.notes, MAX_NOTE_LENGTH) || undefined,
  phone: trimTo(doc.phone, MAX_METHOD_LENGTH) || undefined,
  postalCode: trimTo(doc.postalCode, MAX_METHOD_LENGTH) || undefined,
  propertyAddress: trimTo(doc.propertyAddress, MAX_ADDRESS_LENGTH) || undefined,
  source: trimTo(doc.source, MAX_METHOD_LENGTH),
  status: trimTo(doc.status, MAX_METHOD_LENGTH) || "new",
});

const latestMessage = (lead: DeskLeadRecord): string =>
  [lead.need, lead.notes].filter(Boolean).join("\n\n");

const upsertEmailContact = async (
  client: ReturnType<typeof sanityClient>,
  lead: DeskLeadRecord
): Promise<void> => {
  if (!lead.email) {
    return;
  }

  const now = lead.capturedAt;
  const id = contactDraftId(lead.email);
  await client
    .transaction()
    .createIfNotExists({
      _id: id,
      _type: "emailContact",
      email: lead.email,
      firstContactedAt: now,
      source: "Desk capture",
      submissionCount: 0,
      subscribed: true,
    })
    .patch(id, (patch) =>
      patch
        .set({
          email: lead.email,
          fullName: lead.contactName,
          lastContactedAt: now,
          latestMessage: latestMessage(lead),
          ...(lead.phone ? { phoneNumber: lead.phone } : {}),
          propertyAddress: lead.propertyAddress ?? lead.area,
          serviceInterest: "Roof check",
        })
        .setIfMissing({
          firstContactedAt: now,
          source: "Desk capture",
          subscribed: true,
        })
        .inc({ submissionCount: 1 })
    )
    .commit();
};

const normalizeLead = (
  payload: Record<string, unknown>,
  capturedBy: string
): DeskLeadRecord | string => {
  const contactName = trimTo(payload.contactName, MAX_NAME_LENGTH);
  const contactMethod = trimTo(payload.contactMethod, MAX_METHOD_LENGTH);
  const area = trimTo(payload.area, MAX_AREA_LENGTH);
  const county = trimTo(payload.county, MAX_AREA_LENGTH);
  const mailingAddress = trimTo(payload.mailingAddress, MAX_ADDRESS_LENGTH);
  const need = trimTo(payload.need, MAX_TEXT_LENGTH);
  const notes = trimTo(payload.notes, MAX_NOTE_LENGTH);
  const postalCode = trimTo(payload.postalCode, MAX_METHOD_LENGTH);
  const propertyAddress = trimTo(payload.propertyAddress, MAX_ADDRESS_LENGTH);

  if (!(contactName && contactMethod && propertyAddress && area && need)) {
    return "Add a name, phone or email, property address, area, and what needs follow-up.";
  }

  const methodParts = normalizeContactMethod(contactMethod);
  const capturedAt = new Date().toISOString();

  return {
    area,
    capturedAt,
    capturedBy,
    contactMethod,
    contactName,
    county: county || undefined,
    email: methodParts.email,
    id: `drafts.deskLead.${randomUUID()}`,
    latitude: optionalNumber(payload.latitude),
    longitude: optionalNumber(payload.longitude),
    mailingAddress: mailingAddress || propertyAddress,
    need,
    nextStep: pickOption(payload.nextStep, NEXT_STEP_OPTIONS, "call-today"),
    notes: notes || undefined,
    phone: methodParts.phone,
    postalCode: postalCode || undefined,
    propertyAddress,
    source: pickOption(payload.source, SOURCE_OPTIONS, "other"),
    status: "new",
  };
};

const ensureWriteToken = (token: string | undefined): token is string =>
  Boolean(token?.trim());

export const captureDeskLead = async (
  payload: Record<string, unknown>,
  options: DeskCaptureOptions
): Promise<DeskCaptureResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return {
      body: {
        error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
        ok: false,
      },
      status: 500,
    };
  }

  const normalized = normalizeLead(payload, options.capturedBy);
  if (typeof normalized === "string") {
    return { body: { error: normalized, ok: false }, status: 400 };
  }

  const client = sanityClient(options.sanityWriteToken);
  const created = await client.create({
    _id: normalized.id,
    _type: "deskLead",
    area: normalized.area,
    capturedAt: normalized.capturedAt,
    capturedBy: normalized.capturedBy,
    contactMethod: normalized.contactMethod,
    contactName: normalized.contactName,
    county: normalized.county,
    email: normalized.email,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    mailingAddress: normalized.mailingAddress,
    need: normalized.need,
    nextStep: normalized.nextStep,
    notes: normalized.notes,
    phone: normalized.phone,
    postalCode: normalized.postalCode,
    propertyAddress: normalized.propertyAddress,
    source: normalized.source,
    status: normalized.status,
  });

  const lead = toLeadRecord(created, normalized.id);
  await upsertEmailContact(client, lead);

  return { body: { lead, ok: true }, status: 200 };
};

const RECENT_LEADS_QUERY = `*[_type == "deskLead"] | order(capturedAt desc)[0...12]{
  "id": _id,
  contactName,
  contactMethod,
  email,
  phone,
  area,
  county,
  propertyAddress,
  mailingAddress,
  postalCode,
  latitude,
  longitude,
  need,
  notes,
  source,
  nextStep,
  status,
  capturedAt,
  capturedBy
}`;

export const listDeskLeads = async (
  options: Pick<DeskCaptureOptions, "sanityWriteToken">
): Promise<DeskCaptureResult> => {
  if (!ensureWriteToken(options.sanityWriteToken)) {
    return {
      body: {
        error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
        ok: false,
      },
      status: 500,
    };
  }

  const leads = await sanityClient(options.sanityWriteToken).fetch<
    DeskLeadRecord[]
  >(RECENT_LEADS_QUERY);

  return { body: { leads, ok: true }, status: 200 };
};
