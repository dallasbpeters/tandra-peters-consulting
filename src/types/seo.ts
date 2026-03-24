export type SeoAuditStatus = "good" | "warning" | "critical";
export type SeoRecommendationPriority = "high" | "medium" | "low";

export type SeoAuditItem = {
  path: string;
  title: string;
  score: number;
  status: SeoAuditStatus;
  issues: string[];
  actions: string[];
  updatedAt?: string;
};

export type SeoRecommendation = {
  title: string;
  detail: string;
  priority: SeoRecommendationPriority;
  source: "ai";
};

export type SeoTrafficPoint = {
  date: string;
  pageviews: number;
};

export type SeoOpportunity = {
  type: "fix" | "refresh" | "new-content";
  title: string;
  detail: string;
  target: string;
  impact: "high" | "medium" | "low";
};

export type SeoTopPage = {
  path: string;
  pageviews: number;
};

export type SeoCategorySummary = {
  slug: string;
  label: string;
  count: number;
};

export type SeoContentAnalysisItem = {
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

export type SeoDashboardPayload = {
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
  audits: SeoAuditItem[];
  recommendations: SeoRecommendation[];
  opportunities: SeoOpportunity[];
  aiSummary: string | null;
};
