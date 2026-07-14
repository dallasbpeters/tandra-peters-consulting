import { describe, expect, it } from "vitest";

import {
  buildOverviewComparison,
  customTrafficDimension,
  emptyOverview,
  internalTrafficFilter,
  isUnregisteredCustomDimensionError,
  realTrafficFilter,
  resolveInternalParam,
  resolveInternalValue,
  splitDailyRows,
} from "./analytics-traffic-split.js";
import type { Overview } from "./analytics-traffic-split.js";

describe("resolveInternalParam / resolveInternalValue", () => {
  it("defaults to traffic_type / internal when unset or blank", () => {
    expect(resolveInternalParam()).toBe("traffic_type");
    expect(resolveInternalParam("   ")).toBe("traffic_type");
    expect(resolveInternalValue(null)).toBe("internal");
  });

  it("honors configured overrides (trimmed)", () => {
    expect(resolveInternalParam("  my_flag ")).toBe("my_flag");
    expect(resolveInternalValue("staff")).toBe("staff");
  });
});

describe("filter builders", () => {
  it("real filter negates an EXACT internal match (unset rows stay in)", () => {
    const dim = customTrafficDimension("traffic_type");
    expect(realTrafficFilter(dim, "internal")).toStrictEqual({
      notExpression: {
        filter: {
          fieldName: "customEvent:traffic_type",
          stringFilter: { matchType: "EXACT", value: "internal" },
        },
      },
    });
  });

  it("internal filter matches ONLY internal traffic", () => {
    expect(
      internalTrafficFilter("customEvent:traffic_type", "internal")
    ).toStrictEqual({
      filter: {
        fieldName: "customEvent:traffic_type",
        stringFilter: { matchType: "EXACT", value: "internal" },
      },
    });
  });
});

describe(splitDailyRows, () => {
  it("splits total into real + internal per date and preserves order", () => {
    const rows = [
      { date: "2026-07-01", screenPageViews: 8, sessions: 5, trafficType: "" },
      {
        date: "2026-07-01",
        screenPageViews: 2,
        sessions: 1,
        trafficType: "internal",
      },
      {
        date: "2026-07-02",
        screenPageViews: 10,
        sessions: 6,
        trafficType: "(not set)",
      },
    ];
    const result = splitDailyRows(rows, "internal");
    expect(result).toStrictEqual([
      {
        date: "2026-07-01",
        internalScreenPageViews: 2,
        internalSessions: 1,
        realScreenPageViews: 8,
        realSessions: 5,
        screenPageViews: 10,
        sessions: 6,
      },
      {
        date: "2026-07-02",
        internalScreenPageViews: 0,
        internalSessions: 0,
        realScreenPageViews: 10,
        realSessions: 6,
        screenPageViews: 10,
        sessions: 6,
      },
    ]);
    // total === real + internal for counts
    for (const pt of result) {
      expect(pt.screenPageViews).toBe(
        pt.realScreenPageViews + pt.internalScreenPageViews
      );
      expect(pt.sessions).toBe(pt.realSessions + pt.internalSessions);
    }
  });

  it("returns an empty array for no rows", () => {
    expect(splitDailyRows([], "internal")).toStrictEqual([]);
  });
});

describe(buildOverviewComparison, () => {
  const total: Overview = {
    averageSessionDuration: 90,
    bounceRate: 0.4,
    screenPageViews: 100,
    sessions: 60,
    totalUsers: 40,
  };

  it("returns total/real/internal when the filter is available", () => {
    const real: Overview = { ...total, screenPageViews: 80, totalUsers: 33 };
    const internal: Overview = {
      ...emptyOverview(),
      screenPageViews: 20,
      totalUsers: 7,
    };
    const result = buildOverviewComparison({
      internal,
      internalFilterAvailable: true,
      real,
      total,
    });
    expect(result.total).toBe(total);
    expect(result.real).toBe(real);
    expect(result.internal).toBe(internal);
  });

  it("mirrors real to total and zeroes internal when unavailable", () => {
    const result = buildOverviewComparison({
      internalFilterAvailable: false,
      total,
    });
    expect(result.real).toBe(total);
    expect(result.internal).toStrictEqual(emptyOverview());
  });
});

describe(isUnregisteredCustomDimensionError, () => {
  const dim = "customEvent:traffic_type";

  it("flags GA's unregistered-dimension error", () => {
    const err = new Error(
      "Field customEvent:traffic_type is not a valid dimension for this property."
    );
    expect(isUnregisteredCustomDimensionError(err, dim)).toBeTruthy();
  });

  it("flags a 'did you mean' variant naming the field", () => {
    const err = new Error(
      "customEvent:traffic_type. Did you mean customEvent:traffic_source?"
    );
    expect(isUnregisteredCustomDimensionError(err, dim)).toBeTruthy();
  });

  it("flags the real gax shape: gRPC code 3 with an EMPTY message", () => {
    // The live Data API failure for an unregistered custom dimension arrives as
    // INVALID_ARGUMENT (code 3) with no useful message — this is the user's
    // current property state that previously 500'd the dashboard.
    expect(
      isUnregisteredCustomDimensionError({ code: 3, message: "" }, dim)
    ).toBeTruthy();
    expect(isUnregisteredCustomDimensionError({ code: 3 }, dim)).toBeTruthy();
  });

  it("flags code 3 when structured details reference the field", () => {
    expect(
      isUnregisteredCustomDimensionError(
        {
          code: 3,
          details: "field customEvent:traffic_type is not a valid dimension",
          message: "",
        },
        dim
      )
    ).toBeTruthy();
  });

  it("does NOT swallow a genuine, unrelated INVALID_ARGUMENT (code 3)", () => {
    expect(
      isUnregisteredCustomDimensionError(
        {
          code: 3,
          message:
            "Request contains an invalid date range: startDate malformed.",
        },
        dim
      )
    ).toBeFalsy();
  });

  it("does NOT swallow auth / permission / quota / network errors", () => {
    // Auth (16 UNAUTHENTICATED) and permission (7 PERMISSION_DENIED), even with
    // an empty message, must propagate — only code 3 is scoped-recoverable.
    expect(
      isUnregisteredCustomDimensionError({ code: 16, message: "" }, dim)
    ).toBeFalsy();
    expect(
      isUnregisteredCustomDimensionError(
        { code: 7, message: "PERMISSION_DENIED: caller lacks permission" },
        dim
      )
    ).toBeFalsy();
    // Quota (8 RESOURCE_EXHAUSTED) — even if the message happens to name the
    // field, the wrong code + non-validity text must not be swallowed.
    expect(
      isUnregisteredCustomDimensionError(
        { code: 8, message: "customEvent:traffic_type quota exceeded" },
        dim
      )
    ).toBeFalsy();
    expect(
      isUnregisteredCustomDimensionError(
        new Error("PERMISSION_DENIED: caller lacks permission"),
        dim
      )
    ).toBeFalsy();
    expect(
      isUnregisteredCustomDimensionError(
        new Error("customEvent:traffic_type quota exceeded"),
        dim
      )
    ).toBeFalsy();
  });

  it("handles non-Error inputs safely", () => {
    expect(isUnregisteredCustomDimensionError(null, dim)).toBeFalsy();
    expect(isUnregisteredCustomDimensionError(undefined, dim)).toBeFalsy();
    expect(
      isUnregisteredCustomDimensionError(
        { message: "Field customEvent:traffic_type is not a valid dimension." },
        dim
      )
    ).toBeTruthy();
  });
});
