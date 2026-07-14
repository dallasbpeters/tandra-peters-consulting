/**
 * Pure helpers for the GA4 "Total vs. Real traffic" comparison.
 *
 * "Real" traffic excludes the site owner's own (internal) visits. GA4 stamps
 * internal hits with an event parameter (default `traffic_type = "internal"`)
 * once an internal-traffic rule is defined in the console. To make that param
 * queryable through the Data API, the owner registers an event-scoped custom
 * dimension, which the API exposes as `customEvent:<param>`.
 *
 * This module is intentionally free of `@google-analytics/data` types so the
 * math (total / real / internal split + delta) and the graceful-degradation
 * detection can be unit-tested in isolation. The serverless handler
 * (`api/analytics.ts`) wires these into real `runReport` calls.
 *
 * NOTE: keep this file dependency-free and do not import from `src/` — it is
 * consumed by a Vercel serverless function.
 */

export const DEFAULT_INTERNAL_PARAM = "traffic_type";
export const DEFAULT_INTERNAL_VALUE = "internal";

/**
 * Resolve the internal-traffic event-parameter name from an env value,
 * falling back to the GA4 default (`traffic_type`) when unset/blank.
 */
export const resolveInternalParam = (raw?: string | null): string => {
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_INTERNAL_PARAM;
};

/**
 * Resolve the value GA4 stamps on internal events (default `internal`).
 */
export const resolveInternalValue = (raw?: string | null): string => {
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_INTERNAL_VALUE;
};

/**
 * The Data API dimension name for an event-scoped custom dimension backed by
 * the given event parameter.
 */
export const customTrafficDimension = (param: string): string =>
  `customEvent:${param}`;

interface StringFilterExpression {
  filter: {
    fieldName: string;
    stringFilter: { matchType: "EXACT"; value: string };
  };
}

interface NotFilterExpression {
  notExpression: StringFilterExpression;
}

/**
 * Filter matching ONLY internal traffic (the delta / "you").
 */
export const internalTrafficFilter = (
  dimension: string,
  internalValue: string
): StringFilterExpression => ({
  filter: {
    fieldName: dimension,
    stringFilter: { matchType: "EXACT", value: internalValue },
  },
});

/**
 * Filter matching REAL traffic: everything that is NOT stamped internal. Rows
 * where the param is unset are real and are therefore included (the negation of
 * an EXACT match leaves unset values in).
 */
export const realTrafficFilter = (
  dimension: string,
  internalValue: string
): NotFilterExpression => ({
  notExpression: internalTrafficFilter(dimension, internalValue),
});

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") {
      return message;
    }
  }
  return "";
};

const INVALID_DIMENSION_HINTS = [
  "not a valid dimension",
  "is not a valid",
  "isn't a valid",
  "did you mean",
  "not compatible",
];

/** gRPC status code for INVALID_ARGUMENT (google.rpc.Code). */
const GRPC_INVALID_ARGUMENT = 3;

/**
 * Pull any structured error detail (details / statusDetails / errorInfos /
 * metadata) into a single searchable string. gRPC/gax surface these fields
 * inconsistently, so we stringify whatever is present.
 */
const extractErrorDetails = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }
  const record = error as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["details", "statusDetails", "errorInfos", "metadata"]) {
    const value = record[key];
    if (typeof value === "string") {
      parts.push(value);
    } else if (value != null) {
      try {
        parts.push(JSON.stringify(value));
      } catch {
        // Ignore values that can't be serialized (e.g. circular metadata).
      }
    }
  }
  return parts.join(" ");
};

const extractGrpcCode = (error: unknown): number | undefined => {
  if (error && typeof error === "object" && "code" in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === "number") {
      return code;
    }
  }
  return undefined;
};

/**
 * Detect the "custom dimension is not registered yet" failure so the dashboard
 * degrades to Total-only instead of 500-ing the whole request.
 *
 * This is ONLY consulted in the custom-dimension report path (internal / real /
 * daily-split reports). Those reports' only new input versus the always-safe
 * Total reports — which already succeeded before we get here — is
 * `customEvent:<param>` and its filter, so an INVALID_ARGUMENT at this point is
 * the unregistered dimension.
 *
 * Detection layers, most-specific first:
 *  1. The error text (message OR structured details) names the field AND reads
 *     like a validity complaint — the classic "Field customEvent:… is not a
 *     valid dimension" shape.
 *  2. gRPC `code === 3` (INVALID_ARGUMENT). The REAL Data API failure for a
 *     missing custom dimension arrives as `code: 3` with an EMPTY, unhelpful
 *     message, so text alone misses it. Within this scoped path we treat code 3
 *     as recoverable when it references the field, has no message at all, or
 *     still looks like a dimension-validity complaint.
 *
 * Genuine auth (codes 16 / 7), quota (code 8), network, and other non-code-3
 * failures fall through to `false` and PROPAGATE (→ 500), as does a code-3 whose
 * message describes an unrelated invalid argument.
 */
export const isUnregisteredCustomDimensionError = (
  error: unknown,
  dimension: string
): boolean => {
  const field = dimension.toLowerCase();
  const haystack = `${extractErrorMessage(error)} ${extractErrorDetails(error)}`
    .trim()
    .toLowerCase();
  const referencesField =
    haystack.includes(field) || haystack.includes("customevent:");
  const looksLikeInvalidDimension = INVALID_DIMENSION_HINTS.some((hint) =>
    haystack.includes(hint)
  );

  // 1. Text clearly names the field and complains about validity.
  if (referencesField && looksLikeInvalidDimension) {
    return true;
  }

  // 2. gRPC INVALID_ARGUMENT in the (scoped) custom-dimension report path.
  if (extractGrpcCode(error) === GRPC_INVALID_ARGUMENT) {
    if (referencesField) {
      return true;
    }
    if (haystack.length === 0) {
      // code 3 with an empty message — the observed real-world shape.
      return true;
    }
    // Non-empty, field-agnostic message: only recoverable if it still reads as
    // a dimension-validity complaint; otherwise it's an unrelated bad argument.
    return looksLikeInvalidDimension;
  }

  return false;
};

export interface RawDailyRow {
  date: string;
  trafficType: string;
  screenPageViews: number;
  sessions: number;
}

export interface DailyPoint {
  date: string;
  /** Total (real + internal) — the backward-compatible plotted value. */
  screenPageViews: number;
  sessions: number;
  realScreenPageViews: number;
  realSessions: number;
  internalScreenPageViews: number;
  internalSessions: number;
}

const emptyDailyPoint = (date: string): DailyPoint => ({
  date,
  internalScreenPageViews: 0,
  internalSessions: 0,
  realScreenPageViews: 0,
  realSessions: 0,
  screenPageViews: 0,
  sessions: 0,
});

/**
 * Collapse a `date × traffic_type` report into one point per date carrying
 * total, real, and internal counts. Rows arrive pre-sorted by date (GA
 * `orderBys`), and insertion order is preserved so the trend stays chronological.
 *
 * Counts (page views / sessions) sum cleanly across the traffic_type split, so
 * total = real + internal here. (Users are deliberately NOT split this way — see
 * the handler, which runs dedicated total/real/internal overview reports because
 * unique users don't sum across dimension rows.)
 */
export const splitDailyRows = (
  rows: RawDailyRow[],
  internalValue: string
): DailyPoint[] => {
  const byDate = new Map<string, DailyPoint>();
  for (const row of rows) {
    let point = byDate.get(row.date);
    if (!point) {
      point = emptyDailyPoint(row.date);
      byDate.set(row.date, point);
    }
    point.screenPageViews += row.screenPageViews;
    point.sessions += row.sessions;
    if (row.trafficType === internalValue) {
      point.internalScreenPageViews += row.screenPageViews;
      point.internalSessions += row.sessions;
    } else {
      point.realScreenPageViews += row.screenPageViews;
      point.realSessions += row.sessions;
    }
  }
  return [...byDate.values()];
};

export interface Overview {
  totalUsers: number;
  sessions: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
}

export const emptyOverview = (): Overview => ({
  averageSessionDuration: 0,
  bounceRate: 0,
  screenPageViews: 0,
  sessions: 0,
  totalUsers: 0,
});

/**
 * Build the `{ total, real, internal }` overview triad. When the internal
 * filter isn't available yet, Real mirrors Total and Internal is all-zero so
 * the UI shows no (misleading) delta.
 */
export const buildOverviewComparison = (params: {
  total: Overview;
  real?: Overview;
  internal?: Overview;
  internalFilterAvailable: boolean;
}): { total: Overview; real: Overview; internal: Overview } => {
  if (!params.internalFilterAvailable) {
    return {
      internal: emptyOverview(),
      real: params.total,
      total: params.total,
    };
  }
  return {
    internal: params.internal ?? emptyOverview(),
    real: params.real ?? params.total,
    total: params.total,
  };
};

/**
 * Convert a GA `YYYYMMDD` date dimension into an ISO `YYYY-MM-DD` string.
 */
export const formatGaDate = (raw: string): string =>
  raw.length === 8
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    : raw;

export const toNumber = (value: unknown): number => Number(value ?? 0);
