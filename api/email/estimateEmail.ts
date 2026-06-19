import type { EmailAssets, EstimateSubmission } from "./types.js";

type Variant = "visitor" | "lead";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttr = (value: string): string =>
  escapeHtml(value).replaceAll("`", "&#96;");

const WHITESPACE_RE = /\s+/;

const answerRows = (answers: EstimateSubmission["answers"]): string =>
  answers
    .map(
      (row) =>
        `<tr>
          <td style="font-size:13px;color:#5b6b62;padding:8px 0;border-bottom:1px solid #e4e8e6;">${escapeHtml(row.prompt)}</td>
          <td style="font-size:13px;font-weight:700;color:#1a2b22;text-align:right;padding:8px 0;border-bottom:1px solid #e4e8e6;">${escapeHtml(row.answer)}</td>
        </tr>`
    )
    .join("");

export const renderEstimateEmail = (
  submission: EstimateSubmission,
  assets: EmailAssets,
  variant: Variant
): string => {
  const firstName =
    submission.fullName.trim().split(WHITESPACE_RE)[0] || "there";
  const isVisitor = variant === "visitor";
  const previewText = isVisitor
    ? `Your roof estimate: roughly ${submission.rangeDisplay}`
    : `New estimate lead · ${submission.fullName} · ${submission.rangeDisplay}`;
  const scheduleUrl = "https://www.tandra.me/#contact";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(previewText)}</title>
  </head>
  <body style="background:#f3f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 0;color:#1a2b22;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e4e8e6;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 36px 0;">
                <img src="${escapeAttr(assets.headerLogoUrl)}" alt="Birdcreek Roofing" height="60" style="display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 32px;">
                <h1 style="font-size:21px;line-height:28px;color:#0f1f18;margin:0 0 6px;">${isVisitor ? `Here's your rough estimate, ${escapeHtml(firstName)}` : "New estimate lead"}</h1>
                <p style="font-size:13px;color:#5b6b62;margin:0 0 18px;">${isVisitor ? "Thanks for using the roof estimator. Here's roughly what you'll spend based on your answers." : `${escapeHtml(submission.fullName)} (${escapeHtml(submission.email)}) just completed the estimator.`}</p>

                <div style="background:#eef4f0;border-radius:10px;padding:22px 24px;margin:0 0 22px;text-align:center;">
                  <div style="font-size:12px;color:#5b6b62;margin:0 0 4px;text-transform:uppercase;letter-spacing:.08em;">Estimated range</div>
                  <div style="font-size:28px;font-weight:800;color:#0f1f18;margin:0;">${escapeHtml(submission.rangeDisplay)}</div>
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
                  ${answerRows(submission.answers)}
                </table>

                ${
                  isVisitor
                    ? `<p style="font-size:14px;line-height:22px;color:#1a2b22;margin:18px 0;">This is a ballpark only—your real quote depends on materials, pitch, access, and what we find once we're up on the roof. Want a precise number? Let's set up a free look.</p>
                       <p style="margin:4px 0;">
                         <a href="${escapeAttr(scheduleUrl)}" style="display:inline-block;background:#3a7d5d;border-radius:8px;color:#ffffff;font-size:15px;font-weight:600;padding:12px 22px;text-decoration:none;">Schedule a free inspection</a>
                       </p>
                       <hr style="border:0;border-top:1px solid #e4e8e6;margin:22px 0 0;" />
                       <p style="font-size:11px;line-height:18px;color:#8a958e;margin:20px 0 0;">— Tandra Peters, Roofing Consultant · Birdcreek Roofing</p>`
                    : `<p style="margin:8px 0 4px;">
                         <a href="mailto:${escapeAttr(submission.email)}?subject=${encodeURIComponent("Your roof estimate")}" style="display:inline-block;background:#3a7d5d;border-radius:8px;color:#ffffff;font-size:15px;font-weight:600;padding:12px 22px;text-decoration:none;">Reply to ${escapeHtml(firstName)}</a>
                       </p>
                       <hr style="border:0;border-top:1px solid #e4e8e6;margin:22px 0 0;" />
                       <p style="font-size:11px;line-height:18px;color:#8a958e;margin:20px 0 0;">Reach ${escapeHtml(firstName)} at <a href="mailto:${escapeAttr(submission.email)}" style="color:#3a7d5d;text-decoration:none;">${escapeHtml(submission.email)}</a>. A copy of this estimate was also emailed to them.</p>`
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
