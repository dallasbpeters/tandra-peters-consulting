import { useEffect, useState } from "react";

const GA_API_URL =
  process.env.SANITY_STUDIO_GA_API_URL ||
  `${process.env.SANITY_STUDIO_PREVIEW_URL || "https://www.tandra.me"}/api/analytics`;

type Days = 7 | 30 | 90;
type View = "real" | "total";

interface Overview {
  totalUsers: number;
  sessions: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
}

interface OverviewComparison {
  total: Overview;
  real: Overview;
  internal: Overview;
}

interface TopPage {
  pagePath: string;
  pageTitle: string;
  screenPageViews: number;
  totalUsers: number;
}

interface TopSource {
  channel: string;
  sessions: number;
  totalUsers: number;
}

interface DailyPoint {
  date: string;
  screenPageViews: number;
  sessions: number;
  realScreenPageViews?: number;
  realSessions?: number;
  internalScreenPageViews?: number;
  internalSessions?: number;
}

interface AnalyticsData {
  period: string;
  overview: Overview;
  overviewComparison?: OverviewComparison;
  internalFilterAvailable?: boolean;
  topPages: TopPage[];
  topSources: TopSource[];
  dailyTrend: DailyPoint[];
}

const fmt = (n: number) => n.toLocaleString();

const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const fmtPct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

const CARD: React.CSSProperties = {
  background: "var(--card-bg, #1a2020)",
  borderRadius: 10,
  padding: "1.1rem 1.4rem",
};

const LABEL: React.CSSProperties = {
  color: "rgb(180 195 180 / 65%)",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  marginBottom: "0.3rem",
  textTransform: "uppercase",
};

const VALUE: React.CSSProperties = {
  color: "#edf3ed",
  fontSize: "1.9rem",
  fontWeight: 700,
  lineHeight: 1,
};

const SUBLABEL: React.CSSProperties = {
  color: "rgb(180 195 180 / 55%)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginTop: "0.45rem",
  minHeight: "0.9rem",
};

export const GaDashboardTool = () => {
  const [days, setDays] = useState<Days>(30);
  const [view, setView] = useState<View>("real");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${GA_API_URL}?days=${days}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json() as Promise<AnalyticsData>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const internalAvailable = data?.internalFilterAvailable ?? false;
  const activeView: View = internalAvailable ? view : "total";
  const overview: Overview | undefined = data
    ? (data.overviewComparison?.[activeView] ?? data.overview)
    : undefined;
  const internalOverview = data?.overviewComparison?.internal;

  const maxPageViews = data
    ? Math.max(...data.topPages.map((p) => p.screenPageViews), 1)
    : 1;
  const maxSessions = data
    ? Math.max(...data.topSources.map((s) => s.sessions), 1)
    : 1;
  // Scale bars by TOTAL so the real bar + stacked internal segment (which sum to
  // total) always stay within the chart height.
  const maxDailyViews = data
    ? Math.max(...data.dailyTrend.map((d) => d.screenPageViews), 1)
    : 1;

  return (
    <div
      style={{
        background: "#111615",
        color: "#edf3ed",
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        overflowY: "auto",
        padding: "2rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: "1rem",
          justifyContent: "space-between",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1
            style={{
              color: "#edf3ed",
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Google Analytics
          </h1>
          <p
            style={{
              color: "rgb(180 195 180 / 55%)",
              fontSize: "0.8rem",
              margin: "0.2rem 0 0",
            }}
          >
            Property {process.env.GA_PROPERTY_ID || "541673750"}
          </p>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}>
          {/* Total / Real toggle */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(["real", "total"] as View[]).map((v) => {
              const isActive = activeView === v;
              const isDisabled = v === "real" && !internalAvailable;
              return (
                <button
                  disabled={isDisabled}
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background: isActive ? "#92b661" : "#1a2020",
                    border: "1px solid",
                    borderColor: isActive
                      ? "#92b661"
                      : "rgb(255 255 255 / 12%)",
                    borderRadius: 6,
                    color: isActive ? "#0c1210" : "#edf3ed",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    font: "inherit",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    opacity: isDisabled ? 0.4 : 1,
                    padding: "0.35rem 0.75rem",
                    textTransform: "capitalize",
                  }}
                  title={
                    isDisabled
                      ? "Real traffic needs the internal-traffic filter set up in GA4"
                      : undefined
                  }
                  type="button"
                >
                  {v}
                </button>
              );
            })}
          </div>

          {/* Date range buttons */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {([7, 30, 90] as Days[]).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  background: days === d ? "#92b661" : "#1a2020",
                  border: "1px solid",
                  borderColor:
                    days === d ? "#92b661" : "rgb(255 255 255 / 12%)",
                  borderRadius: 6,
                  color: days === d ? "#0c1210" : "#edf3ed",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "0.35rem 0.75rem",
                }}
                type="button"
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <p style={{ color: "rgb(180 195 180 / 55%)", fontSize: "0.9rem" }}>
          Loading…
        </p>
      )}
      {error && !loading && (
        <p
          style={{
            background: "rgb(255 100 80 / 12%)",
            border: "1px solid rgb(255 100 80 / 30%)",
            borderRadius: 8,
            color: "#ff9c8a",
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
          }}
        >
          Failed to load analytics: {error}
        </p>
      )}

      {data && !loading && !internalAvailable && (
        <p
          style={{
            background: "rgb(146 182 97 / 8%)",
            border: "1px solid rgb(146 182 97 / 25%)",
            borderRadius: 8,
            color: "rgb(180 195 180 / 80%)",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            margin: "0 0 1.25rem",
            padding: "0.7rem 1rem",
          }}
        >
          Showing <strong>Total</strong> traffic only. To compare against{" "}
          <strong>Real</strong> traffic (excluding your own visits), define an
          internal-traffic rule in GA4 and register a <code>traffic_type</code>{" "}
          custom dimension. The comparison appears automatically once
          that&rsquo;s set up.
        </p>
      )}

      {data && !loading && overview && (
        <>
          {/* Overview KPIs */}
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                internal: internalOverview?.totalUsers,
                label: "Users",
                value: fmt(overview.totalUsers),
              },
              {
                internal: internalOverview?.sessions,
                label: "Sessions",
                value: fmt(overview.sessions),
              },
              {
                internal: internalOverview?.screenPageViews,
                label: "Page Views",
                value: fmt(overview.screenPageViews),
              },
              { label: "Bounce Rate", value: fmtPct(overview.bounceRate) },
              {
                label: "Avg. Session",
                value: fmtDuration(overview.averageSessionDuration),
              },
            ].map(({ internal, label, value }) => {
              const showDelta =
                activeView === "real" &&
                typeof internal === "number" &&
                internal > 0;
              return (
                <div key={label} style={CARD}>
                  <div style={LABEL}>{label}</div>
                  <div style={VALUE}>{value}</div>
                  <div style={SUBLABEL}>
                    {showDelta ? `−${fmt(internal)} you (internal)` : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-column: trend + sources */}
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "1fr 300px",
              marginBottom: "0.75rem",
            }}
          >
            {/* Daily trend */}
            <div style={CARD}>
              <div
                style={{
                  ...LABEL,
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <span>Daily Page Views</span>
                {activeView === "real" && internalAvailable && (
                  <span
                    style={{
                      alignItems: "center",
                      color: "rgb(180 195 180 / 55%)",
                      display: "flex",
                      gap: "0.3rem",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        background: "rgb(255 255 255 / 22%)",
                        borderRadius: 2,
                        display: "inline-block",
                        height: 8,
                        width: 8,
                      }}
                    />
                    you (internal)
                  </span>
                )}
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  gap: 3,
                  height: 100,
                }}
              >
                {data.dailyTrend.map((pt) => {
                  const realViews =
                    pt.realScreenPageViews ?? pt.screenPageViews;
                  const internalViews = pt.internalScreenPageViews ?? 0;
                  const showInternal =
                    activeView === "real" &&
                    internalAvailable &&
                    internalViews > 0;
                  const baseViews =
                    activeView === "real" ? realViews : pt.screenPageViews;
                  return (
                    <div
                      key={pt.date}
                      style={{
                        display: "flex",
                        flex: 1,
                        flexDirection: "column",
                        gap: 0,
                        justifyContent: "flex-end",
                      }}
                      title={`${fmtDate(pt.date)}: ${fmt(baseViews)} ${activeView === "real" ? "real" : "total"} views${showInternal ? ` (+${fmt(internalViews)} you)` : ""}`}
                    >
                      {showInternal && (
                        <div
                          style={{
                            background: "rgb(255 255 255 / 22%)",
                            borderRadius: "2px 2px 0 0",
                            height: `${Math.max(2, (internalViews / maxDailyViews) * 100)}%`,
                            minHeight: 2,
                          }}
                        />
                      )}
                      <div
                        style={{
                          background: "#92b661",
                          borderRadius: showInternal ? 0 : "2px 2px 0 0",
                          height: `${Math.max(2, (baseViews / maxDailyViews) * 100)}%`,
                          minHeight: 2,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  color: "rgb(180 195 180 / 40%)",
                  display: "flex",
                  fontSize: "0.68rem",
                  justifyContent: "space-between",
                  marginTop: "0.4rem",
                }}
              >
                {data.dailyTrend.length > 0 && (
                  <>
                    <span>{fmtDate(data.dailyTrend[0].date)}</span>
                    <span>{fmtDate(data.dailyTrend.at(-1).date)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Traffic sources */}
            <div style={CARD}>
              <div style={{ ...LABEL, marginBottom: "0.75rem" }}>
                Traffic Sources
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {data.topSources.map((src) => (
                  <div key={src.channel}>
                    <div
                      style={{
                        alignItems: "baseline",
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <span
                        style={{
                          color: "#edf3ed",
                          fontSize: "0.8rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {src.channel}
                      </span>
                      <span
                        style={{
                          color: "rgb(180 195 180 / 60%)",
                          flexShrink: 0,
                          fontSize: "0.75rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {fmt(src.sessions)}
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgb(255 255 255 / 8%)",
                        borderRadius: 2,
                        height: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          background: "#92b661",
                          height: "100%",
                          width: `${(src.sessions / maxSessions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top pages */}
          <div style={CARD}>
            <div style={{ ...LABEL, marginBottom: "0.75rem" }}>Top Pages</div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Page", "Views", "Users", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        borderBottom: "1px solid rgb(255 255 255 / 8%)",
                        color: "rgb(180 195 180 / 55%)",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        padding: "0 0.5rem 0.5rem",
                        textAlign: h === "Page" ? "left" : "right",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((page) => (
                  <tr key={page.pagePath}>
                    <td
                      style={{
                        color: "#edf3ed",
                        fontSize: "0.82rem",
                        maxWidth: 320,
                        overflow: "hidden",
                        padding: "0.45rem 0.5rem",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={page.pagePath}
                    >
                      <span
                        style={{
                          color: "rgb(180 195 180 / 50%)",
                          marginRight: 4,
                        }}
                      >
                        /
                      </span>
                      {page.pagePath.replace(/^\//, "")}
                    </td>
                    <td
                      style={{
                        color: "#edf3ed",
                        fontSize: "0.82rem",
                        padding: "0.45rem 0.5rem",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(page.screenPageViews)}
                    </td>
                    <td
                      style={{
                        color: "rgb(180 195 180 / 60%)",
                        fontSize: "0.82rem",
                        padding: "0.45rem 0.5rem",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(page.totalUsers)}
                    </td>
                    <td
                      style={{
                        padding: "0.45rem 0 0.45rem 0.5rem",
                        width: 100,
                      }}
                    >
                      <div
                        style={{
                          background: "rgb(255 255 255 / 8%)",
                          borderRadius: 2,
                          height: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            background: "#92b661",
                            height: "100%",
                            opacity: 0.7,
                            width: `${(page.screenPageViews / maxPageViews) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default GaDashboardTool;
