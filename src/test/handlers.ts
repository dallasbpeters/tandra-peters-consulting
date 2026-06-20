import { HttpResponse, http } from "msw";

import { CONTACT_API_PATH } from "../components/contact";

export const handlers = [
  http.post(CONTACT_API_PATH, () =>
    HttpResponse.json({ ok: true }, { status: 200 })
  ),
];
