import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { collectSubmitRecipients } from "./desk-direct-mail.js";

// A drawn/selected zone matches many homes. The submit must mail the WHOLE set
// (deduped), not a single address (the old test-mode bug) nor the ~60-address
// preview sample. These tests exercise the real recipient-building function
// with a mocked RentCast response.

const property = (
  addressLine1: string,
  zipCode: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  addressLine1,
  city: "Austin",
  state: "TX",
  zipCode,
  ...extra,
});

const mockRentcast = (properties: Record<string, unknown>[]): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(properties),
      } as Response)
    )
  );
};

const payload = {
  neighborhoods: [{ latitude: 30.31, longitude: -97.71 }],
};

describe(collectSubmitRecipients, () => {
  beforeEach(() => {
    process.env.RENTCAST_API_KEY = "test-rentcast-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RENTCAST_API_KEY;
  });

  const mixedProperties = [
    property("100 Oak St", "78724"),
    property("200 Elm St", "78724", { state: "tx" }),
    property("300 Pine St", "78724", { city: "", state: "" }),
    property("100 Oak St", "78724"), // duplicate of the first → collapsed
    { formattedAddress: "No line1, dropped" }, // no addressLine1 → dropped
    property("400 Birch St", ""), // no zip → dropped
  ];

  it("returns the FULL deduped recipient set (not one, not a sample)", async () => {
    mockRentcast(mixedProperties);

    const result = await collectSubmitRecipients(payload);

    expect(result.status).toBe("configured");
    expect(result.totalMatched).toBe(3);
    // The whole batch — K > 1 — is what a K-address zone must submit.
    expect(result.recipients).toHaveLength(3);
    expect(
      result.recipients.map((recipient) => recipient.addressLine1)
    ).toStrictEqual(["100 Oak St", "200 Elm St", "300 Pine St"]);
  });

  it("normalizes recipient fields (default city/state, upper-cased state)", async () => {
    mockRentcast(mixedProperties);

    const result = await collectSubmitRecipients(payload);

    expect(result.recipients[1].state).toBe("TX");
    expect(result.recipients[2].city).toBe("Austin");
    expect(result.recipients[2].state).toBe("TX");
  });

  it("reports missing-key with no recipients when RentCast is unconfigured", async () => {
    delete process.env.RENTCAST_API_KEY;
    mockRentcast([property("100 Oak St", "78724")]);

    const result = await collectSubmitRecipients(payload);

    expect(result.status).toBe("missing-key");
    expect(result.recipients).toStrictEqual([]);
    expect(result.totalMatched).toBe(0);
  });

  it("is unavailable when no query has coordinates", async () => {
    mockRentcast([property("100 Oak St", "78724")]);

    const result = await collectSubmitRecipients({ neighborhoods: [{}] });

    expect(result.status).toBe("unavailable");
    expect(result.recipients).toStrictEqual([]);
  });
});
