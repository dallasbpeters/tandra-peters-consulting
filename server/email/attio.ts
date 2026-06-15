/**
 * Read/write helpers for Attio People, scoped to the email composer.
 * Reuses the same ATTIO_API_TOKEN as the website contact form.
 */
import type { EmailRecipient } from "./types.js";

const ATTIO_QUERY_URL = "https://api.attio.com/v2/objects/people/records/query";
const ATTIO_NOTES_URL = "https://api.attio.com/v2/notes";

type AttioNameValue = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
};
type AttioEmailValue = { email_address?: string };

type AttioRecord = {
  id?: { record_id?: string };
  values?: {
    name?: AttioNameValue[];
    email_addresses?: AttioEmailValue[];
  };
};

const recordToRecipient = (record: AttioRecord): EmailRecipient | null => {
  const email = record.values?.email_addresses?.find((e) => e.email_address)?.email_address?.trim();
  if (!email) {
    return null;
  }
  const recordId = record.id?.record_id;
  if (!recordId) {
    return null;
  }
  const nameValue = record.values?.name?.[0];
  const name =
    nameValue?.full_name?.trim() ||
    [nameValue?.first_name, nameValue?.last_name].filter(Boolean).join(" ").trim() ||
    email;

  return { id: recordId, name, email: email.toLowerCase() };
};

/**
 * List People that have at least one email address. Optionally filter by a
 * case-insensitive substring on name or email (client-side, since the volume
 * here is a single consultant's contact book).
 */
export const listAttioPeople = async (
  token: string,
  options: { limit?: number; search?: string } = {},
): Promise<EmailRecipient[]> => {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  const res = await fetch(ATTIO_QUERY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit,
      sorts: [{ attribute: "name", direction: "asc" }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Attio query failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { data?: AttioRecord[] };
  const recipients = (json.data ?? [])
    .map(recordToRecipient)
    .filter((r): r is EmailRecipient => r !== null);

  const search = options.search?.trim().toLowerCase();
  if (!search) {
    return recipients;
  }
  return recipients.filter(
    (r) => r.name.toLowerCase().includes(search) || r.email.includes(search),
  );
};

/** Append a plaintext note to a person's timeline (used to log sent emails). */
export const postAttioPersonNote = async (
  token: string,
  recordId: string,
  title: string,
  content: string,
): Promise<boolean> => {
  try {
    const res = await fetch(ATTIO_NOTES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          parent_object: "people",
          parent_record_id: recordId,
          title: title.slice(0, 500),
          format: "plaintext",
          content: content.replace(/\0/g, "").slice(0, 100_000),
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};
