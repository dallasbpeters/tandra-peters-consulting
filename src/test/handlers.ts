import { HttpResponse, http } from "msw";

import { CONTACT_API_PATH } from "../components/contact";

const SANITY_API_RE = /api\.sanity\.io\//;

export const handlers = [
  http.post(CONTACT_API_PATH, () =>
    HttpResponse.json({ ok: true }, { status: 200 })
  ),
  // Catch-all for Sanity read queries so components that fetch CMS data during
  // tests don't produce "unhandled request" noise in the MSW log.
  http.get(SANITY_API_RE, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";

    // adCreativeVersion list — return empty array
    if (query.includes("adCreativeVersion")) {
      return HttpResponse.json({ ms: 0, query, result: [] });
    }

    // Default: empty result for any other unhandled Sanity query
    return HttpResponse.json({ ms: 0, query, result: null });
  }),
];
