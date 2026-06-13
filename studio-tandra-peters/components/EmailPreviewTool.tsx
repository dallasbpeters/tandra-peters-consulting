import { useColorSchemeValue } from "sanity";

/**
 * Embeds the react-email preview server inside Studio so editors can see the
 * rendered email update as they publish `clientEmail` / `emailSignature`.
 *
 * The preview server is the `react-email-starter` workspace (`pnpm dev:email`,
 * default http://localhost:3000). Override with SANITY_STUDIO_EMAIL_PREVIEW_URL.
 */
const PREVIEW_BASE =
  process.env.SANITY_STUDIO_EMAIL_PREVIEW_URL?.replace(/\/$/, "") || "http://localhost:3000";

// react-email serves a single template at /preview/<filename without extension>.
const PREVIEW_URL = `${PREVIEW_BASE}/preview/tandra-client-email`;

export function EmailPreviewTool() {
  const scheme = useColorSchemeValue();
  const isDark = scheme === "dark";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: isDark ? "#101112" : "#f3f5f4",
      }}
    >
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: `1px solid ${isDark ? "#1f2123" : "#e4e8e6"}`,
          color: isDark ? "#aab2ad" : "#5b6b62",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
        }}
      >
        Live render of the client email. Publish content under <strong>Emails</strong>, then
        refresh. Needs the email preview server running (<code>pnpm dev:email</code>).
      </div>
      <iframe
        title="Client email preview"
        src={PREVIEW_URL}
        style={{ border: "none", flex: 1, width: "100%", minHeight: 0, display: "block" }}
      />
    </div>
  );
}

export default EmailPreviewTool;
