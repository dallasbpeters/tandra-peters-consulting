/**
 * Sanity-backed store for website contact-form leads. Each submission upserts an
 * `emailContact` document (deduped by email) so the email composer can send to
 * people who have reached out.
 *
 * Documents are written as DRAFTS and never published, so the lead's PII (email,
 * phone, address) stays out of the public-read `production` dataset — only
 * requests carrying a Sanity token (the Studio, the auth-gated composer
 * endpoints) can read them.
 */
import { createClient, type SanityClient } from "@sanity/client";

import type { ContactLeadSubmission, EmailRecipient } from "./types.js";

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const API_VERSION = "2026-05-29";

const client = (token: string): SanityClient =>
  createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
    // `raw` so the draft-only contact documents are returned (no published version exists).
    perspective: "raw",
  });

/** Stable draft id derived from the email, so repeat submissions update one doc. */
const contactDraftId = (email: string): string => {
  const key = email
    .trim()
    .toLowerCase()
    .replace(/@/g, "-at-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `drafts.emailContact.${key}`;
};

/**
 * Create-or-update the lead's contact document. Stored as a draft to keep it
 * private. Throws on failure so the caller can log without blocking the
 * visitor's success response.
 */
export const upsertContactLead = async (
  token: string,
  submission: ContactLeadSubmission,
): Promise<void> => {
  const email = submission.email.trim().toLowerCase();
  if (!email) return;

  const id = contactDraftId(email);
  const now = submission.submittedAt || new Date().toISOString();

  await client(token)
    .transaction()
    .createIfNotExists({
      _id: id,
      _type: "emailContact",
      email,
      source: "Website contact form",
      subscribed: true,
      firstContactedAt: now,
      submissionCount: 0,
    })
    .patch(id, (p) =>
      p
        .set({
          fullName: submission.fullName,
          email,
          lastContactedAt: now,
          ...(submission.phoneNumber ? { phoneNumber: submission.phoneNumber } : {}),
          ...(submission.propertyAddress ? { propertyAddress: submission.propertyAddress } : {}),
          ...(submission.serviceLabel ? { serviceInterest: submission.serviceLabel } : {}),
          ...(submission.message ? { latestMessage: submission.message } : {}),
        })
        .setIfMissing({
          firstContactedAt: now,
          source: "Website contact form",
          subscribed: true,
        })
        .inc({ submissionCount: 1 }),
    )
    .commit();
};

const CONTACTS_QUERY = `*[_type == "emailContact" && subscribed != false && defined(email)]{
  "id": _id,
  "name": coalesce(fullName, email),
  email
}`;

/** List subscribed contacts as composer recipients. */
export const listEmailContacts = async (
  token: string,
  options: { search?: string } = {},
): Promise<EmailRecipient[]> => {
  const rows =
    await client(token).fetch<{ id: string; name?: string; email?: string }[]>(CONTACTS_QUERY);

  const recipients = rows
    .filter(
      (r): r is { id: string; name?: string; email: string } =>
        typeof r.email === "string" && r.email.includes("@"),
    )
    .map((r) => ({
      id: r.id,
      name: r.name?.trim() || r.email,
      email: r.email.toLowerCase(),
    }));

  const search = options.search?.trim().toLowerCase();
  if (!search) return recipients;
  return recipients.filter(
    (r) => r.name.toLowerCase().includes(search) || r.email.includes(search),
  );
};

/**
 * Merge CRM (Attio) and Sanity recipients, deduped by email. Attio entries win
 * on collision so their record id is preserved (used to log sent emails back to
 * the CRM). Result is sorted by name.
 */
export const mergeRecipients = (
  attio: EmailRecipient[],
  sanity: EmailRecipient[],
): EmailRecipient[] => {
  const byEmail = new Map<string, EmailRecipient>();
  for (const r of sanity) byEmail.set(r.email, r);
  for (const r of attio) byEmail.set(r.email, r);
  return [...byEmail.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
};
