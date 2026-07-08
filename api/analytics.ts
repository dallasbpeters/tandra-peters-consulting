import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

async function fetchAnalytics(days: number) {
  const client = createGaClient();
  const property = `properties/${process.env.GA_PROPERTY_ID}`;
  const startDate = `${days}daysAgo`;
  const endDate = "today";

  const [overview, topPages, topSources, dailyTrend] = await Promise.all([
    client.runReport({
      dateRanges: [{ endDate, startDate }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      property,
    }),
    client.runReport({
      dateRanges: [{ endDate, startDate }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      limit: 10,
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ desc: true, metric: { metricName: "screenPageViews" } }],
      property,
    }),
    client.runReport({
      dateRanges: [{ endDate, startDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      limit: 8,
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      property,
    }),
    client.runReport({
      dateRanges: [{ endDate, startDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      property,
    }),
  ]);

  const overviewRow = overview[0]?.rows?.[0];
  return {
    dailyTrend: (dailyTrend[0]?.rows ?? []).map((row) => {
      const raw = row.dimensionValues?.[0]?.value ?? "";
      const date =
        raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw;
      return {
        date,
        screenPageViews: Number(row.metricValues?.[0]?.value ?? 0),
        sessions: Number(row.metricValues?.[1]?.value ?? 0),
      };
    }),
    overview: {
      averageSessionDuration: Number(
        overviewRow?.metricValues?.[4]?.value ?? 0
      ),
      bounceRate: Number(overviewRow?.metricValues?.[3]?.value ?? 0),
      screenPageViews: Number(overviewRow?.metricValues?.[2]?.value ?? 0),
      sessions: Number(overviewRow?.metricValues?.[1]?.value ?? 0),
      totalUsers: Number(overviewRow?.metricValues?.[0]?.value ?? 0),
    },
    period: `${days}d`,
    topPages: (topPages[0]?.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value ?? "",
      pageTitle: row.dimensionValues?.[1]?.value ?? "",
      screenPageViews: Number(row.metricValues?.[0]?.value ?? 0),
      totalUsers: Number(row.metricValues?.[1]?.value ?? 0),
    })),
    topSources: (topSources[0]?.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      totalUsers: Number(row.metricValues?.[1]?.value ?? 0),
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
