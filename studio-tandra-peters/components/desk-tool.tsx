import { useColorSchemeValue } from "sanity";

const TRAILING_SLASH_RE = /\/$/u;

const stripTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_RE, "");

const getBrowserOrigin = (): string | undefined => {
  if (typeof window === "undefined") {
    return;
  }
  return window.location.origin;
};

const resolveDeskBase = (): string => {
  const configured =
    process.env.SANITY_STUDIO_DESK_URL ||
    process.env.SANITY_STUDIO_STORM_DESK_URL ||
    process.env.SANITY_STUDIO_PREVIEW_URL;

  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3001";
  }

  return stripTrailingSlash(getBrowserOrigin() ?? "https://www.tandra.me");
};

const DESK_BASE = resolveDeskBase();
const DESK_URL = `${DESK_BASE}/desk?source=sanity`;

// oxlint-disable-next-line func-style
export function DeskTool() {
  const scheme = useColorSchemeValue();
  const isDark = scheme === "dark";

  return (
    <div
      style={{
        background: isDark ? "#101112" : "#f3f5f4",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${isDark ? "#1f2123" : "#e4e8e6"}`,
          color: isDark ? "#aab2ad" : "#5b6b62",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          padding: "0.75rem 1rem",
        }}
      >
        <div>
          Proactive campaign desk for priority areas, outreach actions, content
          ideas, and acquisition channels.
        </div>
        <a
          href={DESK_URL}
          rel="noopener noreferrer"
          style={{ color: "inherit", fontWeight: 700 }}
          target="_blank"
        >
          Open full desk
        </a>
      </div>
      <iframe
        src={DESK_URL}
        style={{
          border: "none",
          display: "block",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
        title="Desk"
      />
    </div>
  );
}

export default DeskTool;
