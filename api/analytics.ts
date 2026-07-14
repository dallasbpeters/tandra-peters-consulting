import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  buildOverviewComparison,
  customTrafficDimension,
  formatGaDate,
  internalTrafficFilter,
  isUnregisteredCustomDimensionError,
  realTrafficFilter,
  resolveInternalParam,
  resolveInternalValue,
  splitDailyRows,
  toNumber,
} from "./lib/analytics-traffic-split.js";
import type { Overview } from "./lib/analytics-traffic-split.js";

const ENV_ALLOWED_ORIGINS = "GA_DASHBOARD_ALLOWED_ORIGINS";
// Matches any Sanity-hosted studio: https://{anything}.sanity.studio
const SANITY_STUDIO_RE = /^https:\/\/[a-z0-9-]+\.sanity\.studio$/iu;
const LOCAL_ORIGINS = new Set([
  "http://localhost:3333",
  "http://127.0.0.1:3333",
]);

const parseAllowedOrigins = (): string[] => {
  const fromEnv = process.env[ENV_ALLOWED_ORIGINS]?.trim();
  if (!fromEnv) {
    return [];
  }
  return fromEnv
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const isTrustedOrigin = (origin: string): boolean => {
  if (SANITY_STUDIO_RE.test(origin)) {
    return true;
  }
  if (LOCAL_ORIGINS.has(origin)) {
    return true;
  }
  return parseAllowedOrigins().includes(origin);
};

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }
  return isTrustedOrigin(origin);
};

const applyCors = (res: VercelResponse, origin: string | undefined) => {
  if (!(origin && isTrustedOrigin(origin))) {
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
};

function createGaClient() {
  const privateKey = process.env.GA_PRIVATE_KEY?.replaceAll("\\n", "\n");
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
  });
}

const OVERVIEW_METRICS = [
  { name: "totalUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "bounceRate" },
  { name: "averageSessionDuration" },
];

// `ReturnType<runReport>` resolves to the callback overload (`void`), so type
// the response structurally from the fields actually read here.
interface GaMetricRow {
  metricValues?: ({ value?: string | null } | null)[] | null;
}
interface GaReportResponse {
  rows?: (GaMetricRow | null)[] | null;
}

const overviewFromReport = (report: GaReportResponse | undefined): Overview => {
  const row = report?.rows?.[0];
  return {
    averageSessionDuration: toNumber(row?.metricValues?.[4]?.value),
    bounceRate: toNumber(row?.metricValues?.[3]?.value),
    screenPageViews: toNumber(row?.metricValues?.[2]?.value),
    sessions: toNumber(row?.metricValues?.[1]?.value),
    totalUsers: toNumber(row?.metricValues?.[0]?.value),
  };
};

async function fetchAnalytics(days: number) {
  const client = createGaClient();
  const property = `properties/${process.env.GA_PROPERTY_ID}`;
  const startDate = `${days}daysAgo`;
  const endDate = "today";
  const dateRanges = [{ endDate, startDate }];

  const internalParam = resolveInternalParam(
    process.env.GA_INTERNAL_TRAFFIC_PARAM
  );
  const internalValue = resolveInternalValue(
    process.env.GA_INTERNAL_TRAFFIC_VALUE
  );
  const trafficDimension = customTrafficDimension(internalParam);

  // Reports that never reference the custom dimension — always safe to run.
  const [overviewTotalReport, topPages, topSources] = await Promise.all([
    client.runReport({ dateRanges, metrics: OVERVIEW_METRICS, property }),
    client.runReport({
      dateRanges,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      limit: 10,
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ desc: true, metric: { metricName: "screenPageViews" } }],
      property,
    }),
    client.runReport({
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      limit: 8,
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      property,
    }),
  ]);

  const totalOverview = overviewFromReport(overviewTotalReport[0]);

  let internalFilterAvailable = true;
  let realOverview: Overview | undefined;
  let internalOverview: Overview | undefined;
  let dailyTrend: ReturnType<typeof splitDailyRows>;

  try {
    // Users don't sum across dimension rows, so Real/Internal overviews are
    // dedicated filtered reports rather than a row subtraction. The daily trend
    // (page views / sessions) DOES split cleanly, so it runs as one
    // date × traffic_type report.
    const [realReport, internalReport, dailySplitReport] = await Promise.all([
      client.runReport({
        dateRanges,
        dimensionFilter: realTrafficFilter(trafficDimension, internalValue),
        metrics: OVERVIEW_METRICS,
        property,
      }),
      client.runReport({
        dateRanges,
        dimensionFilter: internalTrafficFilter(trafficDimension, internalValue),
        metrics: OVERVIEW_METRICS,
        property,
      }),
      client.runReport({
        dateRanges,
        dimensions: [{ name: "date" }, { name: trafficDimension }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        property,
      }),
    ]);

    realOverview = overviewFromReport(realReport[0]);
    internalOverview = overviewFromReport(internalReport[0]);
    dailyTrend = splitDailyRows(
      (dailySplitReport[0]?.rows ?? []).map((row) => ({
        date: formatGaDate(row.dimensionValues?.[0]?.value ?? ""),
        screenPageViews: toNumber(row.metricValues?.[0]?.value),
        sessions: toNumber(row.metricValues?.[1]?.value),
        trafficType: row.dimensionValues?.[1]?.value ?? "",
      })),
      internalValue
    );
  } catch (error) {
    if (!isUnregisteredCustomDimensionError(error, trafficDimension)) {
      throw error;
    }
    // Custom dimension isn't registered yet: degrade to Total-only rather than
    // failing the whole dashboard. Real mirrors Total; Internal is zero.
    internalFilterAvailable = false;
    const dailyTrendReport = await client.runReport({
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      property,
    });
    dailyTrend = (dailyTrendReport[0]?.rows ?? []).map((row) => {
      const screenPageViews = toNumber(row.metricValues?.[0]?.value);
      const sessions = toNumber(row.metricValues?.[1]?.value);
      return {
        date: formatGaDate(row.dimensionValues?.[0]?.value ?? ""),
        internalScreenPageViews: 0,
        internalSessions: 0,
        realScreenPageViews: screenPageViews,
        realSessions: sessions,
        screenPageViews,
        sessions,
      };
    });
  }

  const overview = buildOverviewComparison({
    internal: internalOverview,
    internalFilterAvailable,
    real: realOverview,
    total: totalOverview,
  });

  return {
    dailyTrend,
    internalFilterAvailable,
    // Backward-compatible flat overview mirrors the Real view (what the
    // dashboard defaults to). `overviewComparison` carries all three views.
    overview: internalFilterAvailable ? overview.real : overview.total,
    overviewComparison: overview,
    period: `${days}d`,
    topPages: (topPages[0]?.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value ?? "",
      pageTitle: row.dimensionValues?.[1]?.value ?? "",
      screenPageViews: toNumber(row.metricValues?.[0]?.value),
      totalUsers: toNumber(row.metricValues?.[1]?.value),
    })),
    topSources: (topSources[0]?.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "",
      sessions: toNumber(row.metricValues?.[0]?.value),
      totalUsers: toNumber(row.metricValues?.[1]?.value),
    })),
  };
}

export default async function analyticsHandler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string | undefined;

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));

  try {
    const data = await fetchAnalytics(days);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    res.status(200).json(data);
  } catch (error) {
    console.error("[api/analytics]", error);
    res.status(500).json({ error: "Failed to load analytics data." });
  }
}
