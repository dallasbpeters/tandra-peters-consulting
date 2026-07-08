import { createClient } from "@sanity/client";

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const API_VERSION = "2026-05-29";

const client = (token) =>
  createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
    // `raw` so the draft-only contact documents are returned (no published version exists).
    perspective: "raw",
  });

const contactDraftId = (email) => {
  const key = email
    .trim()
    .toLowerCase()
    .replaceAll("@", "-at-")
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/^[-.]+|[-.]+$/g, "");
  return `drafts.emailContact.${key}`;
};

export const upsertContactLead = async (token, submission) => {
  const email = submission.email.trim().toLowerCase();
  if (!email) {
    return;
  }

  const id = contactDraftId(email);
  const now = submission.submittedAt || new Date().toISOString();

  await client(token)
    .transaction()
    .createIfNotExists({
      _id: id,
      _type: "emailContact",
      email,
      firstContactedAt: now,
      source: "Website contact form",
      submissionCount: 0,
      subscribed: true,
    })
    .patch(id, (p) =>
      p
        .set({
          email,
          fullName: submission.fullName,
          lastContactedAt: now,
          ...(submission.phoneNumber
            ? { phoneNumber: submission.phoneNumber }
            : {}),
          ...(submission.propertyAddress
            ? { propertyAddress: submission.propertyAddress }
            : {}),
          ...(submission.serviceLabel
            ? { serviceInterest: submission.serviceLabel }
            : {}),
          ...(submission.message ? { latestMessage: submission.message } : {}),
        })
        .setIfMissing({
          firstContactedAt: now,
          source: "Website contact form",
          subscribed: true,
        })
        .inc({ submissionCount: 1 })
    )
    .commit();
};

const CONTACTS_QUERY = `*[_type == "emailContact" && subscribed != false && defined(email)]{
  "id": _id,
  "name": coalesce(fullName, email),
  email
}`;

export const listEmailContacts = async (token, options = {}) => {
  const rows = await client(token).fetch(CONTACTS_QUERY);

  const recipients = rows
    .filter((r) => typeof r.email === "string" && r.email.includes("@"))
    .map((r) => ({
      email: r.email.toLowerCase(),
      id: r.id,
      name: r.name?.trim() || r.email,
    }));

  const search = options.search?.trim().toLowerCase();
  if (!search) {
    return recipients;
  }
  return recipients.filter(
    (r) => r.name.toLowerCase().includes(search) || r.email.includes(search)
  );
};

export const mergeRecipients = (attio, sanity) => {
  const byEmail = new Map();
  for (const r of sanity) {
    byEmail.set(r.email, r);
  }
  for (const r of attio) {
    byEmail.set(r.email, r);
  }
  return [...byEmail.values()].toSorted((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
};
