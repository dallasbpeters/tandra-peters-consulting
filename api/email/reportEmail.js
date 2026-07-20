const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * @param {{
 *   driveWebViewLink?: string;
 *   message?: string;
 *   pdfUrl?: string;
 *   recipientName?: string;
 *   reportTitle: string;
 *   senderName?: string;
 * }} content
 * @returns {Promise<string>} Rendered HTML string for the email body.
 */
export const renderReportEmail = async (content) => {
  const {
    driveWebViewLink,
    message,
    pdfUrl,
    recipientName,
    reportTitle,
    senderName = "Tandra Peters",
  } = content;

  const preview = `${escapeHtml(reportTitle)} — from ${escapeHtml(senderName)}`;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const body =
    message?.trim() ||
    "Please find your roof inspection report attached. You can also open it online using the button below.";

  const viewButton = pdfUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">
        <tr>
          <td>
            <a href="${escapeHtml(pdfUrl)}"
               style="background-color:#3a7d5d;border-radius:8px;color:#fff;display:inline-block;font-size:15px;font-weight:600;padding:12px 22px;text-decoration:none;">
              View the report
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const driveNote = driveWebViewLink
    ? `<p style="color:#5b6b62;font-size:13px;margin:16px 0 0;">Also available in Google Drive: ${escapeHtml(driveWebViewLink)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="background-color:#f3f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 0;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${preview}</div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e4e8e6;border-radius:12px;margin:0 auto;max-width:560px;padding:32px;">
          <tr><td>
            <h1 style="color:#0f1f18;font-size:22px;margin:0 0 12px;">${escapeHtml(reportTitle)}</h1>
            <p style="color:#1a2b22;font-size:15px;line-height:24px;margin:0 0 16px;">${greeting}</p>
            <p style="color:#1a2b22;font-size:15px;line-height:24px;margin:0 0 16px;">${escapeHtml(body)}</p>
            ${viewButton}
            ${driveNote}
            <hr style="border-color:#e4e8e6;margin:24px 0 16px;" />
            <p style="color:#5b6b62;font-size:13px;margin:16px 0 0;">${escapeHtml(senderName)} · Birdcreek Roofing</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
