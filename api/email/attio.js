const ATTIO_QUERY_URL = "https://api.attio.com/v2/objects/people/records/query";
const ATTIO_NOTES_URL = "https://api.attio.com/v2/notes";

const recordToRecipient = (record) => {
  const email = record.values?.email_addresses
    ?.find((e) => e.email_address)
    ?.email_address?.trim();
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
    [nameValue?.first_name, nameValue?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    email;

  return { id: recordId, name, email: email.toLowerCase() };
};

export const listAttioPeople = async (token, options = {}) => {
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
    throw new Error(
      `Attio query failed (${res.status}): ${body.slice(0, 300)}`
    );
  }

  const json = await res.json();
  const recipients = (json.data ?? [])
    .map(recordToRecipient)
    .filter((r) => r !== null);

  const search = options.search?.trim().toLowerCase();
  if (!search) {
    return recipients;
  }
  return recipients.filter(
    (r) => r.name.toLowerCase().includes(search) || r.email.includes(search)
  );
};

export const postAttioPersonNote = async (token, recordId, title, content) => {
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
