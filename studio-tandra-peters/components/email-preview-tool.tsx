import { useColorSchemeValue } from "sanity";

/**
 * Embeds the client email composer inside Studio so editors can preview and
 * send the published/default client email without leaving Sanity.
 *
 * Uses the site's `/email-composer` route by default. Local dev can override
 * the origin with `SANITY_STUDIO_EMAIL_PREVIEW_URL`.
 */
const TRAILING_SLASH_RE = /\/$/u;

const stripTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_RE, "");

const getBrowserOrigin = (): string | undefined => {
  if (typeof window === "undefined") {
    return;
  }
  return window.location.origin;
};

const resolvePreviewBase = (): string => {
  const configured =
    process.env.SANITY_STUDIO_EMAIL_PREVIEW_URL ||
    process.env.SANITY_STUDIO_PREVIEW_URL;

  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3001";
  }

  return stripTrailingSlash(getBrowserOrigin() ?? "https://www.tandra.me");
};

const PREVIEW_BASE = resolvePreviewBase();

const PREVIEW_URL = `${PREVIEW_BASE}/api/email/preview`;
const COMPOSER_URL = `${PREVIEW_BASE}/email-composer?source=sanity`;

// oxlint-disable-next-line func-style
export function EmailPreviewTool() {
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
          Compose, preview, choose recipients, and send the client email.
          Published defaults still live under <strong>Emails</strong>.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <a
            href={COMPOSER_URL}
            rel="noopener noreferrer"
            style={{ color: "inherit", fontWeight: 700 }}
            target="_blank"
          >
            Open full composer
          </a>
          <a
            href={PREVIEW_URL}
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
            target="_blank"
          >
            Static preview
          </a>
        </div>
      </div>
      <iframe
        src={COMPOSER_URL}
        style={{
          border: "none",
          display: "block",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
        title="Client email composer"
      />
    </div>
  );
}

export default EmailPreviewTool;
