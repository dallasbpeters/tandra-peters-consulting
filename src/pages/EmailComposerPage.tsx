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
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RichTextEditor } from "../components/RichTextEditor";
import { SitePageChrome } from "../components/SitePageChrome";
import { useIsMobile } from "../hooks/isMobile";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { layoutClass } from "../styles/layoutClasses";
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
  subject: "",
  previewText: "",
  greeting: "",
  body: [],
  ctaLabel: "",
  ctaUrl: "",
  closing: "",
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

const cardStyle: CSSProperties = {
  borderRadius: theme.radius.xlarge,
  padding: theme.spacing.xl,
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
  boxShadow: `0 16px 40px ${mix(theme.colors.everglade, 7)}`,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: mix(theme.colors.everglade, 70),
  marginBottom: theme.spacing.xs,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  borderRadius: theme.radius.medium,
  border: `1px solid ${mix(theme.colors.everglade, 18)}`,
  backgroundColor: theme.colors.white,
  color: theme.colors.everglade,
  fontSize: "0.95rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const fieldStyle: CSSProperties = { marginBottom: theme.spacing.lg };

const primaryButton = (disabled: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  border: "none",
  borderRadius: theme.radius.pill,
  padding: `${theme.spacing.md} ${theme.spacing.xl}`,
  backgroundColor: disabled
    ? mix(theme.colors.everglade, 30)
    : theme.palette.accent["600"],
  color: theme.colors.white,
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
});

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={fieldStyle}>
    {/* biome-ignore lint/a11y/noLabelWithoutControl: children contains the associated control; biome can't see through the ReactNode prop */}
    <label style={labelStyle}>
      {label}
      {children}
    </label>
  </div>
);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
export const EmailComposerPage = () => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();
  const isMobile = useIsMobile();

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
    title: "Email Composer | Tandra Peters",
    description: "Internal tool to compose and send client emails.",
    robots: "noindex, nofollow",
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
          subject: content.subject ?? "",
          previewText: content.previewText ?? "",
          greeting: content.greeting ?? "",
          body: content.body ?? [],
          ctaLabel: content.ctaLabel ?? "",
          ctaUrl: content.ctaUrl ?? "",
          closing: content.closing ?? "",
        });
        setSignature(content.signature ?? null);
      }
      setDefaultsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token, defaultsLoaded]);

  const content: EmailContent = useMemo(
    () => ({
      subject: form.subject,
      previewText: form.previewText,
      greeting: form.greeting,
      body: form.body,
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
      closing: form.closing,
      signature,
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
    } catch (err) {
      setRecipientsError(
        err instanceof Error ? err.message : "Could not load contacts."
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ content }),
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
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Could not render preview."
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ recipients: selectedList, content }),
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
        setSendResult({ sent: 0, failed: 0, error: json.error });
        return;
      }
      const sentCount = json.sent?.length ?? 0;
      setSendResult({ sent: sentCount, failed: json.failed?.length ?? 0 });
      posthog?.capture("email_composer_sent", { count: sentCount });
      if (sentCount > 0) {
        setSelected({});
      }
    } catch (err) {
      setSendResult({
        sent: 0,
        failed: 0,
        error: err instanceof Error ? err.message : "Send failed.",
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ content }),
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
    } catch (err) {
      setSaveResult({
        ok: false,
        error: err instanceof Error ? err.message : "Save failed.",
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
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.md,
          }}
        >
          <Mail color={theme.palette.accent["600"]} height={26} width={26} />
          <h1
            style={{
              fontSize: "1.6rem",
              color: theme.colors.everglade,
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
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.md,
                color: theme.palette.coral["800"],
              }}
            >
              <WarningTriangle height={20} width={20} />
              <strong>Google auth is not configured</strong>
            </div>
            <p
              style={{
                color: mix(theme.colors.everglade, 75),
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
                    fontSize: "1.2rem",
                    color: theme.colors.everglade,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  Sign in to compose
                </h2>
                <p
                  style={{
                    color: mix(theme.colors.everglade, 72),
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
                <p
                  style={{ color: theme.palette.coral["800"], lineHeight: 1.6 }}
                >
                  {auth.authError}
                </p>
              ) : null}
              {auth.ready ? null : (
                <p style={{ color: mix(theme.colors.everglade, 60) }}>
                  Loading Google sign-in…
                </p>
              )}
            </div>
          </section>
        ) : null}
        {auth.token ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(0, 1fr) minmax(0, 1fr)",
              gap: theme.spacing.xl,
              alignItems: "start",
              marginBlockEnd: theme.spacing.xxxl,
            }}
          >
            {/* Left: edit form + recipients + send */}
            <div style={{ display: "grid", gap: theme.spacing.xl }}>
              <section style={cardStyle}>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    color: theme.colors.everglade,
                    margin: `0 0 ${theme.spacing.lg}`,
                  }}
                >
                  Message
                </h2>

                <Field label="Subject">
                  <input
                    onChange={handleField("subject")}
                    style={inputStyle}
                    value={form.subject}
                  />
                </Field>
                <Field label="Inbox preview text">
                  <input
                    onChange={handleField("previewText")}
                    style={inputStyle}
                    value={form.previewText}
                  />
                </Field>
                <Field label="Greeting">
                  <input
                    onChange={handleField("greeting")}
                    style={inputStyle}
                    value={form.greeting}
                  />
                </Field>
                <Field label="Body">
                  <RichTextEditor
                    key={defaultsLoaded ? "ready" : "loading"}
                    onChange={(body) => setForm((prev) => ({ ...prev, body }))}
                    placeholder="Write your message…"
                    value={form.body}
                  />
                </Field>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: theme.spacing.lg,
                  }}
                >
                  <Field label="Button label">
                    <input
                      onChange={handleField("ctaLabel")}
                      style={inputStyle}
                      value={form.ctaLabel}
                    />
                  </Field>
                  <Field label="Button link">
                    <input
                      onChange={handleField("ctaUrl")}
                      style={inputStyle}
                      value={form.ctaUrl}
                    />
                  </Field>
                </div>
                <Field label="Closing">
                  <input
                    onChange={handleField("closing")}
                    style={inputStyle}
                    value={form.closing}
                  />
                </Field>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: mix(theme.colors.everglade, 55),
                    margin: `0 0 ${theme.spacing.lg}`,
                  }}
                >
                  Signature is pulled from the published email in Studio. Edit
                  it there to change the headshot, logo, or contact details.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.lg,
                    flexWrap: "wrap",
                    borderTop: `1px solid ${mix(theme.colors.everglade, 10)}`,
                    paddingTop: theme.spacing.lg,
                  }}
                >
                  <button
                    disabled={savingDefault || !defaultsLoaded}
                    onClick={() => {
                      handleSaveDefault();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      border: `1px solid ${mix(theme.colors.everglade, 20)}`,
                      borderRadius: theme.radius.pill,
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      backgroundColor: theme.colors.white,
                      color: theme.colors.everglade,
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor:
                        savingDefault || !defaultsLoaded
                          ? "not-allowed"
                          : "pointer",
                      opacity: savingDefault || !defaultsLoaded ? 0.6 : 1,
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
                            fontSize: "0.8rem",
                            color: mix(theme.colors.everglade, 55),
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
                            display: "inline-flex",
                            alignItems: "center",
                            gap: theme.spacing.sm,
                            color: theme.palette.accent["700"],
                            fontSize: "0.85rem",
                          }}
                        >
                          <CheckCircle height={16} width={16} /> Saved to Studio
                        </span>
                      );
                    }
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: theme.spacing.sm,
                          color: theme.palette.coral["800"],
                          fontSize: "0.85rem",
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
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: theme.spacing.lg,
                    gap: theme.spacing.md,
                    flexWrap: "wrap",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.05rem",
                      color: theme.colors.everglade,
                      margin: 0,
                    }}
                  >
                    Recipients{" "}
                    <span
                      style={{
                        color: mix(theme.colors.everglade, 55),
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
                      border: `1px solid ${mix(theme.colors.everglade, 16)}`,
                      borderRadius: theme.radius.pill,
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.white,
                      color: theme.colors.everglade,
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                <div
                  style={{
                    position: "relative",
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <Search
                    color={mix(theme.colors.everglade, 50)}
                    height={16}
                    style={{
                      position: "absolute",
                      left: 12,
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
                          color: theme.palette.coral["800"],
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
                          color: mix(theme.colors.everglade, 60),
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
                          color: mix(theme.colors.everglade, 60),
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
                        maxHeight: 260,
                        overflowY: "auto",
                        border: `1px solid ${mix(theme.colors.everglade, 12)}`,
                        borderRadius: theme.radius.medium,
                      }}
                    >
                      {filteredRecipients.map((r) => {
                        const checked = Boolean(selected[r.email]);
                        return (
                          <label
                            key={r.email}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: theme.spacing.md,
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              borderBottom: `1px solid ${mix(theme.colors.everglade, 8)}`,
                              cursor: "pointer",
                              backgroundColor: checked
                                ? theme.palette.accent["100"]
                                : "transparent",
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
                                  color: theme.colors.everglade,
                                  fontWeight: 600,
                                }}
                              >
                                {r.name}
                              </span>
                              <span
                                style={{
                                  color: mix(theme.colors.everglade, 55),
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
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.lg,
                    marginTop: theme.spacing.lg,
                    flexWrap: "wrap",
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
                        display: "inline-flex",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        color: theme.palette.coral["800"],
                      }}
                    >
                      <WarningTriangle height={16} width={16} />{" "}
                      {sendResult.error}
                    </span>
                  ) : null}
                  {sendResult && !sendResult.error ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        color: theme.palette.accent["700"],
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: `${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.md}`,
                }}
              >
                <span style={{ ...labelStyle, marginBottom: 0 }}>
                  Live preview
                </span>
                {previewError ? (
                  <span
                    style={{
                      color: theme.palette.coral["800"],
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
                  width: "100%",
                  height: isMobile ? 520 : 720,
                  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
                  borderRadius: theme.radius.large,
                  backgroundColor: "#f3f5f4",
                  display: "block",
                }}
                title="Email preview"
              />
            </section>
          </div>
        ) : null}
        ;
      </div>
    </SitePageChrome>
  );
};

export default EmailComposerPage;
