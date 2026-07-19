import { describe, expect, it } from "vitest";

import { mergeRecipients } from "../report-recipients";
import type { Recipient } from "../report-recipients";

const crm: Recipient[] = [
  { email: "b@x.com", id: "1", name: "Bea", source: "crm" },
  { email: "a@x.com", id: "2", name: "Al", source: "crm" },
];
const google: Recipient[] = [
  { email: "a@x.com", id: "g1", name: "Al (Google)", source: "google" },
  { email: "c@x.com", id: "g2", name: "Cy", source: "google" },
];

describe(mergeRecipients, () => {
  it("dedupes by email, keeping the first source, and sorts by name", () => {
    const merged = mergeRecipients(crm, google);
    expect(merged.map((r) => r.email)).toStrictEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
    // The CRM entry wins the dedupe for the shared email.
    expect(merged.find((r) => r.email === "a@x.com")?.source).toBe("crm");
  });

  it("returns an empty list when no sources are given", () => {
    expect(mergeRecipients()).toStrictEqual([]);
  });
});
