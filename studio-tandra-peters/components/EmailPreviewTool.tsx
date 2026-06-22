import {useColorSchemeValue} from 'sanity'

/**
 * Embeds the client email preview inside Studio so editors can see the
 * rendered email as they publish `clientEmail` / `emailSignature`.
 *
 * In local dev, uses the react-email preview server (`pnpm dev:email`) if
 * `SANITY_STUDIO_EMAIL_PREVIEW_URL` points to it. In production, falls back
 * to the site's `/api/email/preview` endpoint (served from www.tandra.me).
 */
const PREVIEW_BASE =
  process.env.SANITY_STUDIO_EMAIL_PREVIEW_URL?.replace(/\/$/, '') || 'https://www.tandra.me'

const PREVIEW_URL = `${PREVIEW_BASE}/api/email/preview`

export function EmailPreviewTool() {
  const scheme = useColorSchemeValue()
  const isDark = scheme === 'dark'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: isDark ? '#101112' : '#f3f5f4',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${isDark ? '#1f2123' : '#e4e8e6'}`,
          color: isDark ? '#aab2ad' : '#5b6b62',
          fontSize: '0.8125rem',
          lineHeight: 1.5,
        }}
      >
        Live render of the client email. Publish content under <strong>Emails</strong>, then
        refresh. Needs the email preview server running (<code>pnpm dev:email</code>).
      </div>
      <iframe
        src={PREVIEW_URL}
        style={{
          border: 'none',
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'block',
        }}
        title="Client email preview"
      />
    </div>
  )
}

export default EmailPreviewTool
