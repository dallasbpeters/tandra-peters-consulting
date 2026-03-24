import { createClient } from "@sanity/client";
import { GoogleGenAI } from "@google/genai";
import groq from "groq";
import fs from "node:fs/promises";
import { plainTextFromRich } from "../../src/portableText/plainText.js";

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
  source: "ai";
};

type SeoOpportunity = {
  type: "fix" | "refresh" | "new-content";
  title: string;
  detail: string;
  target: string;
  impact: "high" | "medium" | "low";
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
  opportunities: SeoOpportunity[];
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
  aiContext: {
    instructions?: string | null;
    businessPriorities?: (string | null)[] | null;
    guardrails?: (string | null)[] | null;
    targetKeywords?: (string | null)[] | null;
    preferredInternalLinks?: (string | null)[] | null;
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
const AI_MODEL = "gemini-2.5-flash";

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
  "aiContext": *[_id == "aiContext"][0]{
    instructions,
    businessPriorities,
    guardrails,
    targetKeywords,
    preferredInternalLinks
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

const buildSanityWriteClient = () => {
  const token = trim(process.env.SANITY_API_WRITE_TOKEN);
  if (!token) {
    return null;
  }

  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
  });
};

const fetchSanityContent = async (): Promise<SanityDashboardQuery> => {
  const client = buildSanityClient();
  const result = await client.fetch<SanityDashboardQuery>(DASHBOARD_QUERY);
  return {
    homePage: result?.homePage ?? null,
    articlesPage: result?.articlesPage ?? null,
    siteSettings: result?.siteSettings ?? null,
    aiContext: result?.aiContext ?? null,
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

type AiInsightsResult = {
  connected: boolean;
  model: string | null;
  summary: string | null;
  recommendations: SeoRecommendation[];
  opportunities: SeoOpportunity[];
  note: string;
  persisted: boolean;
};

const sanitizePriority = (value: unknown): SeoRecommendationPriority => {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
};

const sanitizeImpact = (value: unknown): "high" | "medium" | "low" => {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
};

const sanitizeOpportunityType = (value: unknown): "fix" | "refresh" | "new-content" => {
  if (value === "fix" || value === "refresh" || value === "new-content") {
    return value;
  }
  return "fix";
};

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const extractJsonObject = (value: string): string | null => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return value.slice(start, end + 1);
};

const sanitizeAiRecommendations = (value: unknown): SeoRecommendation[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const recommendations: SeoRecommendation[] = [];

  for (const item of value) {
    if (recommendations.length >= 5) {
      break;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const title = cleanText((item as { title?: unknown }).title);
    const detail = cleanText((item as { detail?: unknown }).detail);
    if (!title || !detail) {
      continue;
    }

    recommendations.push({
      title,
      detail,
      priority: sanitizePriority((item as { priority?: unknown }).priority),
      source: "ai",
    });
  }

  return recommendations;
};

const sanitizeAiOpportunities = (value: unknown): SeoOpportunity[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const opportunities: SeoOpportunity[] = [];

  for (const item of value) {
    if (opportunities.length >= 6) {
      break;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const title = cleanText((item as { title?: unknown }).title);
    const detail = cleanText((item as { detail?: unknown }).detail);
    const target = cleanText((item as { target?: unknown }).target);
    if (!title || !detail || !target) {
      continue;
    }

    opportunities.push({
      type: sanitizeOpportunityType((item as { type?: unknown }).type),
      title,
      detail,
      target,
      impact: sanitizeImpact((item as { impact?: unknown }).impact),
    });
  }

  return opportunities;
};

const cleanStringList = (value: (string | null)[] | null | undefined): string[] =>
  Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean) : [];

const persistAiInsights = async (args: {
  generatedAt: string;
  siteUrl: string;
  model: string;
  summary: string | null;
  recommendations: SeoRecommendation[];
  opportunities: SeoOpportunity[];
}) => {
  const client = buildSanityWriteClient();
  if (!client) {
    return false;
  }

  await client.createOrReplace({
    _id: "seoDashboardInsights",
    _type: "seoDashboardInsights",
    title: "SEO Dashboard Insights",
    lastGeneratedAt: args.generatedAt,
    model: args.model,
    siteUrl: args.siteUrl,
    summary: args.summary ?? "",
    recommendations: args.recommendations.map((item, index) => ({
      _type: "seoDashboardRecommendation",
      _key: `rec-${Date.parse(args.generatedAt)}-${index}`,
      title: item.title,
      detail: item.detail,
      priority: item.priority,
    })),
    opportunities: args.opportunities.map((item, index) => ({
      _type: "seoDashboardOpportunity",
      _key: `opp-${Date.parse(args.generatedAt)}-${index}`,
      type: item.type,
      title: item.title,
      detail: item.detail,
      target: item.target,
      impact: item.impact,
    })),
  });

  return true;
};

const generateAiInsights = async (args: {
  generatedAt: string;
  siteUrl: string;
  analytics: SeoDashboardPayload["analytics"];
  content: SeoDashboardPayload["content"];
  audits: SeoAuditItem[];
  contentAnalyses: SeoContentAnalysisItem[];
  technicalScore: number;
  contentScore: number;
  aiContext: SanityDashboardQuery["aiContext"];
}) : Promise<AiInsightsResult> => {
  const apiKey = trim(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return {
      connected: false,
      model: null,
      summary: null,
      recommendations: [],
      opportunities: [],
      note: "AI recommendations are disabled because GEMINI_API_KEY is missing in the API runtime.",
      persisted: false,
    };
  }

  const evidence = {
    generatedAt: args.generatedAt,
    siteUrl: args.siteUrl,
    analytics: args.analytics,
    content: args.content,
    overview: {
      technicalScore: args.technicalScore,
      contentScore: args.contentScore,
    },
    audits: args.audits.map((audit) => ({
      path: audit.path,
      title: audit.title,
      score: audit.score,
      status: audit.status,
      issues: audit.issues,
      actions: audit.actions,
    })),
    contentAnalyses: args.contentAnalyses.map((item) => ({
      path: item.path,
      title: item.title,
      categoryLabel: item.categoryLabel,
      score: item.score,
      wordCount: item.wordCount,
      headingCount: item.headingCount,
      internalLinks: item.internalLinks,
      externalLinks: item.externalLinks,
      issues: item.issues,
      actions: item.actions,
    })),
    aiContext: args.aiContext
      ? {
          instructions: cleanText(args.aiContext.instructions),
          businessPriorities: cleanStringList(args.aiContext.businessPriorities),
          guardrails: cleanStringList(args.aiContext.guardrails),
          targetKeywords: cleanStringList(args.aiContext.targetKeywords),
          preferredInternalLinks: cleanStringList(args.aiContext.preferredInternalLinks),
        }
      : null,
  };

  const prompt = `You are generating SEO recommendations for a live dashboard.

Use only the evidence provided. Do not invent metrics, traffic, categories, missing fields, stale content, or implementation details that are not explicitly present.

Return strict JSON only with this shape:
{
  "summary": "2-4 sentence executive summary",
  "recommendations": [
    {"title":"...", "detail":"...", "priority":"high|medium|low"}
  ],
  "opportunities": [
    {"type":"fix|refresh|new-content", "title":"...", "detail":"...", "target":"/path", "impact":"high|medium|low"}
  ]
}

Rules:
- Keep recommendations to at most 5.
- Keep opportunities to at most 6.
- Every recommendation and opportunity must be directly grounded in the evidence.
- Prefer concrete, specific fixes over generic SEO advice.
- Respect the aiContext section when it is present. Treat it as editorial direction from the business owner.
- Do not mention missing analytics configuration unless analytics.status says missing_config or error.
- Do not claim an article is stale unless the evidence says it is stale.
- If the evidence is weak for an item, omit it.

Evidence:
${JSON.stringify(evidence, null, 2)}`;

  try {
    const ai = new GoogleGenAI({apiKey});
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
    });

    const rawText = cleanText(response.text);
    const jsonText = extractJsonObject(rawText);
    if (!jsonText) {
      throw new Error("Model did not return JSON");
    }

    const parsed = JSON.parse(jsonText) as {
      summary?: unknown;
      recommendations?: unknown;
      opportunities?: unknown;
    };

    const summary = cleanText(parsed.summary) || null;
    const recommendations = sanitizeAiRecommendations(parsed.recommendations);
    const opportunities = sanitizeAiOpportunities(parsed.opportunities);

    const persisted =
      recommendations.length > 0 || opportunities.length > 0 || summary
        ? await persistAiInsights({
            generatedAt: args.generatedAt,
            siteUrl: args.siteUrl,
            model: AI_MODEL,
            summary,
            recommendations,
            opportunities,
          }).catch(() => false)
        : false;

    return {
      connected: true,
      model: AI_MODEL,
      summary,
      recommendations,
      opportunities,
      note: persisted
        ? `AI recommendations were generated with ${AI_MODEL} from live dashboard data and synced to Sanity.`
        : `AI recommendations were generated with ${AI_MODEL} from live dashboard data, but they were not written to Sanity because SANITY_API_WRITE_TOKEN is missing or the write failed.`,
      persisted,
    };
  } catch (error) {
    return {
      connected: false,
      model: AI_MODEL,
      summary: null,
      recommendations: [],
      opportunities: [],
      note: `AI recommendation generation failed on this refresh: ${error instanceof Error ? error.message : "Unknown error"}.`,
      persisted: false,
    };
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

export const getSeoDashboard = async (): Promise<SeoDashboardPayload> => {
  const generatedAt = new Date().toISOString();
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

  const contentSnapshot = {
    publishedPosts,
    stalePosts: stalePosts.length,
    missingSeoDescription,
    missingExcerpt,
    missingImage,
    thinContentPosts: thinContentPosts.length,
    postsWithoutInternalLinks: postsWithoutInternalLinks.length,
    postsWithWeakStructure: postsWithWeakStructure.length,
    categories,
  };

  const aiInsights = await generateAiInsights({
    generatedAt,
    siteUrl,
    analytics,
    content: contentSnapshot,
    audits,
    contentAnalyses: contentAnalyses.slice(0, 6),
    technicalScore,
    contentScore,
    aiContext: contentData.aiContext,
  });

  return {
    generatedAt,
    sourceStatus: {
      posthogConnected: analytics.connected,
      aiConnected: aiInsights.connected,
      siteUrl,
      notes: [
        analytics.status === "connected"
          ? `Server-side PostHog metrics are live and filtered to ${analytics.scopeLabel.toLowerCase()}.`
          : analytics.status === "missing_config"
            ? "PostHog traffic cards are in fallback mode because the API runtime is missing POSTHOG_PERSONAL_API_KEY (or POSTHOG_PERSONALAPI_KEY) and/or POSTHOG_PROJECT_ID."
            : "PostHog is configured, but the server-side query call is still failing. Check token scope, API host, and project id pairing.",
        aiInsights.note,
      ],
    },
    overview: {
      technicalScore,
      contentScore,
      opportunities: aiInsights.opportunities.length + aiInsights.recommendations.length,
      totalPages: publishedPosts + 5,
      totalPublishedPosts: publishedPosts,
      criticalIssues: audits.filter((audit) => audit.status === "critical").length,
      warningIssues: audits.filter((audit) => audit.status === "warning").length,
    },
    analytics,
    content: contentSnapshot,
    contentAnalyses: contentAnalyses.slice(0, 6),
    audits,
    recommendations: aiInsights.recommendations,
    opportunities: aiInsights.opportunities,
    aiSummary: aiInsights.summary,
  };
};
