import { createClient } from "@sanity/client";
import groq from "groq";
import fs from "node:fs/promises";
import { plainTextFromRich } from "../../src/portableText/plainText";

type SeoAuditStatus = "good" | "warning" | "critical";
type SeoRecommendationPriority = "high" | "medium" | "low";

type SeoAuditItem = {
  path: string;
  title: string;
  score: number;
  status: SeoAuditStatus;
  issues: string[];
  actions: string[];
  updatedAt?: string;
};

type SeoRecommendation = {
  title: string;
  detail: string;
  priority: SeoRecommendationPriority;
  source: "ai" | "rules";
};

type SeoDashboardPayload = {
  generatedAt: string;
  sourceStatus: {
    posthogConnected: boolean;
    aiConnected: boolean;
    siteUrl: string;
    notes: string[];
  };
  overview: {
    technicalScore: number;
    contentScore: number;
    opportunities: number;
    totalPages: number;
    totalPublishedPosts: number;
    criticalIssues: number;
    warningIssues: number;
  };
  analytics: {
    status: AnalyticsStatus;
    connected: boolean;
    timeframeLabel: string;
    scopeLabel: string;
    pageviews7d: number | null;
    visitors7d: number | null;
    leads7d: number | null;
    ctaClicks7d: number | null;
    deltaPageviews: number | null;
    deltaLeads: number | null;
    topPages: Array<{ path: string; pageviews: number }>;
    dailyPageviews: Array<{ date: string; pageviews: number }>;
  };
  content: {
    publishedPosts: number;
    stalePosts: number;
    missingSeoDescription: number;
    missingExcerpt: number;
    missingImage: number;
    thinContentPosts: number;
    postsWithoutInternalLinks: number;
    postsWithWeakStructure: number;
    categories: Array<{ slug: string; label: string; count: number }>;
  };
  contentAnalyses: SeoContentAnalysisItem[];
  audits: SeoAuditItem[];
  recommendations: SeoRecommendation[];
  opportunities: Array<{
    type: "fix" | "refresh" | "new-content";
    title: string;
    detail: string;
    target: string;
    impact: "high" | "medium" | "low";
  }>;
  aiSummary: string | null;
};

type AnalyticsStatus = "connected" | "missing_config" | "error";

type SeoContentAnalysisItem = {
  path: string;
  title: string;
  categoryLabel: string;
  score: number;
  status: SeoAuditStatus;
  wordCount: number;
  readingMinutes: number;
  headingCount: number;
  listCount: number;
  internalLinks: number;
  externalLinks: number;
  titleLength: number;
  excerptLength: number;
  seoDescriptionLength: number;
  updatedAt?: string;
  issues: string[];
  actions: string[];
};

type PostRecord = {
  _id: string;
  title?: string | null;
  slug?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
  _createdAt?: string | null;
  excerpt?: string | null;
  seoDescription?: string | null;
  authorName?: string | null;
  image?: string | null;
  category?: string | null;
  body?: unknown;
};

type SanityDashboardQuery = {
  homePage: {
    seoTitle?: string | null;
    seoDescription?: string | null;
    hero?: {
      badge?: string | null;
      titleLine1?: string | null;
      titleLine2?: string | null;
      subtitle?: unknown;
    } | null;
    articlesTeaser?: {
      title?: string | null;
      intro?: unknown;
      maxPosts?: number | null;
    } | null;
  } | null;
  articlesPage: {
    pageTitle?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    intro?: unknown;
  } | null;
  siteSettings: {
    title?: string | null;
    navTitle?: string | null;
  } | null;
  posts: PostRecord[];
};

type PosthogOverviewRow = {
  pageviews_7d?: number | string | null;
  visitors_7d?: number | string | null;
  leads_7d?: number | string | null;
  cta_clicks_7d?: number | string | null;
};

type PosthogDeltaRow = {
  pageviews_prev_7d?: number | string | null;
  leads_prev_7d?: number | string | null;
};

type PosthogDailyRow = {
  day?: string | null;
  pageviews?: number | string | null;
};

type PosthogTopPageRow = {
  url?: string | null;
  pageviews?: number | string | null;
};

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-01-01";
const DEFAULT_SITE_URL = "https://www.tandra.me";

const CATEGORY_LABELS: Record<string, string> = {
  "roof-replacement": "Roof replacement",
  "insurance-claims": "Insurance claims",
  inspections: "Inspections",
  maintenance: "Maintenance",
  "texas-homeowners": "Texas homeowners",
};

const CATEGORY_BRIEFS: Record<
  string,
  { title: string; detail: string; target: string; impact: "high" | "medium" | "low" }
> = {
  "roof-replacement": {
    title: "Add a pricing-focused roof replacement guide",
    detail:
      "A cost-and-scope article can capture high-intent homeowners earlier in the buying cycle and support quote CTAs from a stronger informational page.",
    target: "/articles",
    impact: "high",
  },
  "insurance-claims": {
    title: "Publish an insurance timeline and paperwork checklist",
    detail:
      "Claims searches usually carry urgency. A checklist piece can win trust, reduce confusion, and feed both storm and inspection pages.",
    target: "/articles",
    impact: "high",
  },
  inspections: {
    title: "Create an inspection red-flags explainer with visuals",
    detail:
      "Inspection content is a good bridge between awareness traffic and service inquiries, especially when paired with before/after proof points.",
    target: "/articles",
    impact: "medium",
  },
  maintenance: {
    title: "Build a seasonal roof maintenance checklist",
    detail:
      "Maintenance content is usually easier to rank for and helps you create more internal links into higher-conversion service pages.",
    target: "/articles",
    impact: "medium",
  },
  "texas-homeowners": {
    title: "Expand Texas-specific weather and code coverage",
    detail:
      "Texas-specific search intent is already a strength. More localized guidance can reinforce topical authority around weather, materials, and homeowner expectations.",
    target: "/articles",
    impact: "medium",
  },
};

const DASHBOARD_QUERY = groq`{
  "homePage": *[_id == "homePage"][0]{
    seoTitle,
    seoDescription,
    hero { badge, titleLine1, titleLine2, subtitle },
    articlesTeaser { title, intro, maxPosts }
  },
  "articlesPage": *[_id == "articlesPage"][0]{
    pageTitle,
    seoTitle,
    seoDescription,
    intro
  },
  "siteSettings": *[_id == "siteSettings"][0]{
    title,
    navTitle
  },
  "posts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    _updatedAt,
    _createdAt,
    excerpt,
    seoDescription,
    authorName,
    category,
    "image": image.asset->url,
    body
  }
}`;

const parseNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const clampScore = (score: number): number =>
  Math.max(0, Math.min(100, Math.round(score)));

const scoreToStatus = (score: number): SeoAuditStatus => {
  if (score < 60) {
    return "critical";
  }
  if (score < 85) {
    return "warning";
  }
  return "good";
};

const trim = (value: string | null | undefined): string => value?.trim() ?? "";

const hasPortableTextContent = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some((block) => {
    if (!block || typeof block !== "object") {
      return false;
    }
    const children = (block as { children?: unknown }).children;
    if (!Array.isArray(children)) {
      return false;
    }
    return children.some((child) => {
      if (!child || typeof child !== "object") {
        return false;
      }
      const text = (child as { text?: unknown }).text;
      return typeof text === "string" && text.trim().length > 0;
    });
  });
};

type PortableTextChild = {
  _type?: unknown;
  text?: unknown;
  marks?: unknown;
};

type PortableTextMarkDef = {
  _key?: unknown;
  _type?: unknown;
  href?: unknown;
};

type PortableTextBlockLike = {
  _type?: unknown;
  style?: unknown;
  listItem?: unknown;
  children?: unknown;
  markDefs?: unknown;
};

const getPortableTextBlocks = (value: unknown): PortableTextBlockLike[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (block): block is PortableTextBlockLike =>
      typeof block === "object" &&
      block !== null &&
      (block as { _type?: unknown })._type === "block",
  );
};

const countWords = (value: unknown): number => {
  const text = plainTextFromRich(value).trim();
  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
};

const countHeadings = (blocks: PortableTextBlockLike[]): number =>
  blocks.filter((block) => {
    const style = typeof block.style === "string" ? block.style : "";
    return style === "h2" || style === "h3";
  }).length;

const countListItems = (blocks: PortableTextBlockLike[]): number =>
  blocks.filter((block) => typeof block.listItem === "string" && block.listItem.length > 0).length;

const getHrefType = (
  href: string,
  siteUrl: string,
): "internal" | "external" | "ignore" => {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return "ignore";
  }

  if (href.startsWith("/")) {
    return "internal";
  }

  try {
    const site = new URL(siteUrl);
    const url = new URL(href, site.origin);
    return getAnalyticsHostnames(siteUrl).includes(url.hostname.toLowerCase())
      ? "internal"
      : "external";
  } catch {
    return "ignore";
  }
};

const countLinks = (
  value: unknown,
  siteUrl: string,
): { internalLinks: number; externalLinks: number } => {
  const blocks = getPortableTextBlocks(value);
  let internalLinks = 0;
  let externalLinks = 0;

  for (const block of blocks) {
    const markDefs = Array.isArray(block.markDefs)
      ? block.markDefs.filter(
          (markDef): markDef is PortableTextMarkDef =>
            typeof markDef === "object" && markDef !== null,
        )
      : [];
    const linkMarkDefs = new Map(
      markDefs
        .filter(
          (markDef) =>
            markDef._type === "link" &&
            typeof markDef._key === "string" &&
            typeof markDef.href === "string",
        )
        .map((markDef) => [markDef._key as string, markDef.href as string]),
    );

    const children = Array.isArray(block.children)
      ? block.children.filter(
          (child): child is PortableTextChild =>
            typeof child === "object" && child !== null,
        )
      : [];

    for (const child of children) {
      const marks = Array.isArray(child.marks)
        ? child.marks.filter((mark): mark is string => typeof mark === "string")
        : [];
      const hrefs = new Set(
        marks
          .map((mark) => linkMarkDefs.get(mark))
          .filter((href): href is string => typeof href === "string" && href.length > 0),
      );

      for (const href of hrefs) {
        const type = getHrefType(href, siteUrl);
        if (type === "internal") {
          internalLinks += 1;
        } else if (type === "external") {
          externalLinks += 1;
        }
      }
    }
  }

  return { internalLinks, externalLinks };
};

const formatArticlePath = (slug: string | null | undefined): string => `/articles/${trim(slug)}`;

const getPosthogPersonalApiKey = (): string =>
  trim(process.env.POSTHOG_PERSONAL_API_KEY) ||
  trim(process.env.POSTHOG_PERSONALAPI_KEY);

const hasPosthogConfig = (): boolean =>
  getPosthogPersonalApiKey().length > 0 &&
  trim(process.env.POSTHOG_PROJECT_ID).length > 0;

const getSiteUrl = (): string =>
  trim(process.env.VITE_SITE_URL).replace(/\/$/, "") || DEFAULT_SITE_URL;

const getAnalyticsHostnames = (siteUrl: string): string[] => {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase();
    const values = new Set<string>([hostname]);
    if (hostname.startsWith("www.")) {
      values.add(hostname.slice(4));
    } else {
      values.add(`www.${hostname}`);
    }
    return Array.from(values);
  } catch {
    return ["www.tandra.me", "tandra.me"];
  }
};

const buildCurrentUrlFilter = (siteUrl: string): string => {
  const clauses = getAnalyticsHostnames(siteUrl).flatMap((hostname) => [
    `lower(toString(properties.$current_url)) LIKE 'https://${hostname}%'`,
    `lower(toString(properties.$current_url)) LIKE 'http://${hostname}%'`,
  ]);
  return clauses.length > 1 ? `(${clauses.join(" OR ")})` : clauses[0] ?? "1 = 0";
};

const getPosthogHost = (): string => {
  const direct = trim(process.env.POSTHOG_API_HOST).replace(/\/$/, "");
  if (direct) {
    return direct;
  }

  const uiHost = trim(process.env.VITE_PUBLIC_POSTHOG_UI_HOST).replace(/\/$/, "");
  if (uiHost) {
    return uiHost;
  }

  const ingestion = trim(process.env.VITE_PUBLIC_POSTHOG_HOST).replace(/\/$/, "");
  if (/^https:\/\/us\.i\.posthog\.com$/i.test(ingestion)) {
    return "https://us.posthog.com";
  }
  if (/^https:\/\/eu\.i\.posthog\.com$/i.test(ingestion)) {
    return "https://eu.posthog.com";
  }

  return "https://us.posthog.com";
};

const daysSince = (iso: string | null | undefined): number | null => {
  if (!iso) {
    return null;
  }
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return null;
  }
  return Math.floor((Date.now() - time) / 86_400_000);
};

const getPostFreshnessDate = (post: PostRecord): string | null | undefined =>
  post._updatedAt ?? post._createdAt ?? post.publishedAt;

const toObjectRows = <T extends Record<string, unknown>>(payload: unknown): T[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const source = payload as {
    results?: unknown;
    columns?: unknown;
  };
  const { results, columns } = source;

  if (!Array.isArray(results)) {
    return [];
  }

  if (results.length === 0) {
    return [];
  }

  if (typeof results[0] === "object" && results[0] !== null && !Array.isArray(results[0])) {
    return results as T[];
  }

  if (Array.isArray(columns) && Array.isArray(results[0])) {
    const keys = columns.map((column) => String(column));
    return results.map((row) => {
      const values = Array.isArray(row) ? row : [];
      return Object.fromEntries(keys.map((key, index) => [key, values[index]])) as T;
    });
  }

  return [];
};

const normalizePath = (rawUrl: string | null | undefined, siteUrl: string): string => {
  const value = trim(rawUrl);
  if (!value) {
    return "/";
  }

  try {
    const site = new URL(siteUrl);
    const allowedHosts = new Set(getAnalyticsHostnames(siteUrl));
    const url = value.startsWith("http")
      ? new URL(value)
      : new URL(value, site.origin);
    const path = `${url.pathname}${url.search ? "" : ""}`;
    if (allowedHosts.has(url.hostname.toLowerCase())) {
      return path || "/";
    }
    return `${url.hostname}${path || "/"}`;
  } catch {
    return value.replace(/[?#].*$/, "") || "/";
  }
};

const aggregateTopPages = (
  rows: Array<{ path: string; pageviews: number }>,
): Array<{ path: string; pageviews: number }> => {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.path, (totals.get(row.path) ?? 0) + row.pageviews);
  }

  return Array.from(totals.entries())
    .map(([path, pageviews]) => ({ path, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 8);
};

const buildSanityClient = () =>
  createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  });

const fetchSanityContent = async (): Promise<SanityDashboardQuery> => {
  const client = buildSanityClient();
  const result = await client.fetch<SanityDashboardQuery>(DASHBOARD_QUERY);
  return {
    homePage: result?.homePage ?? null,
    articlesPage: result?.articlesPage ?? null,
    siteSettings: result?.siteSettings ?? null,
    posts: Array.isArray(result?.posts) ? result.posts : [],
  };
};

const readIndexHtml = async (): Promise<string> => {
  try {
    return await fs.readFile(new URL("../../index.html", import.meta.url), "utf8");
  } catch {
    return "";
  }
};

const fetchPosthogRows = async <T extends Record<string, unknown>>(
  sql: string,
  name: string,
): Promise<T[]> => {
  const personalApiKey = getPosthogPersonalApiKey();
  const projectId = trim(process.env.POSTHOG_PROJECT_ID);
  if (!personalApiKey || !projectId) {
    return [];
  }

  const response = await fetch(`${getPosthogHost()}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${personalApiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: sql,
      },
      name,
      refresh: "force_blocking",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog query failed (${response.status}): ${body.slice(0, 240)}`);
  }

  return toObjectRows<T>(await response.json());
};

const buildAnalytics = async (siteUrl: string) => {
  const connected = hasPosthogConfig();
  const scopeLabel = "Production hostname traffic only";

  if (!connected) {
    return {
      status: "missing_config" as AnalyticsStatus,
      connected: false,
      timeframeLabel: "Last 7 days",
      scopeLabel,
      pageviews7d: null,
      visitors7d: null,
      leads7d: null,
      ctaClicks7d: null,
      deltaPageviews: null,
      deltaLeads: null,
      topPages: [],
      dailyPageviews: [],
    };
  }

  try {
    const currentUrlFilter = buildCurrentUrlFilter(siteUrl);
    const [overviewRows, deltaRows, dailyRows, topPageRows] = await Promise.all([
      fetchPosthogRows<PosthogOverviewRow>(
        `
        SELECT
          countIf(event = '$pageview') AS pageviews_7d,
          uniqIf(distinct_id, event = '$pageview') AS visitors_7d,
          countIf(event = 'contact_form_submitted') AS leads_7d,
          countIf(event IN ('hero_cta_clicked', 'nav_cta_clicked', 'service_cta_clicked')) AS cta_clicks_7d
        FROM events
        WHERE timestamp >= now() - INTERVAL 7 DAY
          AND ${currentUrlFilter}
        `,
        "seo_dashboard_overview_last_7d",
      ),
      fetchPosthogRows<PosthogDeltaRow>(
        `
        SELECT
          countIf(event = '$pageview') AS pageviews_prev_7d,
          countIf(event = 'contact_form_submitted') AS leads_prev_7d
        FROM events
        WHERE timestamp >= now() - INTERVAL 14 DAY
          AND timestamp < now() - INTERVAL 7 DAY
          AND ${currentUrlFilter}
        `,
        "seo_dashboard_previous_window",
      ),
      fetchPosthogRows<PosthogDailyRow>(
        `
        SELECT
          toString(toDate(timestamp)) AS day,
          count() AS pageviews
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 14 DAY
          AND ${currentUrlFilter}
        GROUP BY day
        ORDER BY day ASC
        `,
        "seo_dashboard_daily_pageviews",
      ),
      fetchPosthogRows<PosthogTopPageRow>(
        `
        SELECT
          properties.$current_url AS url,
          count() AS pageviews
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
          AND ${currentUrlFilter}
          AND properties.$current_url IS NOT NULL
        GROUP BY url
        ORDER BY pageviews DESC
        LIMIT 8
        `,
        "seo_dashboard_top_pages",
      ),
    ]);

    const overview = overviewRows[0] ?? {};
    const delta = deltaRows[0] ?? {};

    return {
      status: "connected" as AnalyticsStatus,
      connected: true,
      timeframeLabel: "Last 7 days",
      scopeLabel,
      pageviews7d: parseNumber(overview.pageviews_7d),
      visitors7d: parseNumber(overview.visitors_7d),
      leads7d: parseNumber(overview.leads_7d),
      ctaClicks7d: parseNumber(overview.cta_clicks_7d),
      deltaPageviews:
        parseNumber(overview.pageviews_7d) - parseNumber(delta.pageviews_prev_7d),
      deltaLeads:
        parseNumber(overview.leads_7d) - parseNumber(delta.leads_prev_7d),
      topPages: aggregateTopPages(
        topPageRows
          .map((row) => ({
            path: normalizePath(row.url, siteUrl),
            pageviews: parseNumber(row.pageviews),
          }))
          .filter((row) => row.pageviews > 0),
      ),
      dailyPageviews: dailyRows
        .map((row) => ({
          date: trim(row.day),
          pageviews: parseNumber(row.pageviews),
        }))
        .filter((row) => row.date.length > 0),
    };
  } catch {
    return {
      status: "error" as AnalyticsStatus,
      connected: false,
      timeframeLabel: "Last 7 days",
      scopeLabel,
      pageviews7d: null,
      visitors7d: null,
      leads7d: null,
      ctaClicks7d: null,
      deltaPageviews: null,
      deltaLeads: null,
      topPages: [],
      dailyPageviews: [],
    };
  }
};

const buildAudit = (input: Omit<SeoAuditItem, "status">): SeoAuditItem => ({
  ...input,
  status: scoreToStatus(input.score),
});

const buildContentAnalysis = (args: {
  post: PostRecord;
  siteUrl: string;
  siblingPosts: PostRecord[];
}): SeoContentAnalysisItem => {
  const blocks = getPortableTextBlocks(args.post.body);
  const wordCount = countWords(args.post.body);
  const headingCount = countHeadings(blocks);
  const listCount = countListItems(blocks);
  const { internalLinks, externalLinks } = countLinks(args.post.body, args.siteUrl);
  const excerptLength = trim(args.post.excerpt).length;
  const seoDescriptionLength = trim(args.post.seoDescription).length;
  const titleLength = trim(args.post.title).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const issues: string[] = [];
  const actions: string[] = [];
  let score = 100;

  if (wordCount < 500) {
    score -= 18;
    issues.push(`Body is thin at ${wordCount} words.`);
    actions.push("Expand this article past 700 words with concrete homeowner questions, examples, or step-by-step guidance.");
  } else if (wordCount < 800) {
    score -= 10;
    issues.push(`Body is only ${wordCount} words, which limits topical depth.`);
    actions.push("Add one or two more sections so the article covers the topic more completely.");
  }

  if (headingCount === 0) {
    score -= 10;
    issues.push("Body has no H2 or H3 subheads.");
    actions.push("Break the article into clear H2 sections so readers and crawlers can scan the main ideas.");
  } else if (wordCount >= 700 && headingCount < 2) {
    score -= 6;
    issues.push(`Body has ${headingCount} subhead for ${wordCount} words of copy.`);
    actions.push("Add another H2 or H3 so the article structure is easier to follow.");
  }

  if (internalLinks === 0) {
    score -= 12;
    issues.push("Body has no internal links to related site content.");
    const relatedTargets = args.siblingPosts
      .filter((post) => post._id !== args.post._id && trim(post.slug).length > 0)
      .slice(0, 2)
      .map((post) => `"${trim(post.title) || formatArticlePath(post.slug)}"`)
      .join(" and ");
    actions.push(
      relatedTargets
        ? `Add 1-2 internal links to ${relatedTargets}, plus the articles hub if it fits naturally.`
        : "Add at least one internal link to the articles hub or another closely related page on the site.",
    );
  }

  if (!trim(args.post.seoDescription)) {
    score -= 18;
    issues.push("SEO description is missing.");
    actions.push("Fill `seoDescription` in Sanity with a specific 140-160 character summary of the article promise.");
  } else if (seoDescriptionLength < 120 || seoDescriptionLength > 170) {
    score -= 6;
    issues.push(`SEO description is ${seoDescriptionLength} characters.`);
    actions.push("Tighten `seoDescription` toward roughly 140-160 characters so the snippet is easier to display cleanly.");
  }

  if (!trim(args.post.excerpt)) {
    score -= 12;
    issues.push("Article excerpt is missing.");
    actions.push("Add a 1-2 sentence excerpt for cards, shares, and listing views.");
  } else if (excerptLength < 110) {
    score -= 5;
    issues.push(`Excerpt is only ${excerptLength} characters.`);
    actions.push("Lengthen the excerpt so article cards explain the value of clicking through.");
  }

  if (!trim(args.post.image)) {
    score -= 10;
    issues.push("Lead image is missing.");
    actions.push("Upload a lead image so article cards and social shares look complete.");
  }

  if (!trim(args.post.authorName)) {
    score -= 6;
    issues.push("Author name is missing.");
    actions.push("Add the author name so the article carries a clearer byline.");
  }

  const age = daysSince(getPostFreshnessDate(args.post));
  if (age !== null && age > 180) {
    score -= 10;
    issues.push(`Last updated ${age} days ago.`);
    actions.push("Refresh the copy in Sanity with newer examples, clearer links, and up-to-date local context.");
  }

  if (issues.length === 0) {
    issues.push("Metadata, structure, and internal linking all look healthy.");
    actions.push("Keep this article as the quality bar for future posts.");
  }

  return {
    path: formatArticlePath(args.post.slug),
    title: trim(args.post.title) || "Untitled article",
    categoryLabel: (
      CATEGORY_LABELS[trim(args.post.category)] ??
      trim(args.post.category).replace(/-/g, " ")
    ) || "Uncategorized",
    score: clampScore(score),
    status: scoreToStatus(score),
    wordCount,
    readingMinutes,
    headingCount,
    listCount,
    internalLinks,
    externalLinks,
    titleLength,
    excerptLength,
    seoDescriptionLength,
    updatedAt: getPostFreshnessDate(args.post) ?? undefined,
    issues,
    actions,
  };
};

const buildRuleRecommendations = (args: {
  missingSeoDescription: number;
  missingExcerpt: number;
  missingImage: number;
  stalePosts: number;
  thinContentPosts: SeoContentAnalysisItem[];
  postsWithoutInternalLinks: SeoContentAnalysisItem[];
  postsWithWeakStructure: SeoContentAnalysisItem[];
  technicalScore: number;
  analyticsStatus: AnalyticsStatus;
  topCategory: { label: string; count: number } | null;
  totalPublishedPosts: number;
  categories: Array<{ slug: string; label: string; count: number }>;
}) => {
  const recommendations: SeoRecommendation[] = [];

  if (args.technicalScore < 70) {
    recommendations.push({
      title: "Complete missing SEO fields first",
      detail:
        "The fastest technical gain is filling the missing homepage and articles-page SEO fields so your primary entry pages have focused search intent before you expand the content backlog.",
      priority: "high",
      source: "rules",
    });
  }

  if (args.missingSeoDescription > 0) {
    recommendations.push({
      title: "Finish missing search snippets first",
      detail: `${args.missingSeoDescription} published article${args.missingSeoDescription === 1 ? "" : "s"} still ${args.missingSeoDescription === 1 ? "is" : "are"} missing \`seoDescription\`. That is a concrete Sanity fix you can make before creating anything new.`,
      priority: "high",
      source: "rules",
    });
  }

  if (args.missingExcerpt > 0 || args.missingImage > 0) {
    recommendations.push({
      title: "Improve share readiness on article cards",
      detail: `${args.missingExcerpt} article excerpt${args.missingExcerpt === 1 ? "" : "s"} and ${args.missingImage} article image${args.missingImage === 1 ? "" : "s"} are missing. That hurts click-through from listing pages and social shares.`,
      priority: "medium",
      source: "rules",
    });
  }

  if (args.thinContentPosts.length > 0) {
    recommendations.push({
      title: "Deepen the thinnest published posts",
      detail: `${args.thinContentPosts.length} article${args.thinContentPosts.length === 1 ? "" : "s"} ${args.thinContentPosts.length === 1 ? "is" : "are"} under 800 words, including ${args.thinContentPosts
        .slice(0, 2)
        .map((post) => `"${post.title}" (${post.wordCount} words)`)
        .join(" and ")}. Expanding existing winners is a lower-risk move than inventing a whole new cluster.`,
      priority: "medium",
      source: "rules",
    });
  }

  if (args.postsWithoutInternalLinks.length > 0) {
    recommendations.push({
      title: "Add internal links inside published articles",
      detail: `${args.postsWithoutInternalLinks.length} article${args.postsWithoutInternalLinks.length === 1 ? " currently has" : " currently have"} zero internal links. Start with ${args.postsWithoutInternalLinks
        .slice(0, 2)
        .map((post) => `"${post.title}"`)
        .join(" and ")} so each post supports the rest of the site instead of standing alone.`,
      priority: "medium",
      source: "rules",
    });
  }

  if (args.postsWithWeakStructure.length > 0) {
    recommendations.push({
      title: "Clean up article structure with clearer subheads",
      detail:
        `${args.postsWithWeakStructure.length} article${args.postsWithWeakStructure.length === 1 ? " needs" : " need"} stronger section structure. Add more H2/H3 breaks to long blocks of copy so homeowners can scan the answer quickly.`,
      priority: "medium",
      source: "rules",
    });
  }

  if (args.stalePosts > 0) {
    recommendations.push({
      title: "Refresh older articles with current Texas roofing context",
      detail:
        `${args.stalePosts} post${args.stalePosts === 1 ? "" : "s"} ha${args.stalePosts === 1 ? "s" : "ve"} not been updated in Sanity for over six months. Refreshing those pages is still a lower-risk win than creating everything net new.`,
      priority: "medium",
      source: "rules",
    });
  }

  if (args.analyticsStatus === "missing_config") {
    recommendations.push({
      title: "Connect server-side PostHog credentials",
      detail:
        "The dashboard can already audit content, but traffic and conversion charts stay dark until the PostHog personal API key and project ID are available to the API runtime.",
      priority: "medium",
      source: "rules",
    });
  }

  if (args.analyticsStatus === "error") {
    recommendations.push({
      title: "Fix the PostHog query connection",
      detail:
        "The dashboard can see PostHog is configured, but the server-side query request is still failing. Check the API host, token scope, and project id pairing.",
      priority: "medium",
      source: "rules",
    });
  }

  const emptyCategories = args.categories.filter((category) => category.count === 0);
  if (args.topCategory && emptyCategories.length > 0 && args.totalPublishedPosts > 0) {
    recommendations.push({
      title: "Balance category coverage before expanding the biggest cluster",
      detail: `${args.topCategory.count} of ${args.totalPublishedPosts} published article${args.totalPublishedPosts === 1 ? "" : "s"} sit in ${args.topCategory.label.toLowerCase()}, while ${emptyCategories
        .slice(0, 2)
        .map((category) => category.label.toLowerCase())
        .join(" and ")} have no published posts yet.`,
      priority: "low",
      source: "rules",
    });
  }

  return recommendations.slice(0, 5);
};

const buildOpportunities = (args: {
  audits: SeoAuditItem[];
  contentAnalyses: SeoContentAnalysisItem[];
  categories: Array<{ slug: string; label: string; count: number }>;
  missingSeoDescription: number;
  missingExcerpt: number;
  missingImage: number;
}) => {
  const opportunities: SeoDashboardPayload["opportunities"] = [];

  const homeAudit = args.audits.find((audit) => audit.path === "/");
  if (homeAudit && homeAudit.status !== "good") {
    opportunities.push({
      type: "fix",
      title: "Tighten homepage metadata and hero messaging",
      detail:
        "Update the homepage hero fields directly in Sanity: `homePage.hero.titleLine1`, `homePage.hero.titleLine2`, `homePage.hero.badge`, and `homePage.hero.subtitle`. The homepage meta title/description are currently code-owned in `src/pages/Home.tsx`, so this opportunity is about on-page messaging, not missing SEO fields.",
      target: "/",
      impact: "high",
    });
  }

  const articlesAudit = args.audits.find((audit) => audit.path === "/articles");
  if (articlesAudit && articlesAudit.status !== "good") {
    opportunities.push({
      type: "fix",
      title: "Optimize the articles hub as a real landing page",
      detail:
        "In Sanity Studio, open the `articlesPage` document and fill `seoTitle` plus `seoDescription`. If you want the page to target a tighter search phrase, update `pageTitle` and `intro` there too.",
      target: "/articles",
      impact: "high",
    });
  }

  if (args.missingSeoDescription > 0 || args.missingExcerpt > 0 || args.missingImage > 0) {
    opportunities.push({
      type: "fix",
      title: "Finish article card and search snippet coverage",
      detail: `There are still content hygiene gaps across published articles: ${args.missingSeoDescription} missing SEO descriptions, ${args.missingExcerpt} missing excerpts, and ${args.missingImage} missing lead images. These are direct Sanity edits, not strategy guesses.`,
      target: "/articles",
      impact: "medium",
    });
  }

  for (const analysis of args.contentAnalyses
    .filter((item) => item.status !== "good")
    .slice(0, 3)) {
    opportunities.push({
      type: analysis.score < 80 ? "refresh" : "fix",
      title: `Improve "${analysis.title}"`,
      detail: `${analysis.title} currently scores ${analysis.score}/100. It has ${analysis.wordCount} words, ${analysis.headingCount} subheads, ${analysis.internalLinks} internal link${analysis.internalLinks === 1 ? "" : "s"}, and ${analysis.externalLinks} supporting outbound link${analysis.externalLinks === 1 ? "" : "s"}. Start with: ${analysis.actions[0]}`,
      target: analysis.path,
      impact: analysis.score < 70 ? "high" : "medium",
    });
  }

  const underweightedCategories = [...args.categories]
    .sort((a, b) => a.count - b.count)
    .slice(0, 2);

  for (const category of underweightedCategories) {
    const brief = CATEGORY_BRIEFS[category.slug];
    if (!brief) {
      continue;
    }
    opportunities.push({
      type: "new-content",
      title: brief.title,
      detail: `${brief.detail} Create it as a new ` + "`post`" + ` in Sanity, assign the category ` + "`" + `${category.slug}` + "`" + `, and link it from the articles hub plus at least one related existing article. Current coverage: ${category.count} published article${category.count === 1 ? "" : "s"} in ${category.label.toLowerCase()}.`,
      target: brief.target,
      impact: brief.impact,
    });
  }

  return opportunities.slice(0, 6);
};

const buildExecutiveSummary = (args: {
  analytics: SeoDashboardPayload["analytics"];
  content: SeoDashboardPayload["content"];
  contentAnalyses: SeoContentAnalysisItem[];
  topCategory: { label: string; count: number } | null;
}): string => {
  const weakest = args.contentAnalyses.filter((item) => item.status !== "good");
  const weakestTitles = weakest
    .slice(0, 2)
    .map((item) => `"${item.title}"`)
    .join(" and ");
  const emptyCategories = args.content.categories.filter((category) => category.count === 0);

  const parts: string[] = [];
  parts.push(
    `This dashboard is using measured Sanity content, not guessed strategy copy. Across ${args.content.publishedPosts} published article${args.content.publishedPosts === 1 ? "" : "s"}, ${args.content.thinContentPosts} article${args.content.thinContentPosts === 1 ? "" : "s"} ${args.content.thinContentPosts === 1 ? "is" : "are"} under 800 words, ${args.content.postsWithoutInternalLinks} article${args.content.postsWithoutInternalLinks === 1 ? "" : "s"} ${args.content.postsWithoutInternalLinks === 1 ? "has" : "have"} no internal links, and ${args.content.postsWithWeakStructure} article${args.content.postsWithWeakStructure === 1 ? "" : "s"} ${args.content.postsWithWeakStructure === 1 ? "needs" : "need"} clearer H2/H3 structure.`,
  );

  if (args.topCategory && args.content.publishedPosts > 0) {
    const categoryDetail =
      emptyCategories.length > 0
        ? `${args.topCategory.label} is currently the deepest category at ${args.topCategory.count} post${args.topCategory.count === 1 ? "" : "s"}, while ${emptyCategories
            .slice(0, 2)
            .map((category) => category.label.toLowerCase())
            .join(" and ")} still have no published coverage.`
        : `${args.topCategory.label} is currently the deepest category at ${args.topCategory.count} post${args.topCategory.count === 1 ? "" : "s"}.`;
    parts.push(categoryDetail);
  }

  if (args.analytics.connected) {
    parts.push(
      `Production traffic over the last 7 days is ${args.analytics.pageviews7d ?? 0} pageviews, ${args.analytics.visitors7d ?? 0} visitors, and ${args.analytics.leads7d ?? 0} leads, so the clearest next move is improving the existing articles that already exist${weakestTitles ? `, starting with ${weakestTitles}` : ""}.`,
    );
  } else if (weakestTitles) {
    parts.push(`The clearest next move is improving the existing articles that already exist, starting with ${weakestTitles}.`);
  }

  return parts.join(" ");
};

export const getSeoDashboard = async (): Promise<SeoDashboardPayload> => {
  const [contentData, indexHtml, analytics] = await Promise.all([
    fetchSanityContent(),
    readIndexHtml(),
    buildAnalytics(getSiteUrl()),
  ]);

  const siteUrl = getSiteUrl();
  const posts = contentData.posts.filter((post) => trim(post.slug).length > 0);
  const publishedPosts = posts.length;
  const missingSeoDescription = posts.filter((post) => trim(post.seoDescription).length === 0).length;
  const missingExcerpt = posts.filter((post) => trim(post.excerpt).length === 0).length;
  const missingImage = posts.filter((post) => trim(post.image).length === 0).length;
  const stalePosts = posts.filter((post) => {
    const age = daysSince(getPostFreshnessDate(post));
    return age !== null && age > 180;
  });

  const categoryCounts = new Map<string, number>();
  for (const post of posts) {
    const slug = trim(post.category) || "uncategorized";
    categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
  }

  const categories = Object.entries(CATEGORY_LABELS)
    .map(([slug, label]) => ({
      slug,
      label,
      count: categoryCounts.get(slug) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const uncategorizedCount = categoryCounts.get("uncategorized") ?? 0;
  if (uncategorizedCount > 0) {
    categories.push({
      slug: "uncategorized",
      label: "Uncategorized",
      count: uncategorizedCount,
    });
  }

  const postsByCategory = new Map<string, PostRecord[]>();
  for (const post of posts) {
    const categorySlug = trim(post.category) || "uncategorized";
    const current = postsByCategory.get(categorySlug) ?? [];
    current.push(post);
    postsByCategory.set(categorySlug, current);
  }

  const contentAnalyses = posts
    .map((post) =>
      buildContentAnalysis({
        post,
        siteUrl,
        siblingPosts: postsByCategory.get(trim(post.category) || "uncategorized") ?? [],
      }),
    )
    .sort((a, b) => a.score - b.score);

  const thinContentPosts = contentAnalyses.filter((post) => post.wordCount < 800);
  const postsWithoutInternalLinks = contentAnalyses.filter((post) => post.internalLinks === 0);
  const postsWithWeakStructure = contentAnalyses.filter((post) => {
    if (post.wordCount >= 700) {
      return post.headingCount < 2;
    }
    return post.headingCount === 0;
  });

  const contentScore = clampScore(
    publishedPosts === 0
      ? 0
      : ((publishedPosts - missingSeoDescription) / publishedPosts) * 28 +
          ((publishedPosts - missingExcerpt) / publishedPosts) * 14 +
          ((publishedPosts - missingImage) / publishedPosts) * 12 +
          ((publishedPosts - stalePosts.length) / publishedPosts) * 10 +
          ((publishedPosts - thinContentPosts.length) / publishedPosts) * 18 +
          ((publishedPosts - postsWithoutInternalLinks.length) / publishedPosts) * 10 +
          ((publishedPosts - postsWithWeakStructure.length) / publishedPosts) * 8,
  );

  const shellChecks = {
    hasCanonical: /rel=["']canonical["']/i.test(indexHtml),
    hasOgImage: /property=["']og:image["']/i.test(indexHtml),
    hasTwitterImage: /name=["']twitter:image["']/i.test(indexHtml),
    hasFbAppId: /property=["']fb:app_id["']/i.test(indexHtml),
  };

  const globalIssues: string[] = [];
  const globalActions: string[] = [];
  if (!shellChecks.hasCanonical) {
    globalIssues.push("Canonical link tag is missing from the static document shell.");
    globalActions.push("Add a canonical tag in index.html so every entry point has a stable default URL.");
  }
  if (!shellChecks.hasOgImage) {
    globalIssues.push("Open Graph image tag is missing from the static document shell.");
    globalActions.push("Add an og:image tag that points at a branded social card.");
  }
  if (!shellChecks.hasTwitterImage) {
    globalIssues.push("Twitter image tag is missing from the static document shell.");
    globalActions.push("Add twitter:image so X shares use the same branded image.");
  }
  if (!shellChecks.hasFbAppId) {
    globalIssues.push("Facebook app id is missing from the static document shell.");
    globalActions.push("Add fb:app_id in index.html for cleaner Facebook debugging and attribution.");
  }

  const homeIssues: string[] = [];
  const homeActions: string[] = [];
  const hero = contentData.homePage?.hero;
  const hasHomeSeoTitle = trim(contentData.homePage?.seoTitle).length > 0;
  const hasHomeSeoDescription = trim(contentData.homePage?.seoDescription).length > 0;
  const hasHeroHeading =
    trim(hero?.titleLine1).length > 0 || trim(hero?.titleLine2).length > 0;
  const hasHeroSupport =
    trim(hero?.badge).length > 0 || hasPortableTextContent(hero?.subtitle);

  if (!hasHomeSeoTitle) {
    homeIssues.push("Homepage SEO title is missing.");
    homeActions.push(
      "Set homePage.seoTitle in Sanity Studio so the homepage title is managed with the rest of the content model.",
    );
  }
  if (!hasHomeSeoDescription) {
    homeIssues.push("Homepage SEO description is missing.");
    homeActions.push(
      "Set homePage.seoDescription in Sanity Studio so the homepage has a dedicated meta description for search and social previews.",
    );
  }
  if (!hasHeroHeading) {
    homeIssues.push("Homepage hero heading is thin or missing in Sanity.");
    homeActions.push(
      "Update homePage.hero.titleLine1 and/or homePage.hero.titleLine2 in Sanity so the homepage opens with a clear, keyword-relevant message.",
    );
  }
  if (!hasHeroSupport) {
    homeIssues.push("Homepage hero support copy is thin or missing in Sanity.");
    homeActions.push(
      "Fill in homePage.hero.badge or homePage.hero.subtitle in Sanity to add supporting context under the main homepage heading.",
    );
  }

  const articlesIssues: string[] = [];
  const articlesActions: string[] = [];
  if (!trim(contentData.articlesPage?.seoTitle)) {
    articlesIssues.push("Articles hub SEO title is missing.");
    articlesActions.push(
      "Set articlesPage.seoTitle in Sanity Studio to control the browser title and shared-page headline for /articles.",
    );
  }
  if (!trim(contentData.articlesPage?.seoDescription)) {
    articlesIssues.push("Articles hub SEO description is missing.");
    articlesActions.push(
      "Set articlesPage.seoDescription in Sanity Studio so /articles has a dedicated meta description instead of falling back to generic intro copy.",
    );
  }
  if (publishedPosts === 0) {
    articlesIssues.push("No published posts are available.");
    articlesActions.push("Publish at least one article so the hub can rank and internal links can resolve.");
  }

  const postAudits = contentAnalyses
    .map<SeoAuditItem>((analysis) =>
      buildAudit({
        path: analysis.path,
        title: analysis.title,
        score: analysis.score,
        issues: analysis.issues,
        actions: analysis.actions,
        updatedAt: analysis.updatedAt,
      }),
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const audits: SeoAuditItem[] = [
    buildAudit({
      path: "global",
      title: "Global meta shell",
      score: clampScore(100 - globalIssues.length * 18),
      issues: globalIssues.length > 0 ? globalIssues : ["Static social and canonical tags are present."],
      actions:
        globalActions.length > 0
          ? globalActions
          : ["Keep the current shell tags in sync with any future branding changes."],
    }),
    buildAudit({
      path: "/",
      title: "Homepage",
      score: clampScore(100 - homeIssues.length * 18),
      issues: homeIssues.length > 0 ? homeIssues : ["Homepage metadata and hero content are populated."],
      actions:
        homeActions.length > 0
          ? homeActions
          : ["Refresh the homepage copy whenever service positioning changes."],
    }),
    buildAudit({
      path: "/articles",
      title: "Articles hub",
      score: clampScore(100 - articlesIssues.length * 20),
      issues:
        articlesIssues.length > 0
          ? articlesIssues
          : ["Articles index has SEO fields and published content behind it."],
      actions:
        articlesActions.length > 0
          ? articlesActions
          : ["Keep category coverage balanced so the hub serves multiple search intents."],
    }),
    ...postAudits,
  ];

  const technicalScore = clampScore(
    ((shellChecks.hasCanonical ? 1 : 0) +
      (shellChecks.hasOgImage ? 1 : 0) +
      (shellChecks.hasTwitterImage ? 1 : 0) +
      (shellChecks.hasFbAppId ? 1 : 0) +
      (hasHomeSeoTitle ? 1 : 0) +
      (hasHomeSeoDescription ? 1 : 0) +
      (hasHeroHeading ? 1 : 0) +
      (hasHeroSupport ? 1 : 0) +
      (trim(contentData.articlesPage?.seoTitle) ? 1 : 0) +
      (trim(contentData.articlesPage?.seoDescription) ? 1 : 0)) /
      10 *
      100,
  );

  const ruleRecommendations = buildRuleRecommendations({
    missingSeoDescription,
    missingExcerpt,
    missingImage,
    stalePosts: stalePosts.length,
    thinContentPosts,
    postsWithoutInternalLinks,
    postsWithWeakStructure,
    technicalScore,
    analyticsStatus: analytics.status,
    topCategory: categories[0] ?? null,
    totalPublishedPosts: publishedPosts,
    categories,
  });

  const opportunities = buildOpportunities({
    audits,
    contentAnalyses,
    categories,
    missingSeoDescription,
    missingExcerpt,
    missingImage,
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceStatus: {
      posthogConnected: analytics.connected,
      aiConnected: trim(process.env.GEMINI_API_KEY).length > 0,
      siteUrl,
      notes: [
        analytics.status === "connected"
          ? `Server-side PostHog metrics are live and filtered to ${analytics.scopeLabel.toLowerCase()}.`
          : analytics.status === "missing_config"
            ? "PostHog traffic cards are in fallback mode because the API runtime is missing POSTHOG_PERSONAL_API_KEY (or POSTHOG_PERSONALAPI_KEY) and/or POSTHOG_PROJECT_ID."
            : "PostHog is configured, but the server-side query call is still failing. Check token scope, API host, and project id pairing.",
        "Recommendations are rules-based and backed by live Sanity content plus static shell checks.",
      ],
    },
    overview: {
      technicalScore,
      contentScore,
      opportunities: opportunities.length + ruleRecommendations.length,
      totalPages: publishedPosts + 5,
      totalPublishedPosts: publishedPosts,
      criticalIssues: audits.filter((audit) => audit.status === "critical").length,
      warningIssues: audits.filter((audit) => audit.status === "warning").length,
    },
    analytics,
    content: {
      publishedPosts,
      stalePosts: stalePosts.length,
      missingSeoDescription,
      missingExcerpt,
      missingImage,
      thinContentPosts: thinContentPosts.length,
      postsWithoutInternalLinks: postsWithoutInternalLinks.length,
      postsWithWeakStructure: postsWithWeakStructure.length,
      categories,
    },
    contentAnalyses: contentAnalyses.slice(0, 6),
    audits,
    recommendations: ruleRecommendations,
    opportunities,
    aiSummary: buildExecutiveSummary({
      analytics,
      content: {
        publishedPosts,
        stalePosts: stalePosts.length,
        missingSeoDescription,
        missingExcerpt,
        missingImage,
        thinContentPosts: thinContentPosts.length,
        postsWithoutInternalLinks: postsWithoutInternalLinks.length,
        postsWithWeakStructure: postsWithWeakStructure.length,
        categories,
      },
      contentAnalyses,
      topCategory: categories[0] ?? null,
    }),
  };
};
