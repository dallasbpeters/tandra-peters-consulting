const RE_NEWLINE = /\r?\n/;
const RE_NON_PHONE_CHARS = /[^0-9+]/g;
const WHITESPACE_RE = /\s+/;

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttr = (value) => escapeHtml(value).replaceAll("`", "&#96;");

const formatTimestamp = (iso) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("en-US");
  }
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });
};

const messageHtml = (message) =>
  message
    .split(RE_NEWLINE)
    .map((line) => (line ? escapeHtml(line) : "&nbsp;"))
    .join("<br />");

const maybeField = (label, value) => {
  const v = value?.trim();
  if (!v) {
    return "";
  }
  return `<section>
    <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b62;padding:0 0 4px;margin:0;">${escapeHtml(label)}</p>
    <p style="font-size:15px;line-height:24px;color:#1a2b22;margin:0 0 18px;">${escapeHtml(v)}</p>
  </section>`;
};

export const renderContactLeadEmail = (submission, assets) => {
  const name = submission.fullName.trim() || "Website visitor";
  const service = submission.serviceLabel?.trim();
  const phone = submission.phoneNumber?.trim();
  const address = submission.propertyAddress?.trim();
  const firstName = name.split(WHITESPACE_RE)[0] || "there";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New roofing inquiry</title>
  </head>
  <body style="background:#f3f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 0;color:#1a2b22;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">New roofing inquiry from ${escapeHtml(name)}${service ? ` \u00b7 ${escapeHtml(service)}` : ""}</div>
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
                <h1 style="font-size:21px;line-height:28px;color:#0f1f18;margin:0 0 6px;">New roofing inquiry</h1>
                <p style="font-size:13px;color:#5b6b62;margin:0 0 22px;">Submitted via the website contact form on ${escapeHtml(formatTimestamp(submission.submittedAt))}.</p>

                ${maybeField("Name", name)}
                <section>
                  <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b62;padding:0 0 4px;margin:0;">Email</p>
                  <p style="font-size:15px;line-height:24px;color:#1a2b22;margin:0 0 18px;"><a href="mailto:${escapeAttr(submission.email)}" style="color:#3a7d5d;text-decoration:none;">${escapeHtml(submission.email)}</a></p>
                </section>
                ${
                  phone
                    ? `<section>
                         <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b62;padding:0 0 4px;margin:0;">Phone</p>
                         <p style="font-size:15px;line-height:24px;color:#1a2b22;margin:0 0 18px;"><a href="tel:${escapeAttr(phone.replace(RE_NON_PHONE_CHARS, ""))}" style="color:#3a7d5d;text-decoration:none;">${escapeHtml(phone)}</a></p>
                       </section>`
                    : ""
                }
                ${maybeField("Service interest", service)}
                ${maybeField("Property / address", address)}
                <section>
                  <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b62;padding:0 0 4px;margin:0;">Message</p>
                  <p style="font-size:15px;line-height:24px;color:#1a2b22;margin:0 0 18px;">${messageHtml(submission.message)}</p>
                </section>

                <p style="margin:8px 0 4px;">
                  <a href="mailto:${escapeAttr(submission.email)}?subject=${encodeURIComponent("Re: your roofing inquiry")}" style="display:inline-block;background:#3a7d5d;border-radius:8px;color:#ffffff;font-size:15px;font-weight:600;padding:12px 22px;text-decoration:none;">Reply to ${escapeHtml(firstName)}</a>
                </p>

                <hr style="border:0;border-top:1px solid #e4e8e6;margin:22px 0 0;" />
                <p style="font-size:11px;line-height:18px;color:#8a958e;margin:20px 0 0;">The visitor confirmed consent to be contacted by email, phone, or SMS. Reply directly to this email to reach them.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
