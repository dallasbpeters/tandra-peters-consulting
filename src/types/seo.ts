export type SeoAuditStatus = "good" | "warning" | "critical";
export type SeoRecommendationPriority = "high" | "medium" | "low";

export interface SeoAuditItem {
  actions: string[];
  issues: string[];
  path: string;
  score: number;
  status: SeoAuditStatus;
  title: string;
  updatedAt?: string;
}

export interface SeoRecommendation {
  detail: string;
  priority: SeoRecommendationPriority;
  source: "ai";
  title: string;
}

export interface SeoTrafficPoint {
  date: string;
  pageviews: number;
}

export interface SeoOpportunity {
  detail: string;
  impact: "high" | "medium" | "low";
  target: string;
  title: string;
  type: "fix" | "refresh" | "new-content";
}

export interface SeoTopPage {
  pageviews: number;
  path: string;
}

export interface SeoCategorySummary {
  count: number;
  label: string;
  slug: string;
}

export interface SeoContentAnalysisItem {
  actions: string[];
  categoryLabel: string;
  excerptLength: number;
  externalLinks: number;
  headingCount: number;
  internalLinks: number;
  issues: string[];
  listCount: number;
  path: string;
  readingMinutes: number;
  score: number;
  seoDescriptionLength: number;
  status: SeoAuditStatus;
  title: string;
  titleLength: number;
  updatedAt?: string;
  wordCount: number;
}

export interface SeoDashboardPayload {
  aiSummary: string | null;
  analytics: {
    status: "connected" | "missing_config" | "error";
    connected: boolean;
    timeframeLabel: string;
    scopeLabel: string;
    pageviews7d: number | null;
    visitors7d: number | null;
    leads7d: number | null;
    ctaClicks7d: number | null;
    deltaPageviews: number | null;
    deltaLeads: number | null;
    topPages: SeoTopPage[];
    dailyPageviews: SeoTrafficPoint[];
  };
  audits: SeoAuditItem[];
  content: {
    publishedPosts: number;
    stalePosts: number;
    missingSeoDescription: number;
    missingExcerpt: number;
    missingImage: number;
    thinContentPosts: number;
    postsWithoutInternalLinks: number;
    postsWithWeakStructure: number;
    categories: SeoCategorySummary[];
  };
  contentAnalyses: SeoContentAnalysisItem[];
  generatedAt: string;
  opportunities: SeoOpportunity[];
  overview: {
    technicalScore: number;
    contentScore: number;
    opportunities: number;
    totalPages: number;
    totalPublishedPosts: number;
    criticalIssues: number;
    warningIssues: number;
  };
  recommendations: SeoRecommendation[];
  sourceStatus: {
    posthogConnected: boolean;
    aiConnected: boolean;
    siteUrl: string;
    notes: string[];
  };
}
