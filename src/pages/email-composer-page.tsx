import type { PortableTextBlock } from "@portabletext/editor";
import { usePostHog } from "@posthog/react";
import {
  CheckCircle,
  FloppyDisk,
  Mail,
  Search,
  SendDiagonal,
  WarningTriangle,
} from "iconoir-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { RichTextEditor } from "../components/rich-text-editor";
import { SitePageChrome } from "../components/site-page-chrome";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { useIsMobile } from "../hooks/is-mobile";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";
import { mix, theme } from "../theme";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

interface Recipient {
  email: string;
  id: string;
  name: string;
}

interface EmailSignature {
  company?: string;
  email?: string;
  headshotUrl?: string;
  jobTitle?: string;
  logoUrl?: string;
  name?: string;
  phone?: string;
  tagline?: string;
  website?: string;
}

interface EmailContent {
  body?: PortableTextBlock[];
  closing?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  greeting?: string;
  previewText?: string;
  signature?: EmailSignature | null;
  subject?: string;
}

interface FormState {
  body: PortableTextBlock[];
  closing: string;
  ctaLabel: string;
  ctaUrl: string;
  greeting: string;
  previewText: string;
  subject: string;
}

const EMPTY_FORM: FormState = {
  body: [],
  closing: "",
  ctaLabel: "",
  ctaUrl: "",
  greeting: "",
  previewText: "",
  subject: "",
};

const textParam = (params: URLSearchParams, key: string): string =>
  params.get(key)?.trim() ?? "";

const makePortableTextParagraph = (text: string): PortableTextBlock =>
  ({
    _key: crypto.randomUUID(),
    _type: "block",
    children: [
      {
        _key: crypto.randomUUID(),
        _type: "span",
        marks: [],
        text,
      },
    ],
    markDefs: [],
    style: "normal",
  }) as PortableTextBlock;

const emailBodyFromCalendar = (
  params: URLSearchParams
): PortableTextBlock[] => {
  const title = textParam(params, "calendarTitle");
  const brief = textParam(params, "calendarBrief");
  const area = textParam(params, "calendarArea");
  const keyword = textParam(params, "calendarKeyword");

  const body = [
    brief,
    area ? `Local focus: ${area}.` : null,
    keyword ? `Target phrase: ${keyword}.` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [makePortableTextParagraph(body || title)];
};

const PUBLISHED_QUERY = `*[_type == "clientEmail"][0]{
  subject, previewText, greeting, body, ctaLabel, ctaUrl, closing,
  "signature": signature->{
    name, jobTitle, company, tagline, phone, email, website,
    "headshotUrl": headshot.asset->url, "logoUrl": companyLogo.asset->url
  }
}`;

const fetchPublishedEmail = async (): Promise<EmailContent | null> => {
  const url =
    `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}` +
    `?query=${encodeURIComponent(PUBLISHED_QUERY)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as { result?: EmailContent | null };
    return json.result ?? null;
  } catch {
    return null;
  }
};

const cssVar = (name: string, fallback: string): string =>
  `var(${name}, ${fallback})`;

const backendSurfaceColor = cssVar("--backend-surface", theme.colors.white);
const backendSurfaceRaisedColor = cssVar(
  "--backend-surface-raised",
  theme.colors.white
);
const backendPageSoftColor = cssVar("--backend-page-soft", theme.colors.white);
const backendBorderColor = cssVar(
  "--backend-border",
  mix(theme.colors.everglade, 10)
);
const backendBorderStrongColor = cssVar(
  "--backend-border-strong",
  mix(theme.colors.everglade, 18)
);
const backendTextColor = cssVar("--backend-text", theme.colors.everglade);
const backendMutedColor = cssVar(
  "--backend-muted",
  mix(theme.colors.everglade, 70)
);
const backendAccentColor = cssVar(
  "--backend-accent",
  theme.palette.accent["600"]
);
const backendAccentOnColor = cssVar("--backend-accent-on", theme.colors.white);
const backendDangerColor = cssVar(
  "--backend-danger",
  theme.palette.coral["800"]
);

const cardStyle: CSSProperties = {
  backgroundColor: backendSurfaceColor,
  border: `1px solid ${backendBorderColor}`,
  borderRadius: theme.radius.xlarge,
  boxShadow: "var(--backend-shadow, 0 16px 40px rgb(30 50 44 / 7%))",
  padding: theme.spacing.xl,
};

const labelStyle: CSSProperties = {
  color: backendMutedColor,
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  marginBottom: theme.spacing.xs,
  textTransform: "uppercase",
};

const inputStyle: CSSProperties = {
  backgroundColor: backendPageSoftColor,
  border: `1px solid ${backendBorderStrongColor}`,
  borderRadius: theme.radius.medium,
  boxSizing: "border-box",
  color: backendTextColor,
  fontFamily: "inherit",
  fontSize: "0.95rem",
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  width: "100%",
};

const fieldStyle: CSSProperties = { marginBottom: theme.spacing.lg };

const primaryButton = (disabled: boolean): CSSProperties => ({
  alignItems: "center",
  backgroundColor: disabled ? backendSurfaceRaisedColor : backendAccentColor,
  border: "none",
  borderRadius: theme.radius.pill,
  color: disabled ? backendMutedColor : backendAccentOnColor,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  fontSize: "0.95rem",
  fontWeight: 700,
  gap: theme.spacing.sm,
  padding: `${theme.spacing.md} ${theme.spacing.xl}`,
});

const Field = ({
  label,
  htmlFor,
  children,
}: {
  htmlFor?: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div style={fieldStyle}>
    {htmlFor ? (
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
    ) : (
      <div style={labelStyle}>{label}</div>
    )}
    {children}
  </div>
);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
export const EmailComposerPage = () => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const appliedCalendarEntryRef = useRef<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [signature, setSignature] = useState<EmailSignature | null>(null);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, Recipient>>({});
  const [search, setSearch] = useState("");

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    error?: string;
  } | null>(null);

  const [savingDefault, setSavingDefault] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    error?: string;
  } | null>(null);

  usePageMetadata({
    description: "Internal tool to compose and send client emails.",
    robots: "noindex, nofollow",
    title: "Email Composer | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("email_composer_viewed");
  }, [posthog]);

  // Prefill the form from the published Sanity email once signed in.
  useEffect(() => {
    if (!auth.token || defaultsLoaded) {
      return;
    }
    let cancelled = false;
    (async () => {
      const content = await fetchPublishedEmail();
      if (cancelled) {
        return;
      }
      if (content) {
        setForm({
          body: content.body ?? [],
          closing: content.closing ?? "",
          ctaLabel: content.ctaLabel ?? "",
          ctaUrl: content.ctaUrl ?? "",
          greeting: content.greeting ?? "",
          previewText: content.previewText ?? "",
          subject: content.subject ?? "",
        });
        setSignature(content.signature ?? null);
      }
      setDefaultsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token, defaultsLoaded]);

  useEffect(() => {
    if (!(auth.token && defaultsLoaded)) {
      return;
    }
    const calendarEntryId = textParam(searchParams, "calendarEntryId");
    if (
      !calendarEntryId ||
      appliedCalendarEntryRef.current === calendarEntryId
    ) {
      return;
    }

    const title = textParam(searchParams, "calendarTitle");
    const brief = textParam(searchParams, "calendarBrief");
    appliedCalendarEntryRef.current = calendarEntryId;
    setForm((current) => ({
      ...current,
      body: emailBodyFromCalendar(searchParams),
      previewText: brief.slice(0, 150) || current.previewText,
      subject: title || current.subject,
    }));
  }, [auth.token, defaultsLoaded, searchParams]);

  const content: EmailContent = useMemo(
    () => ({
      body: form.body,
      closing: form.closing,
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
      greeting: form.greeting,
      previewText: form.previewText,
      signature,
      subject: form.subject,
    }),
    [form, signature]
  );

  const handleField = useCallback(
    (key: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
      },
    []
  );

  // Load contacts from the CRM when signed in.
  const loadRecipients = useCallback(async () => {
    if (!auth.token) {
      return;
    }
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const res = await fetch("/api/email/recipients", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const json = (await res.json()) as {
        recipients?: Recipient[];
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          auth.signOut("Your session expired or this account is not allowed.");
        }
        throw new Error(json.error || "Could not load contacts.");
      }
      setRecipients(json.recipients ?? []);
    } catch (error) {
      setRecipientsError(
        error instanceof Error ? error.message : "Could not load contacts."
      );
    } finally {
      setRecipientsLoading(false);
    }
  }, [auth.token, auth.signOut]);

  useEffect(() => {
    if (auth.token) {
      loadRecipients();
    }
  }, [auth.token, loadRecipients]);

  // Debounced live preview render.
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!(auth.token && defaultsLoaded)) {
      return;
    }
    if (renderTimer.current) {
      clearTimeout(renderTimer.current);
    }
    renderTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/email/render", {
          body: JSON.stringify({ content }),
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const json = (await res.json()) as { html?: string; error?: string };
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            auth.signOut(
              "Your session expired or this account is not allowed."
            );
          }
          throw new Error(json.error || "Could not render preview.");
        }
        setPreviewHtml(json.html ?? "");
        setPreviewError(null);
      } catch (error) {
        setPreviewError(
          error instanceof Error ? error.message : "Could not render preview."
        );
      }
    }, 500);
    return () => {
      if (renderTimer.current) {
        clearTimeout(renderTimer.current);
      }
    };
  }, [auth.token, auth.signOut, content, defaultsLoaded]);

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return recipients;
    }
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [recipients, search]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const toggleRecipient = useCallback((recipient: Recipient) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[recipient.email]) {
        delete next[recipient.email];
      } else {
        next[recipient.email] = recipient;
      }
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!auth.token || selectedList.length === 0) {
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/email/send", {
        body: JSON.stringify({ content, recipients: selectedList }),
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const json = (await res.json()) as {
        sent?: string[];
        failed?: { email: string; error: string }[];
        error?: string;
      };
      if (!res.ok && json.error) {
        if (res.status === 401 || res.status === 403) {
          auth.signOut("Your session expired or this account is not allowed.");
        }
        setSendResult({ error: json.error, failed: 0, sent: 0 });
        return;
      }
      const sentCount = json.sent?.length ?? 0;
      setSendResult({ failed: json.failed?.length ?? 0, sent: sentCount });
      posthog?.capture("email_composer_sent", { count: sentCount });
      if (sentCount > 0) {
        setSelected({});
      }
    } catch (error) {
      setSendResult({
        error: error instanceof Error ? error.message : "Send failed.",

        failed: 0,
        sent: 0,
      });
    } finally {
      setSending(false);
    }
  }, [auth.token, auth.signOut, content, posthog, selectedList]);

  const handleSaveDefault = useCallback(async () => {
    if (!auth.token) {
      return;
    }
    setSavingDefault(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/email/save-default", {
        body: JSON.stringify({ content }),
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!(res.ok && json.ok)) {
        if (res.status === 401 || res.status === 403) {
          auth.signOut("Your session expired or this account is not allowed.");
        }
        throw new Error(json.error || "Could not save default.");
      }
      setSaveResult({ ok: true });
      posthog?.capture("email_default_saved");
    } catch (error) {
      setSaveResult({
        error: error instanceof Error ? error.message : "Save failed.",

        ok: false,
      });
    } finally {
      setSavingDefault(false);
    }
  }, [auth.token, auth.signOut, content, posthog]);

  return (
    <SitePageChrome>
      <div
        className={layoutClass.containerWide}
        style={{ display: "grid", gap: theme.spacing.xl }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: theme.spacing.md,
          }}
        >
          <Mail color={theme.palette.accent["600"]} height={26} width={26} />
          <h1
            style={{
              color: backendTextColor,
              fontSize: "1.6rem",
              margin: 0,
            }}
          >
            Email composer
          </h1>
        </div>
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
              Add <code>VITE_GOOGLE_CLIENT_ID</code> so the composer can render
              the sign-in button.
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
                  Sign in to compose
                </h2>
                <p
                  style={{
                    color: backendMutedColor,
                    lineHeight: 1.7,
                    maxWidth: "36rem",
                  }}
                >
                  This tool is gated with Google Identity Services and a
                  server-side allowlist.
                </p>
              </div>
              <div ref={auth.buttonRef} />
              {auth.authError ? (
                <p style={{ color: backendDangerColor, lineHeight: 1.6 }}>
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
        {auth.token ? (
          <div
            style={{
              alignItems: "start",
              display: "grid",
              gap: theme.spacing.xl,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(0, 1fr) minmax(0, 1fr)",
              marginBlockEnd: theme.spacing.xxxl,
            }}
          >
            {/* Left: edit form + recipients + send */}
            <div style={{ display: "grid", gap: theme.spacing.xl }}>
              <section style={cardStyle}>
                <h2
                  style={{
                    color: backendTextColor,
                    fontSize: "1.05rem",
                    margin: `0 0 ${theme.spacing.lg}`,
                  }}
                >
                  Message
                </h2>

                <Field htmlFor="email-subject" label="Subject">
                  <input
                    id="email-subject"
                    onChange={handleField("subject")}
                    style={inputStyle}
                    value={form.subject}
                  />
                </Field>
                <Field htmlFor="email-preview-text" label="Inbox preview text">
                  <input
                    id="email-preview-text"
                    onChange={handleField("previewText")}
                    style={inputStyle}
                    value={form.previewText}
                  />
                </Field>
                <Field htmlFor="email-greeting" label="Greeting">
                  <input
                    id="email-greeting"
                    onChange={handleField("greeting")}
                    style={inputStyle}
                    value={form.greeting}
                  />
                </Field>
                <Field label="Body">
                  <RichTextEditor
                    ariaLabel="Email body"
                    key={defaultsLoaded ? "ready" : "loading"}
                    onChange={(body) => setForm((prev) => ({ ...prev, body }))}
                    placeholder="Write your message…"
                    value={form.body}
                  />
                </Field>
                <div
                  style={{
                    display: "grid",
                    gap: theme.spacing.lg,
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <Field htmlFor="email-cta-label" label="Button label">
                    <input
                      id="email-cta-label"
                      onChange={handleField("ctaLabel")}
                      style={inputStyle}
                      value={form.ctaLabel}
                    />
                  </Field>
                  <Field htmlFor="email-cta-url" label="Button link">
                    <input
                      id="email-cta-url"
                      onChange={handleField("ctaUrl")}
                      style={inputStyle}
                      value={form.ctaUrl}
                    />
                  </Field>
                </div>
                <Field htmlFor="email-closing" label="Closing">
                  <input
                    id="email-closing"
                    onChange={handleField("closing")}
                    style={inputStyle}
                    value={form.closing}
                  />
                </Field>
                <p
                  style={{
                    color: backendMutedColor,
                    fontSize: "0.8rem",
                    margin: `0 0 ${theme.spacing.lg}`,
                  }}
                >
                  Signature is pulled from the published email in Studio. Edit
                  it there to change the headshot, logo, or contact details.
                </p>

                <div
                  style={{
                    alignItems: "center",
                    borderTop: `1px solid ${backendBorderColor}`,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                  }}
                >
                  <button
                    disabled={savingDefault || !defaultsLoaded}
                    onClick={() => {
                      handleSaveDefault();
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: backendSurfaceRaisedColor,
                      border: `1px solid ${backendBorderStrongColor}`,
                      borderRadius: theme.radius.pill,
                      color: backendTextColor,
                      cursor:
                        savingDefault || !defaultsLoaded
                          ? "not-allowed"
                          : "pointer",
                      display: "inline-flex",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      gap: theme.spacing.sm,
                      opacity: savingDefault || !defaultsLoaded ? 0.6 : 1,
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    }}
                    type="button"
                  >
                    <FloppyDisk height={16} width={16} />
                    {savingDefault ? "Saving…" : "Save as default"}
                  </button>

                  {(() => {
                    if (!saveResult) {
                      return (
                        <span
                          style={{
                            color: backendMutedColor,
                            fontSize: "0.8rem",
                          }}
                        >
                          Updates the published default for everyone.
                        </span>
                      );
                    }
                    if (saveResult.ok) {
                      return (
                        <span
                          style={{
                            alignItems: "center",
                            color: theme.palette.accent["700"],
                            display: "inline-flex",
                            fontSize: "0.85rem",
                            gap: theme.spacing.sm,
                          }}
                        >
                          <CheckCircle height={16} width={16} /> Saved to Studio
                        </span>
                      );
                    }
                    return (
                      <span
                        style={{
                          alignItems: "center",
                          color: backendDangerColor,
                          display: "inline-flex",
                          fontSize: "0.85rem",
                          gap: theme.spacing.sm,
                        }}
                      >
                        <WarningTriangle height={16} width={16} />{" "}
                        {saveResult.error}
                      </span>
                    );
                  })()}
                </div>
              </section>

              <section style={cardStyle}>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.md,
                    justifyContent: "space-between",
                    marginBottom: theme.spacing.lg,
                  }}
                >
                  <h2
                    style={{
                      color: backendTextColor,
                      fontSize: "1.05rem",
                      margin: 0,
                    }}
                  >
                    Recipients{" "}
                    <span
                      style={{
                        color: backendMutedColor,
                        fontWeight: 400,
                      }}
                    >
                      ({selectedList.length} selected)
                    </span>
                  </h2>
                  <button
                    onClick={() => {
                      loadRecipients();
                    }}
                    style={{
                      backgroundColor: backendSurfaceRaisedColor,
                      border: `1px solid ${backendBorderColor}`,
                      borderRadius: theme.radius.pill,
                      color: backendTextColor,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    }}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                <div
                  style={{
                    marginBottom: theme.spacing.md,
                    position: "relative",
                  }}
                >
                  <Search
                    color={backendMutedColor}
                    height={16}
                    style={{
                      left: 12,
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    width={16}
                  />
                  <input
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts…"
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    value={search}
                  />
                </div>

                {(() => {
                  if (recipientsError) {
                    return (
                      <p
                        style={{
                          color: backendDangerColor,
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {recipientsError}
                      </p>
                    );
                  }
                  if (recipientsLoading) {
                    return (
                      <p
                        style={{
                          color: backendMutedColor,
                          margin: 0,
                        }}
                      >
                        Loading contacts…
                      </p>
                    );
                  }
                  if (filteredRecipients.length === 0) {
                    return (
                      <p
                        style={{
                          color: backendMutedColor,
                          margin: 0,
                        }}
                      >
                        No contacts found.
                      </p>
                    );
                  }
                  return (
                    <div
                      style={{
                        border: `1px solid ${backendBorderColor}`,
                        borderRadius: theme.radius.medium,
                        maxHeight: 260,
                        overflowY: "auto",
                      }}
                    >
                      {filteredRecipients.map((r) => {
                        const checked = Boolean(selected[r.email]);
                        return (
                          <label
                            key={r.email}
                            style={{
                              alignItems: "center",
                              backgroundColor: checked
                                ? "var(--backend-accent-soft, var(--accent))"
                                : "transparent",
                              borderBottom: `1px solid ${backendBorderColor}`,
                              cursor: "pointer",
                              display: "flex",
                              gap: theme.spacing.md,
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            }}
                          >
                            <input
                              checked={checked}
                              onChange={() => toggleRecipient(r)}
                              type="checkbox"
                            />
                            <span style={{ display: "grid" }}>
                              <span
                                style={{
                                  color: backendTextColor,
                                  fontWeight: 600,
                                }}
                              >
                                {r.name}
                              </span>
                              <span
                                style={{
                                  color: backendMutedColor,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {r.email}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}

                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.lg,
                    marginTop: theme.spacing.lg,
                  }}
                >
                  <button
                    disabled={sending || selectedList.length === 0}
                    onClick={() => {
                      handleSend();
                    }}
                    style={primaryButton(sending || selectedList.length === 0)}
                    type="button"
                  >
                    <SendDiagonal height={18} width={18} />
                    {(() => {
                      if (sending) {
                        return "Sending…";
                      }
                      const contactWord =
                        selectedList.length === 1 ? "contact" : "contacts";
                      return `Send to ${selectedList.length || ""} ${contactWord}`;
                    })()}
                  </button>

                  {sendResult?.error ? (
                    <span
                      style={{
                        alignItems: "center",
                        color: backendDangerColor,
                        display: "inline-flex",
                        gap: theme.spacing.sm,
                      }}
                    >
                      <WarningTriangle height={16} width={16} />{" "}
                      {sendResult.error}
                    </span>
                  ) : null}
                  {sendResult && !sendResult.error ? (
                    <span
                      style={{
                        alignItems: "center",
                        color: theme.palette.accent["700"],
                        display: "inline-flex",
                        gap: theme.spacing.sm,
                      }}
                    >
                      <CheckCircle height={16} width={16} /> Sent{" "}
                      {sendResult.sent}
                      {sendResult.failed > 0
                        ? ` · ${sendResult.failed} failed`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </section>
            </div>

            {/* Right: live preview */}
            <section
              style={{
                ...cardStyle,
                padding: theme.spacing.md,
                position: isMobile ? "static" : "sticky",
                top: theme.spacing.xl,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: `${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.md}`,
                }}
              >
                <span style={{ ...labelStyle, marginBottom: 0 }}>
                  Live preview
                </span>
                {previewError ? (
                  <span
                    style={{
                      color: backendDangerColor,
                      fontSize: "0.8rem",
                    }}
                  >
                    {previewError}
                  </span>
                ) : null}
              </div>
              <iframe
                srcDoc={previewHtml}
                style={{
                  backgroundColor: "#f3f5f4",
                  border: `1px solid ${backendBorderColor}`,
                  borderRadius: theme.radius.large,
                  display: "block",
                  height: isMobile ? 520 : 720,
                  width: "100%",
                }}
                title="Email preview"
              />
            </section>
          </div>
        ) : null}
      </div>
    </SitePageChrome>
  );
};

export default EmailComposerPage;
