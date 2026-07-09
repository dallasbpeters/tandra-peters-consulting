import { usePostHog } from "@posthog/react";
import {
  Internet,
  Refresh,
  StatsUpSquare,
  WarningTriangle,
} from "iconoir-react";
import type { CSSProperties } from "react";
import { useEffect } from "react";

import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSeoDashboard } from "../hooks/use-seo-dashboard";
import { layoutClass } from "../styles/layout-classes";
import { typeStyles } from "../styles/site-typography";
import { mix, theme } from "../theme";
import type {
  SeoAuditItem,
  SeoContentAnalysisItem,
  SeoDashboardPayload,
  SeoRecommendationPriority,
} from "../types/seo";

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.xxl,
};

const cssVar = (name: string, fallback: string): string =>
  `var(${name}, ${fallback})`;

const backendSurfaceColor = cssVar("--backend-surface", theme.colors.white);
const backendSurfaceRaisedColor = cssVar(
  "--backend-surface-raised",
  theme.palette.paper["100"]
);
const backendBorderColor = cssVar(
  "--backend-border",
  mix(theme.colors.everglade, 10)
);
const backendTextColor = cssVar("--backend-text", theme.colors.everglade);
const backendMutedColor = cssVar(
  "--backend-muted",
  mix(theme.colors.everglade, 70)
);
const backendDangerColor = cssVar(
  "--backend-danger",
  theme.palette.coral["700"]
);

const heroCardStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${theme.palette.everglade["900"]} 0%, ${theme.palette.everglade["700"]} 55%, ${theme.palette.accent["600"]} 100%)`,
  borderRadius: theme.radius.xlarge,
  boxShadow: `0 22px 60px ${mix(theme.palette.everglade["900"], 25)}`,
  color: theme.colors.white,
  overflow: "hidden",
  padding: theme.spacing.xxl,
};

const cardStyle: CSSProperties = {
  backgroundColor: backendSurfaceColor,
  border: `1px solid ${backendBorderColor}`,
  borderRadius: theme.radius.xlarge,
  boxShadow: "var(--backend-shadow, 0 16px 40px rgb(30 50 44 / 7%))",
  padding: theme.spacing.xl,
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gap: theme.spacing.lg,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gap: theme.spacing.lg,
  gridTemplateColumns: "1.4fr 1fr",
};

const responsiveRowStyle: CSSProperties = {
  display: "grid",
  gap: theme.spacing.lg,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const chipStyle = (
  tone: "good" | "warning" | "critical" | "neutral"
): CSSProperties => {
  const tones = {
    critical: {
      bg: theme.palette.coral["200"],
      text: theme.palette.coral["900"],
    },
    good: {
      bg: theme.palette.accent["100"],
      text: theme.palette.accent["800"],
    },
    neutral: {
      bg: backendSurfaceRaisedColor,
      text: backendTextColor,
    },
    warning: {
      bg: theme.palette.coral["100"],
      text: backendDangerColor,
    },
  } as const;

  return {
    alignItems: "center",
    backgroundColor: tones[tone].bg,
    borderRadius: theme.radius.pill,
    color: tones[tone].text,
    display: "inline-flex",
    fontSize: "0.75rem",
    fontWeight: 700,
    gap: theme.spacing.sm,
    letterSpacing: "0.08em",
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textTransform: "uppercase",
  };
};

const deltaToneColor = (value: number | null): string => {
  if (value === null) {
    return backendMutedColor;
  }
  if (value >= 0) {
    return theme.palette.accent["700"];
  }
  return backendDangerColor;
};

const deltaTone = (value: number | null): CSSProperties => ({
  color: deltaToneColor(value),
  fontWeight: 700,
});

const priorityTone = (priority: SeoRecommendationPriority): CSSProperties => {
  if (priority === "high") {
    return chipStyle("critical");
  }
  if (priority === "medium") {
    return chipStyle("warning");
  }
  return chipStyle("good");
};

const formatDelta = (value: number | null, label: string): string => {
  if (value === null) {
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
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const MiniBars = ({
  points,
}: {
  points: SeoDashboardPayload["analytics"]["dailyPageviews"];
}) => {
  if (points.length === 0) {
    return (
      <div style={{ color: backendMutedColor, fontSize: "0.95rem" }}>
        Traffic trend will appear here once PostHog server metrics are
        available.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.pageviews), 1);

  return (
    <div style={{ display: "grid", gap: theme.spacing.sm }}>
      {points.map((point) => (
        <div
          key={point.date}
          style={{
            alignItems: "center",
            display: "grid",
            gap: theme.spacing.md,
            gridTemplateColumns: "4.5rem 1fr 3rem",
          }}
        >
          <span
            style={{
              color: backendMutedColor,
              fontSize: "0.82rem",
            }}
          >
            {point.date.slice(5)}
          </span>
          <div
            style={{
              backgroundColor: backendSurfaceRaisedColor,
              borderRadius: theme.radius.pill,
              height: "0.65rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: `linear-gradient(90deg, ${theme.palette.everglade["700"]}, ${theme.palette.accent["500"]})`,
                borderRadius: theme.radius.pill,
                height: "100%",
                width: `${(point.pageviews / max) * 100}%`,
              }}
            />
          </div>
          <span
            style={{
              color: backendTextColor,
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
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
    <p
      style={{
        color: backendMutedColor,
        fontSize: "0.8rem",
        letterSpacing: "0.08em",
        marginBottom: theme.spacing.md,
        textTransform: "uppercase",
      }}
    >
      {label}
    </p>
    <div
      style={{
        color: backendTextColor,
        fontSize: "2rem",
        fontWeight: 700,
        marginBottom: theme.spacing.sm,
      }}
    >
      {value}
    </div>
    <p
      style={{
        color: backendMutedColor,
        fontSize: "0.92rem",
        lineHeight: 1.5,
      }}
    >
      {subtext}
    </p>
  </article>
);

const opportunityChip = (
  type: "fix" | "refresh" | "new-content"
): CSSProperties => {
  if (type === "fix") {
    return chipStyle("critical");
  }
  if (type === "refresh") {
    return chipStyle("warning");
  }
  return chipStyle("good");
};

const AuditRow = ({ audit }: { audit: SeoAuditItem }) => (
  <div
    style={{
      borderTop: `1px solid ${backendBorderColor}`,
      display: "grid",
      gap: theme.spacing.md,
      padding: `${theme.spacing.lg} 0`,
    }}
  >
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing.lg,
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ color: backendTextColor, fontWeight: 700 }}>
          {audit.title}
        </div>
        <div
          style={{
            color: backendMutedColor,
            fontSize: "0.86rem",
          }}
        >
          {audit.path}
        </div>
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: theme.spacing.md,
        }}
      >
        <span style={chipStyle(audit.status)}>{audit.status}</span>
        <span style={{ color: backendTextColor, fontWeight: 700 }}>
          {audit.score}/100
        </span>
      </div>
    </div>
    <div style={{ color: backendMutedColor, lineHeight: 1.6 }}>
      {audit.issues.map((issue) => (
        <div key={issue}>• {issue}</div>
      ))}
    </div>
    {audit.actions.length > 0 ? (
      <div
        style={{
          color: backendMutedColor,
          fontSize: "0.92rem",
          lineHeight: 1.6,
        }}
      >
        Next: {audit.actions[0]}
      </div>
    ) : null}
  </div>
);

const ContentAnalysisCard = ({
  analysis,
}: {
  analysis: SeoContentAnalysisItem;
}) => (
  <article
    style={{
      backgroundColor: backendSurfaceRaisedColor,
      border: `1px solid ${backendBorderColor}`,
      borderRadius: theme.radius.large,
      display: "grid",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    }}
  >
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing.lg,
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ color: backendTextColor, fontWeight: 700 }}>
          {analysis.title}
        </div>
        <div
          style={{
            color: backendMutedColor,
            fontSize: "0.84rem",
          }}
        >
          {analysis.path} • {analysis.categoryLabel}
        </div>
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: theme.spacing.sm,
        }}
      >
        <span style={chipStyle(analysis.status)}>{analysis.status}</span>
        <span style={{ color: backendTextColor, fontWeight: 700 }}>
          {analysis.score}/100
        </span>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gap: theme.spacing.md,
        gridTemplateColumns: "repeat(auto-fit, minmax(111px, 1fr))",
      }}
    >
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
            backgroundColor: backendSurfaceColor,
            border: `1px solid ${backendBorderColor}`,
            borderRadius: theme.radius.large,
            padding: `${theme.spacing.md} ${theme.spacing.md}`,
          }}
        >
          <div
            style={{
              color: backendMutedColor,
              fontSize: "0.78rem",
              letterSpacing: "0.06em",
              marginBottom: theme.spacing.sm,
              textTransform: "uppercase",
            }}
          >
            {metric.label}
          </div>
          <div style={{ color: backendTextColor, fontWeight: 700 }}>
            {metric.value}
          </div>
        </div>
      ))}
    </div>

    <div style={{ color: backendMutedColor, lineHeight: 1.65 }}>
      {analysis.issues.map((issue) => (
        <div key={`${analysis.path}-${issue}`}>• {issue}</div>
      ))}
    </div>

    <div
      style={{
        color: backendMutedColor,
        fontSize: "0.92rem",
        lineHeight: 1.6,
      }}
    >
      Next: {analysis.actions[0]}
    </div>
  </article>
);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
export const SeoDashboardPage = () => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();
  const { data, loading, error, statusCode, regenerate } = useSeoDashboard(
    auth.token
  );

  usePageMetadata({
    description:
      "Internal SEO dashboard for content health, technical SEO checks, and traffic trends.",
    robots: "noindex, nofollow",
    title: "SEO Dashboard | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("seo_dashboard_viewed");
  }, [posthog]);

  useEffect(() => {
    if (statusCode === 401 || statusCode === 403) {
      auth.signOut(
        "Your Google session expired or this account is not allowed."
      );
    }
  }, [auth, statusCode]);

  // SiteShell already wraps non-home routes in <main class="site-page-main">.
  return (
    <SitePageChrome>
      <div className={layoutClass.containerWide} style={shellStyle}>
        <TransitionLink style={typeStyles.backLink} to="/">
          ← Back to home
        </TransitionLink>

        {auth.clientId ? null : (
          <section
            style={{
              ...cardStyle,
              borderColor: mix(theme.palette.coral["500"], 30),
            }}
          >
            <div
              style={{
                alignItems: "center",
                color: backendDangerColor,
                display: "flex",
                gap: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}
            >
              <WarningTriangle height={20} width={20} />
              <strong>Google auth is not configured</strong>
            </div>
            <p
              style={{
                color: backendMutedColor,
                lineHeight: 1.6,
              }}
            >
              Add <code>VITE_GOOGLE_CLIENT_ID</code> to the app env so the
              dashboard can render the Google sign-in button.
            </p>
          </section>
        )}

        {auth.clientId && !auth.token ? (
          <section style={cardStyle}>
            <div
              style={{
                display: "grid",
                gap: theme.spacing.lg,
                justifyItems: "start",
              }}
            >
              <div>
                <h2
                  style={{
                    color: backendTextColor,
                    fontSize: "1.2rem",
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Sign in to the dashboard
                </h2>
                <p
                  style={{
                    color: backendMutedColor,
                    lineHeight: 1.7,
                    maxWidth: "36rem",
                  }}
                >
                  This route is protected with Google Identity Services and a
                  server-side allowlist. The public site stays untouched; only
                  the dashboard API is gated.
                </p>
              </div>
              <div ref={auth.buttonRef} />
              {auth.authError ? (
                <p
                  style={{
                    color: backendDangerColor,
                    lineHeight: 1.6,
                  }}
                >
                  {auth.authError}
                </p>
              ) : null}
              {auth.ready ? null : (
                <p style={{ color: backendMutedColor }}>
                  Loading Google sign-in…
                </p>
              )}
            </div>
          </section>
        ) : null}

        {auth.token && auth.user ? (
          <section style={cardStyle}>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexWrap: "wrap",
                gap: theme.spacing.lg,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: theme.spacing.md,
                }}
              >
                {auth.user.picture ? (
                  // biome-ignore lint/correctness/useImageSize: explicit CSS dimensions set on this element
                  <img
                    alt=""
                    src={auth.user.picture}
                    style={{
                      borderRadius: theme.radius.pill,
                      height: "2.75rem",
                      objectFit: "cover",
                      width: "2.75rem",
                    }}
                  />
                ) : null}
                <div>
                  <div style={{ color: backendTextColor, fontWeight: 700 }}>
                    {auth.user.name || auth.user.email}
                  </div>
                  <div
                    style={{
                      color: backendMutedColor,
                      fontSize: "0.9rem",
                    }}
                  >
                    {auth.user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => auth.signOut()}
                style={{
                  backgroundColor: backendSurfaceColor,
                  border: `1px solid ${backendBorderColor}`,
                  borderRadius: theme.radius.pill,
                  color: backendTextColor,
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                }}
                type="button"
              >
                Sign out
              </button>
            </div>
            {auth.authError ? (
              <p
                style={{
                  color: backendDangerColor,
                  lineHeight: 1.6,
                  marginTop: theme.spacing.md,
                }}
              >
                {auth.authError}
              </p>
            ) : null}
          </section>
        ) : null}

        {auth.token ? (
          <>
            {loading && !data ? (
              <section style={cardStyle}>
                <p style={{ color: backendTextColor }}>
                  Loading saved dashboard snapshot…
                </p>
              </section>
            ) : null}

            {error ? (
              <section
                style={{
                  ...cardStyle,
                  borderColor: mix(theme.palette.coral["500"], 30),
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    color: backendDangerColor,
                    display: "flex",
                    gap: theme.spacing.md,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <WarningTriangle height={20} width={20} />
                  <strong>Could not load dashboard</strong>
                </div>
                <p
                  style={{
                    color: backendMutedColor,
                    lineHeight: 1.6,
                  }}
                >
                  {error}
                </p>
              </section>
            ) : null}

            {data ? (
              <>
                <section style={heroCardStyle}>
                  <div
                    style={{
                      alignItems: "flex-start",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: theme.spacing.lg,
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ maxWidth: "40rem" }}>
                      <div style={chipStyle("neutral")}>
                        Internal SEO Dashboard
                      </div>
                      <h1
                        style={{
                          ...typeStyles.pageListTitle,
                          color: theme.colors.white,
                          marginBottom: theme.spacing.md,
                          marginTop: theme.spacing.lg,
                        }}
                      >
                        Search visibility, content hygiene, and traffic signals
                        in one place.
                      </h1>
                      <p
                        style={{
                          color: mix(theme.colors.white, 82),
                          fontSize: "1rem",
                          lineHeight: 1.7,
                          maxWidth: "36rem",
                        }}
                      >
                        This dashboard stays isolated from the public site. It
                        audits the current Sanity content, checks the static SEO
                        shell, and pulls PostHog metrics server-side when those
                        credentials are available.
                      </p>
                    </div>
                    <button
                      disabled={loading}
                      onClick={() => {
                        regenerate();
                      }}
                      style={{
                        alignItems: "center",
                        backgroundColor: mix(theme.colors.white, 14),
                        border: "none",
                        borderRadius: theme.radius.pill,
                        color: theme.colors.white,
                        cursor: loading ? "wait" : "pointer",
                        display: "inline-flex",
                        fontWeight: 700,
                        gap: theme.spacing.sm,
                        opacity: loading ? 0.72 : 1,
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      }}
                      type="button"
                    >
                      <Refresh height={18} width={18} />
                      {loading ? "Regenerating…" : "Regenerate snapshot"}
                    </button>
                  </div>
                </section>
                <section style={metricGridStyle}>
                  <MetricCard
                    label="Technical score"
                    subtext="Global metadata and route-level SEO field coverage."
                    value={`${data.overview.technicalScore}`}
                  />
                  <MetricCard
                    label="Content score"
                    subtext="Published article completeness across summaries, imagery, and freshness."
                    value={`${data.overview.contentScore}`}
                  />
                  <MetricCard
                    label="Observed pageviews"
                    subtext={`${data.analytics.timeframeLabel} · ${data.analytics.scopeLabel}`}
                    value={
                      data.analytics.pageviews7d === null
                        ? "—"
                        : `${data.analytics.pageviews7d}`
                    }
                  />
                  <MetricCard
                    label="Open opportunities"
                    subtext={`${data.overview.totalPublishedPosts} published articles across ${data.overview.totalPages} tracked pages.`}
                    value={`${data.overview.opportunities}`}
                  />
                </section>

                <section style={responsiveRowStyle}>
                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      System status
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.md }}>
                      {data.sourceStatus.notes.map((note) => (
                        <div
                          key={note}
                          style={{
                            backgroundColor: backendSurfaceRaisedColor,
                            borderRadius: theme.radius.large,
                            color: backendMutedColor,
                            lineHeight: 1.6,
                            padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
                          }}
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </article>

                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Issue rollup
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.md }}>
                      <div
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={chipStyle("critical")}>Critical</span>
                        <strong>{data.overview.criticalIssues}</strong>
                      </div>
                      <div
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={chipStyle("warning")}>Warning</span>
                        <strong>{data.overview.warningIssues}</strong>
                      </div>
                      <div
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={chipStyle("good")}>Healthy</span>
                        <strong>
                          {
                            data.audits.filter(
                              (audit) => audit.status === "good"
                            ).length
                          }
                        </strong>
                      </div>
                    </div>
                  </article>
                </section>

                <section
                  className="seo-dashboard-two-column"
                  style={sectionGridStyle}
                >
                  <article style={cardStyle}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: theme.spacing.lg,
                        justifyContent: "space-between",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      <div>
                        <div
                          style={chipStyle(
                            data.sourceStatus.posthogConnected
                              ? "good"
                              : "warning"
                          )}
                        >
                          <Internet height={14} width={14} />
                          {data.sourceStatus.posthogConnected
                            ? "PostHog connected"
                            : "PostHog fallback"}
                        </div>
                        <h2
                          style={{
                            color: backendTextColor,
                            fontSize: "1.2rem",
                            marginBottom: theme.spacing.sm,
                            marginTop: theme.spacing.md,
                          }}
                        >
                          Traffic snapshot
                        </h2>
                        <div
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.82rem",
                            marginTop: theme.spacing.sm,
                          }}
                        >
                          {data.analytics.scopeLabel}
                        </div>
                      </div>
                      <div
                        style={{
                          color: backendMutedColor,
                          fontSize: "0.82rem",
                        }}
                      >
                        Updated {formatDateTime(data.generatedAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        ...metricGridStyle,
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.82rem",
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          Pageviews
                        </div>
                        <div
                          style={{
                            color: backendTextColor,
                            fontSize: "1.6rem",
                            fontWeight: 700,
                          }}
                        >
                          {data.analytics.pageviews7d ?? "—"}
                        </div>
                        <div style={deltaTone(data.analytics.deltaPageviews)}>
                          {formatDelta(
                            data.analytics.deltaPageviews,
                            "pageviews"
                          )}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.82rem",
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          Visitors
                        </div>
                        <div
                          style={{
                            color: backendTextColor,
                            fontSize: "1.6rem",
                            fontWeight: 700,
                          }}
                        >
                          {data.analytics.visitors7d ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.82rem",
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          CTA clicks
                        </div>
                        <div
                          style={{
                            color: backendTextColor,
                            fontSize: "1.6rem",
                            fontWeight: 700,
                          }}
                        >
                          {data.analytics.ctaClicks7d ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.82rem",
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          Leads
                        </div>
                        <div
                          style={{
                            color: backendTextColor,
                            fontSize: "1.6rem",
                            fontWeight: 700,
                          }}
                        >
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
                      <StatsUpSquare height={14} width={14} />
                      Evidence-based summary
                    </div>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.2rem",
                        marginBottom: theme.spacing.sm,
                        marginTop: theme.spacing.md,
                      }}
                    >
                      Executive summary
                    </h2>
                    <p
                      style={{
                        color: backendMutedColor,
                        lineHeight: 1.75,
                      }}
                    >
                      {data.aiSummary}
                    </p>
                    <div
                      style={{
                        color: backendMutedColor,
                        fontSize: "0.88rem",
                        lineHeight: 1.6,
                        marginTop: theme.spacing.lg,
                      }}
                    >
                      Site URL: {data.sourceStatus.siteUrl}
                    </div>
                  </article>
                </section>

                <section style={responsiveRowStyle}>
                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Opportunity briefs
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.lg }}>
                      {data.opportunities.map((opportunity) => (
                        <div
                          key={`${opportunity.type}-${opportunity.title}`}
                          style={{
                            backgroundColor: backendSurfaceRaisedColor,
                            border: `1px solid ${backendBorderColor}`,
                            borderRadius: theme.radius.large,
                            padding: theme.spacing.lg,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: theme.spacing.lg,
                              justifyContent: "space-between",
                              marginBottom: theme.spacing.md,
                            }}
                          >
                            <strong style={{ color: backendTextColor }}>
                              {opportunity.title}
                            </strong>
                            <span style={opportunityChip(opportunity.type)}>
                              {opportunity.type.replace("-", " ")}
                            </span>
                          </div>
                          <p
                            style={{
                              color: backendMutedColor,
                              lineHeight: 1.65,
                              marginBottom: theme.spacing.md,
                            }}
                          >
                            {opportunity.detail}
                          </p>
                          <div
                            style={{
                              color: backendMutedColor,
                              display: "flex",
                              fontSize: "0.84rem",
                              gap: theme.spacing.lg,
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Target: {opportunity.target}</span>
                            <span style={priorityTone(opportunity.impact)}>
                              {opportunity.impact} impact
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>

                <section style={responsiveRowStyle}>
                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Content coverage
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.md }}>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Published posts
                        </span>
                        <strong>{data.content.publishedPosts}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Missing SEO descriptions
                        </span>
                        <strong>{data.content.missingSeoDescription}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Missing excerpts
                        </span>
                        <strong>{data.content.missingExcerpt}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Missing lead images
                        </span>
                        <strong>{data.content.missingImage}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Stale posts
                        </span>
                        <strong>{data.content.stalePosts}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Thin articles
                        </span>
                        <strong>{data.content.thinContentPosts}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Posts with no internal links
                        </span>
                        <strong>
                          {data.content.postsWithoutInternalLinks}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.lg,
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: backendMutedColor }}>
                          Posts with weak structure
                        </span>
                        <strong>{data.content.postsWithWeakStructure}</strong>
                      </div>
                    </div>
                  </article>

                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Category spread
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.md }}>
                      {data.content.categories.length > 0 ? (
                        data.content.categories.map((category) => (
                          <div key={category.slug}>
                            <div
                              style={{
                                display: "flex",
                                gap: theme.spacing.lg,
                                justifyContent: "space-between",
                                marginBottom: theme.spacing.sm,
                              }}
                            >
                              <span style={{ color: backendTextColor }}>
                                {category.label}
                              </span>
                              <strong>{category.count}</strong>
                            </div>
                            <div
                              style={{
                                backgroundColor: backendSurfaceRaisedColor,
                                borderRadius: theme.radius.pill,
                                height: "0.5rem",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  background: `linear-gradient(90deg, ${theme.palette.everglade["700"]}, ${theme.palette.purple["300"]})`,
                                  borderRadius: theme.radius.pill,
                                  height: "100%",
                                  width: `${(category.count / Math.max(data.content.categories[0]?.count ?? 1, 1)) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: backendMutedColor }}>
                          Publish some categorized articles and this cluster
                          view will fill in.
                        </p>
                      )}
                    </div>
                  </article>
                </section>

                <section style={cardStyle}>
                  <h2
                    style={{
                      color: backendTextColor,
                      fontSize: "1.15rem",
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    Article content analysis
                  </h2>
                  <p
                    style={{
                      color: backendMutedColor,
                      lineHeight: 1.6,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    These article checks are based on the actual Sanity body
                    content: word count, headings, lists, and internal versus
                    external links.
                  </p>
                  <div style={{ display: "grid", gap: theme.spacing.lg }}>
                    {data.contentAnalyses.length > 0 ? (
                      data.contentAnalyses.map((analysis) => (
                        <ContentAnalysisCard
                          analysis={analysis}
                          key={analysis.path}
                        />
                      ))
                    ) : (
                      <p
                        style={{
                          color: backendMutedColor,
                          lineHeight: 1.6,
                        }}
                      >
                        Publish some articles and this analysis panel will fill
                        in with real content metrics.
                      </p>
                    )}
                  </div>
                </section>

                <section style={responsiveRowStyle}>
                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Priority recommendations
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.lg }}>
                      {data.recommendations.map((recommendation) => (
                        <div
                          key={`${recommendation.source}-${recommendation.title}`}
                          style={{
                            backgroundColor: backendSurfaceRaisedColor,
                            border: `1px solid ${backendBorderColor}`,
                            borderRadius: theme.radius.large,
                            padding: theme.spacing.lg,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: theme.spacing.lg,
                              justifyContent: "space-between",
                              marginBottom: theme.spacing.md,
                            }}
                          >
                            <strong style={{ color: backendTextColor }}>
                              {recommendation.title}
                            </strong>
                            <span style={priorityTone(recommendation.priority)}>
                              {recommendation.priority}
                            </span>
                          </div>
                          <p
                            style={{
                              color: backendMutedColor,
                              lineHeight: 1.65,
                            }}
                          >
                            {recommendation.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article style={cardStyle}>
                    <h2
                      style={{
                        color: backendTextColor,
                        fontSize: "1.15rem",
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      Top pages in PostHog
                    </h2>
                    <div style={{ display: "grid", gap: theme.spacing.md }}>
                      {data.analytics.topPages.length > 0 ? (
                        data.analytics.topPages.map((page) => (
                          <div
                            key={page.path}
                            style={{
                              alignItems: "center",
                              display: "flex",
                              gap: theme.spacing.lg,
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: backendTextColor }}>
                              {page.path}
                            </span>
                            <strong>{page.pageviews}</strong>
                          </div>
                        ))
                      ) : (
                        <p
                          style={{
                            color: backendMutedColor,
                            lineHeight: 1.6,
                          }}
                        >
                          No top-page data yet. Once PostHog server access is
                          working, this panel will rank the routes people
                          actually see.
                        </p>
                      )}
                    </div>
                  </article>
                </section>

                <section style={cardStyle}>
                  <h2
                    style={{
                      color: backendTextColor,
                      fontSize: "1.15rem",
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    Audit queue
                  </h2>
                  <p
                    style={{
                      color: backendMutedColor,
                      lineHeight: 1.6,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    The rows below are ordered by overall severity, mixing site
                    shell checks with the weakest content pages.
                  </p>
                  <div>
                    {data.audits.map((audit, index) => (
                      <div
                        key={`${audit.path}-${audit.title}`}
                        style={index === 0 ? { borderTop: "none" } : undefined}
                      >
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
