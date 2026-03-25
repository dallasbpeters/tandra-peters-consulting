import { useEffect, type CSSProperties } from "react";
import { usePostHog } from "@posthog/react";
import { Refresh, StatsUpSquare, WarningTriangle, Internet } from "iconoir-react";
import { SitePageChrome } from "../components/SitePageChrome";
import { TransitionLink } from "../components/TransitionLink";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSeoDashboard } from "../hooks/useSeoDashboard";
import { layoutClass } from "../styles/layoutClasses";
import { typeStyles } from "../styles/siteTypography";
import { mix, theme } from "../theme";
import type {
  SeoAuditItem,
  SeoContentAnalysisItem,
  SeoDashboardPayload,
  SeoRecommendationPriority,
} from "../types/seo";

const shellStyle: CSSProperties = {
  display: "grid",
  gap: "1.5rem",
};

const heroCardStyle: CSSProperties = {
  borderRadius: "1.5rem",
  padding: "1.5rem",
  background:
    `linear-gradient(135deg, ${theme.palette.everglade["900"]} 0%, ${theme.palette.everglade["700"]} 55%, ${theme.palette.accent["600"]} 100%)`,
  color: theme.colors.white,
  boxShadow: `0 22px 60px ${mix(theme.palette.everglade["900"], 25)}`,
  overflow: "hidden",
};

const cardStyle: CSSProperties = {
  borderRadius: "1.25rem",
  padding: "1.25rem",
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
  boxShadow: `0 16px 40px ${mix(theme.colors.everglade, 7)}`,
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1rem",
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: "1rem",
};

const responsiveRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "1rem",
};

const chipStyle = (tone: "good" | "warning" | "critical" | "neutral"): CSSProperties => {
  const tones = {
    good: {
      bg: theme.palette.accent["100"],
      text: theme.palette.accent["800"],
    },
    warning: {
      bg: theme.palette.coral["100"],
      text: theme.palette.coral["800"],
    },
    critical: {
      bg: theme.palette.coral["200"],
      text: theme.palette.coral["900"],
    },
    neutral: {
      bg: theme.palette.paper["200"],
      text: theme.palette.everglade["800"],
    },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.4rem 0.65rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    backgroundColor: tones[tone].bg,
    color: tones[tone].text,
  };
};

const deltaTone = (value: number | null): CSSProperties => ({
  color:
    value == null
      ? mix(theme.colors.everglade, 60)
      : value >= 0
        ? theme.palette.accent["700"]
        : theme.palette.coral["700"],
  fontWeight: 700,
});

const priorityTone = (priority: SeoRecommendationPriority): CSSProperties =>
  priority === "high"
    ? chipStyle("critical")
    : priority === "medium"
      ? chipStyle("warning")
      : chipStyle("good");

const formatDelta = (value: number | null, label: string): string => {
  if (value == null) {
    return `${label} unavailable`;
  }
  if (value === 0) {
    return `${label} flat vs previous window`;
  }
  return `${value > 0 ? "+" : ""}${value} ${label} vs previous window`;
};

const formatDateTime = (value: string): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const MiniBars = ({ points }: { points: SeoDashboardPayload["analytics"]["dailyPageviews"] }) => {
  if (points.length === 0) {
    return (
      <div style={{ color: mix(theme.colors.everglade, 60), fontSize: "0.95rem" }}>
        Traffic trend will appear here once PostHog server metrics are available.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.pageviews), 1);

  return (
    <div style={{ display: "grid", gap: "0.55rem" }}>
      {points.map((point) => (
        <div
          key={point.date}
          style={{ display: "grid", gridTemplateColumns: "4.5rem 1fr 3rem", gap: "0.75rem", alignItems: "center" }}
        >
          <span style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 65) }}>
            {point.date.slice(5)}
          </span>
          <div
            style={{
              height: "0.65rem",
              borderRadius: "999px",
              backgroundColor: theme.palette.paper["200"],
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(point.pageviews / max) * 100}%`,
                height: "100%",
                borderRadius: "999px",
                background:
                  `linear-gradient(90deg, ${theme.palette.everglade["700"]}, ${theme.palette.accent["500"]})`,
              }}
            />
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.colors.everglade }}>
            {point.pageviews}
          </span>
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) => (
  <article style={cardStyle}>
    <p style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: mix(theme.colors.everglade, 60), marginBottom: "0.75rem" }}>
      {label}
    </p>
    <div style={{ fontSize: "2rem", fontWeight: 700, color: theme.colors.everglade, marginBottom: "0.5rem" }}>
      {value}
    </div>
    <p style={{ fontSize: "0.92rem", lineHeight: 1.5, color: mix(theme.colors.everglade, 70) }}>
      {subtext}
    </p>
  </article>
);

const opportunityChip = (type: "fix" | "refresh" | "new-content"): CSSProperties =>
  type === "fix"
    ? chipStyle("critical")
    : type === "refresh"
      ? chipStyle("warning")
      : chipStyle("good");

const AuditRow = ({ audit }: { audit: SeoAuditItem }) => (
  <div
    style={{
      padding: "1rem 0",
      borderTop: `1px solid ${mix(theme.colors.everglade, 10)}`,
      display: "grid",
      gap: "0.65rem",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 700, color: theme.colors.everglade }}>{audit.title}</div>
        <div style={{ fontSize: "0.86rem", color: mix(theme.colors.everglade, 55) }}>{audit.path}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
        <span style={chipStyle(audit.status)}>{audit.status}</span>
        <span style={{ fontWeight: 700, color: theme.colors.everglade }}>{audit.score}/100</span>
      </div>
    </div>
    <div style={{ color: mix(theme.colors.everglade, 80), lineHeight: 1.6 }}>
      {audit.issues.map((issue) => (
        <div key={issue}>• {issue}</div>
      ))}
    </div>
    {audit.actions.length > 0 ? (
      <div style={{ fontSize: "0.92rem", color: mix(theme.colors.everglade, 68), lineHeight: 1.6 }}>
        Next: {audit.actions[0]}
      </div>
    ) : null}
  </div>
);

const ContentAnalysisCard = ({ analysis }: { analysis: SeoContentAnalysisItem }) => (
  <article
    style={{
      padding: "1rem",
      borderRadius: "1rem",
      backgroundColor: theme.palette.paper["100"],
      border: `1px solid ${mix(theme.colors.everglade, 8)}`,
      display: "grid",
      gap: "0.85rem",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 700, color: theme.colors.everglade }}>{analysis.title}</div>
        <div style={{ fontSize: "0.84rem", color: mix(theme.colors.everglade, 58) }}>
          {analysis.path} • {analysis.categoryLabel}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={chipStyle(analysis.status)}>{analysis.status}</span>
        <span style={{ fontWeight: 700, color: theme.colors.everglade }}>{analysis.score}/100</span>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(111px, 1fr))", gap: "0.65rem" }}>
      {[
        { label: "Words", value: analysis.wordCount },
        { label: "Read time", value: `${analysis.readingMinutes} min` },
        { label: "Subheads", value: analysis.headingCount },
        { label: "Lists", value: analysis.listCount },
        { label: "Internal links", value: analysis.internalLinks },
        { label: "External links", value: analysis.externalLinks },
      ].map((metric) => (
        <div
          key={`${analysis.path}-${metric.label}`}
          style={{
            padding: "0.7rem 0.8rem",
            borderRadius: "0.9rem",
            backgroundColor: theme.colors.white,
            border: `1px solid ${mix(theme.colors.everglade, 8)}`,
          }}
        >
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", color: mix(theme.colors.everglade, 58), marginBottom: "0.35rem" }}>
            {metric.label}
          </div>
          <div style={{ fontWeight: 700, color: theme.colors.everglade }}>{metric.value}</div>
        </div>
      ))}
    </div>

    <div style={{ color: mix(theme.colors.everglade, 78), lineHeight: 1.65 }}>
      {analysis.issues.map((issue) => (
        <div key={`${analysis.path}-${issue}`}>• {issue}</div>
      ))}
    </div>

    <div style={{ fontSize: "0.92rem", color: mix(theme.colors.everglade, 68), lineHeight: 1.6 }}>
      Next: {analysis.actions[0]}
    </div>
  </article>
);

export const SeoDashboardPage = () => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();
  const { data, loading, error, statusCode, regenerate } = useSeoDashboard(auth.token);

  usePageMetadata({
    title: "SEO Dashboard | Tandra Peters",
    description:
      "Internal SEO dashboard for content health, technical SEO checks, and traffic trends.",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    posthog?.capture("seo_dashboard_viewed");
  }, [posthog]);

  useEffect(() => {
    if (statusCode === 401 || statusCode === 403) {
      auth.signOut("Your Google session expired or this account is not allowed.");
    }
  }, [auth, statusCode]);

  return (
    <SitePageChrome>
      <main className={layoutClass.pageMain}>
        <div className={layoutClass.containerWide} style={shellStyle}>
          <TransitionLink to="/" style={typeStyles.backLink}>
            ← Back to home
          </TransitionLink>

          

          {!auth.clientId ? (
            <section style={{ ...cardStyle, borderColor: mix(theme.palette.coral["500"], 30) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.75rem", color: theme.palette.coral["800"] }}>
                <WarningTriangle width={20} height={20} />
                <strong>Google auth is not configured</strong>
              </div>
              <p style={{ color: mix(theme.colors.everglade, 75), lineHeight: 1.6 }}>
                Add <code>VITE_GOOGLE_CLIENT_ID</code> to the app env so the dashboard can render the Google sign-in button.
              </p>
            </section>
          ) : null}

          {auth.clientId && !auth.token ? (
            <section style={cardStyle}>
              <div style={{ display: "grid", gap: "1rem", justifyItems: "start" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", color: theme.colors.everglade, marginBottom: "0.45rem" }}>
                    Sign in to the dashboard
                  </h2>
                  <p style={{ color: mix(theme.colors.everglade, 72), lineHeight: 1.7, maxWidth: "36rem" }}>
                    This route is protected with Google Identity Services and a server-side allowlist. The public site stays untouched; only the dashboard API is gated.
                  </p>
                </div>
                <div ref={auth.buttonRef} />
                {auth.authError ? (
                  <p style={{ color: theme.palette.coral["800"], lineHeight: 1.6 }}>{auth.authError}</p>
                ) : null}
                {!auth.ready ? (
                  <p style={{ color: mix(theme.colors.everglade, 60) }}>Loading Google sign-in…</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {auth.token && auth.user ? (
            <section style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  {auth.user.picture ? (
                    <img
                      src={auth.user.picture}
                      alt=""
                      style={{ width: "2.75rem", height: "2.75rem", borderRadius: "999px", objectFit: "cover" }}
                    />
                  ) : null}
                  <div>
                    <div style={{ fontWeight: 700, color: theme.colors.everglade }}>
                      {auth.user.name || auth.user.email}
                    </div>
                    <div style={{ color: mix(theme.colors.everglade, 60), fontSize: "0.9rem" }}>
                      {auth.user.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => auth.signOut()}
                  style={{
                    border: `1px solid ${mix(theme.colors.everglade, 16)}`,
                    borderRadius: "999px",
                    padding: "0.7rem 0.95rem",
                    backgroundColor: theme.colors.white,
                    color: theme.colors.everglade,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Sign out
                </button>
              </div>
              {auth.authError ? (
                <p style={{ marginTop: "0.8rem", color: theme.palette.coral["800"], lineHeight: 1.6 }}>{auth.authError}</p>
              ) : null}
            </section>
          ) : null}

          {auth.token ? (
            <>
          {loading && !data ? (
            <section style={cardStyle}>
              <p style={{ color: theme.colors.everglade }}>Loading saved dashboard snapshot…</p>
            </section>
          ) : null}

          {error ? (
            <section style={{ ...cardStyle, borderColor: mix(theme.palette.coral["500"], 30) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.75rem", color: theme.palette.coral["800"] }}>
                <WarningTriangle width={20} height={20} />
                <strong>Could not load dashboard</strong>
              </div>
              <p style={{ color: mix(theme.colors.everglade, 75), lineHeight: 1.6 }}>{error}</p>
            </section>
          ) : null}

          {data ? (
            <>
            <section style={heroCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ maxWidth: "40rem" }}>
                <div style={chipStyle("neutral")}>Internal SEO Dashboard</div>
                <h1
                  style={{
                    ...typeStyles.pageListTitle,
                    color: theme.colors.white,
                    marginTop: "1rem",
                    marginBottom: "0.85rem",
                  }}
                >
                  Search visibility, content hygiene, and traffic signals in one place.
                </h1>
                <p
                  style={{
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    color: mix(theme.colors.white, 82),
                    maxWidth: "36rem",
                  }}
                >
                  This dashboard stays isolated from the public site. It audits the current Sanity content, checks the static SEO shell, and pulls PostHog metrics server-side when those credentials are available.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "0.85rem 1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  backgroundColor: mix(theme.colors.white, 14),
                  color: theme.colors.white,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.72 : 1,
                }}
              >
                <Refresh width={18} height={18} />
                {loading ? "Regenerating…" : "Regenerate snapshot"}
              </button>
            </div>
          </section>
              <section style={metricGridStyle}>
                <MetricCard
                  label="Technical score"
                  value={`${data.overview.technicalScore}`}
                  subtext="Global metadata and route-level SEO field coverage."
                />
                <MetricCard
                  label="Content score"
                  value={`${data.overview.contentScore}`}
                  subtext="Published article completeness across summaries, imagery, and freshness."
                />
                <MetricCard
                  label="Observed pageviews"
                  value={data.analytics.pageviews7d == null ? "—" : `${data.analytics.pageviews7d}`}
                  subtext={`${data.analytics.timeframeLabel} · ${data.analytics.scopeLabel}`}
                />
                <MetricCard
                  label="Open opportunities"
                  value={`${data.overview.opportunities}`}
                  subtext={`${data.overview.totalPublishedPosts} published articles across ${data.overview.totalPages} tracked pages.`}
                />
              </section>

              <section style={responsiveRowStyle}>
                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    System status
                  </h2>
                  <div style={{ display: "grid", gap: "0.8rem" }}>
                    {data.sourceStatus.notes.map((note) => (
                      <div
                        key={note}
                        style={{
                          padding: "0.9rem 1rem",
                          borderRadius: "1rem",
                          backgroundColor: theme.palette.paper["100"],
                          color: mix(theme.colors.everglade, 76),
                          lineHeight: 1.6,
                        }}
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </article>

                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Issue rollup
                  </h2>
                  <div style={{ display: "grid", gap: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                      <span style={chipStyle("critical")}>Critical</span>
                      <strong>{data.overview.criticalIssues}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                      <span style={chipStyle("warning")}>Warning</span>
                      <strong>{data.overview.warningIssues}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                      <span style={chipStyle("good")}>Healthy</span>
                      <strong>{data.audits.filter((audit) => audit.status === "good").length}</strong>
                    </div>
                  </div>
                </article>
              </section>

              <section style={sectionGridStyle} className="seo-dashboard-two-column">
                <article style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    <div>
                      <div style={chipStyle(data.sourceStatus.posthogConnected ? "good" : "warning")}>
                        <Internet width={14} height={14} />
                        {data.sourceStatus.posthogConnected ? "PostHog connected" : "PostHog fallback"}
                      </div>
                      <h2 style={{ fontSize: "1.2rem", color: theme.colors.everglade, marginTop: "0.8rem", marginBottom: "0.35rem" }}>
                        Traffic snapshot
                      </h2>
                      <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58), marginTop: "0.35rem" }}>
                        {data.analytics.scopeLabel}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58) }}>
                      Updated {formatDateTime(data.generatedAt)}
                    </div>
                  </div>

                  <div style={{ ...metricGridStyle, marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58), marginBottom: "0.35rem" }}>Pageviews</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: theme.colors.everglade }}>
                        {data.analytics.pageviews7d ?? "—"}
                      </div>
                      <div style={deltaTone(data.analytics.deltaPageviews)}>
                        {formatDelta(data.analytics.deltaPageviews, "pageviews")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58), marginBottom: "0.35rem" }}>Visitors</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: theme.colors.everglade }}>
                        {data.analytics.visitors7d ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58), marginBottom: "0.35rem" }}>CTA clicks</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: theme.colors.everglade }}>
                        {data.analytics.ctaClicks7d ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.82rem", color: mix(theme.colors.everglade, 58), marginBottom: "0.35rem" }}>Leads</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: theme.colors.everglade }}>
                        {data.analytics.leads7d ?? "—"}
                      </div>
                      <div style={deltaTone(data.analytics.deltaLeads)}>
                        {formatDelta(data.analytics.deltaLeads, "leads")}
                      </div>
                    </div>
                  </div>

                  <MiniBars points={data.analytics.dailyPageviews} />
                </article>

                <article style={cardStyle}>
                  <div style={chipStyle("good")}>
                    <StatsUpSquare width={14} height={14} />
                    Evidence-based summary
                  </div>
                  <h2 style={{ fontSize: "1.2rem", color: theme.colors.everglade, marginTop: "0.8rem", marginBottom: "0.5rem" }}>
                    Executive summary
                  </h2>
                  <p style={{ color: mix(theme.colors.everglade, 78), lineHeight: 1.75 }}>
                    {data.aiSummary}
                  </p>
                  <div style={{ marginTop: "1rem", color: mix(theme.colors.everglade, 60), fontSize: "0.88rem", lineHeight: 1.6 }}>
                    Site URL: {data.sourceStatus.siteUrl}
                  </div>
                </article>
              </section>

              <section style={responsiveRowStyle}>
                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Opportunity briefs
                  </h2>
                  <div style={{ display: "grid", gap: "0.9rem" }}>
                    {data.opportunities.map((opportunity) => (
                      <div
                        key={`${opportunity.type}-${opportunity.title}`}
                        style={{
                          padding: "1rem",
                          borderRadius: "1rem",
                          backgroundColor: theme.palette.paper["100"],
                          border: `1px solid ${mix(theme.colors.everglade, 8)}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                          <strong style={{ color: theme.colors.everglade }}>{opportunity.title}</strong>
                          <span style={opportunityChip(opportunity.type)}>{opportunity.type.replace("-", " ")}</span>
                        </div>
                        <p style={{ color: mix(theme.colors.everglade, 75), lineHeight: 1.65, marginBottom: "0.75rem" }}>
                          {opportunity.detail}
                        </p>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: mix(theme.colors.everglade, 60), fontSize: "0.84rem" }}>
                          <span>Target: {opportunity.target}</span>
                          <span style={priorityTone(opportunity.impact)}>{opportunity.impact} impact</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

              </section>

              <section style={responsiveRowStyle}>
                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Content coverage
                  </h2>
                  <div style={{ display: "grid", gap: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Published posts</span>
                      <strong>{data.content.publishedPosts}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Missing SEO descriptions</span>
                      <strong>{data.content.missingSeoDescription}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Missing excerpts</span>
                      <strong>{data.content.missingExcerpt}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Missing lead images</span>
                      <strong>{data.content.missingImage}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Stale posts</span>
                      <strong>{data.content.stalePosts}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Thin articles</span>
                      <strong>{data.content.thinContentPosts}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Posts with no internal links</span>
                      <strong>{data.content.postsWithoutInternalLinks}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span style={{ color: mix(theme.colors.everglade, 68) }}>Posts with weak structure</span>
                      <strong>{data.content.postsWithWeakStructure}</strong>
                    </div>
                  </div>
                </article>

                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Category spread
                  </h2>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {data.content.categories.length > 0 ? data.content.categories.map((category) => (
                      <div key={category.slug}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.35rem" }}>
                          <span style={{ color: theme.colors.everglade }}>{category.label}</span>
                          <strong>{category.count}</strong>
                        </div>
                        <div style={{ height: "0.5rem", borderRadius: "999px", backgroundColor: theme.palette.paper["200"], overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${(category.count / Math.max(data.content.categories[0]?.count ?? 1, 1)) * 100}%`,
                              borderRadius: "999px",
                              background: `linear-gradient(90deg, ${theme.palette.everglade["700"]}, ${theme.palette.purple["300"]})`,
                            }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p style={{ color: mix(theme.colors.everglade, 65) }}>
                        Publish some categorized articles and this cluster view will fill in.
                      </p>
                    )}
                  </div>
                </article>
              </section>

              <section style={cardStyle}>
                <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "0.25rem" }}>
                  Article content analysis
                </h2>
                <p style={{ color: mix(theme.colors.everglade, 65), marginBottom: "0.85rem", lineHeight: 1.6 }}>
                  These article checks are based on the actual Sanity body content: word count, headings, lists, and internal versus external links.
                </p>
                <div style={{ display: "grid", gap: "0.9rem" }}>
                  {data.contentAnalyses.length > 0 ? data.contentAnalyses.map((analysis) => (
                    <ContentAnalysisCard key={analysis.path} analysis={analysis} />
                  )) : (
                    <p style={{ color: mix(theme.colors.everglade, 65), lineHeight: 1.6 }}>
                      Publish some articles and this analysis panel will fill in with real content metrics.
                    </p>
                  )}
                </div>
              </section>

              <section style={responsiveRowStyle}>
                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Priority recommendations
                  </h2>
                  <div style={{ display: "grid", gap: "0.9rem" }}>
                    {data.recommendations.map((recommendation) => (
                      <div
                        key={`${recommendation.source}-${recommendation.title}`}
                        style={{
                          padding: "1rem",
                          borderRadius: "1rem",
                          backgroundColor: theme.palette.paper["100"],
                          border: `1px solid ${mix(theme.colors.everglade, 8)}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                          <strong style={{ color: theme.colors.everglade }}>{recommendation.title}</strong>
                          <span style={priorityTone(recommendation.priority)}>{recommendation.priority}</span>
                        </div>
                        <p style={{ color: mix(theme.colors.everglade, 75), lineHeight: 1.65 }}>
                          {recommendation.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article style={cardStyle}>
                  <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "1rem" }}>
                    Top pages in PostHog
                  </h2>
                  <div style={{ display: "grid", gap: "0.8rem" }}>
                    {data.analytics.topPages.length > 0 ? data.analytics.topPages.map((page) => (
                      <div key={page.path} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                        <span style={{ color: theme.colors.everglade }}>{page.path}</span>
                        <strong>{page.pageviews}</strong>
                      </div>
                    )) : (
                      <p style={{ color: mix(theme.colors.everglade, 65), lineHeight: 1.6 }}>
                        No top-page data yet. Once PostHog server access is working, this panel will rank the routes people actually see.
                      </p>
                    )}
                  </div>
                </article>
              </section>

              <section style={cardStyle}>
                <h2 style={{ fontSize: "1.15rem", color: theme.colors.everglade, marginBottom: "0.25rem" }}>
                  Audit queue
                </h2>
                <p style={{ color: mix(theme.colors.everglade, 65), marginBottom: "0.75rem", lineHeight: 1.6 }}>
                  The rows below are ordered by overall severity, mixing site shell checks with the weakest content pages.
                </p>
                <div>
                  {data.audits.map((audit, index) => (
                    <div key={`${audit.path}-${audit.title}`} style={index === 0 ? { borderTop: "none" } : undefined}>
                      <AuditRow audit={audit} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
            </>
          ) : null}
        </div>
      </main>
      <style>{`
        @media (max-width: 960px) {
          .seo-dashboard-two-column {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </SitePageChrome>
  );
};
