/**
 * Recipient sourcing + report sending for the Photo Report tool. Merges the
 * server recipient list (Attio + Sanity) with the signed-in user's Google
 * Contacts (People API, via a `contacts.readonly` access token) and posts to
 * `/api/reports-send`.
 */
export interface Recipient {
  email: string;
  id: string;
  name: string;
  source: "crm" | "google";
}

interface PeopleName {
  displayName?: string;
}
interface PeopleEmail {
  value?: string;
}
interface PeoplePerson {
  emailAddresses?: PeopleEmail[];
  names?: PeopleName[];
  resourceName?: string;
}

const authHeaders = (idToken: string): HeadersInit => ({
  Authorization: `Bearer ${idToken}`,
});

export const fetchServerRecipients = async (
  idToken: string,
  search: string
): Promise<Recipient[]> => {
  const url = search
    ? `/api/email/recipients?search=${encodeURIComponent(search)}`
    : "/api/email/recipients";
  const response = await fetch(url, { headers: authHeaders(idToken) });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as {
    recipients?: { email: string; id?: string; name?: string }[];
  };
  return (data.recipients ?? []).map((r) => ({
    email: r.email,
    id: r.id ?? "",
    name: r.name ?? r.email,
    source: "crm" as const,
  }));
};

const mapPeople = (people: PeoplePerson[]): Recipient[] => {
  const out: Recipient[] = [];
  for (const person of people) {
    const email = person.emailAddresses?.[0]?.value?.trim().toLowerCase();
    if (!email) {
      continue;
    }
    out.push({
      email,
      id: person.resourceName ?? "",
      name: person.names?.[0]?.displayName?.trim() || email,
      source: "google",
    });
  }
  return out;
};

interface PeopleErrorBody {
  error?: { message?: string; status?: string };
}

const fetchJson = async <T>(url: string, headers: HeadersInit): Promise<T> => {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as PeopleErrorBody;
    const detail = body.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Google People API error: ${detail}`);
  }
  return res.json() as Promise<T>;
};

export const fetchGoogleContacts = async (
  accessToken: string
): Promise<Recipient[]> => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [connections, other] = await Promise.all([
    fetchJson<{ connections?: PeoplePerson[] }>(
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=1000",
      headers
    ),
    fetchJson<{ otherContacts?: PeoplePerson[] }>(
      "https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses&pageSize=1000",
      headers
    ),
  ]);
  const people = [
    ...(connections.connections ?? []),
    ...(other.otherContacts ?? []),
  ];
  return mapPeople(people);
};

export const mergeRecipients = (...lists: Recipient[][]): Recipient[] => {
  const seen = new Map<string, Recipient>();
  for (const list of lists) {
    for (const recipient of list) {
      if (!seen.has(recipient.email)) {
        seen.set(recipient.email, recipient);
      }
    }
  }
  return [...seen.values()].toSorted((a, b) => a.name.localeCompare(b.name));
};

export interface SendReportParams {
  driveWebViewLink?: string;
  idToken: string;
  message: string;
  pdfUrl: string;
  recipients: { email: string; id?: string; name?: string }[];
  reportTitle: string;
  subject: string;
}

export interface SendReportResult {
  attached: boolean;
  failed: { email: string; error: string }[];
  sent: string[];
}

export const sendReport = async ({
  driveWebViewLink,
  idToken,
  message,
  pdfUrl,
  recipients,
  reportTitle,
  subject,
}: SendReportParams): Promise<SendReportResult> => {
  const response = await fetch("/api/reports-send", {
    body: JSON.stringify({
      driveWebViewLink,
      message,
      pdfUrl,
      recipients,
      reportTitle,
      subject,
    }),
    headers: { ...authHeaders(idToken), "Content-Type": "application/json" },
    method: "POST",
  });
  const data = (await response.json()) as SendReportResult & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Could not send the report.");
  }
  return data;
};
