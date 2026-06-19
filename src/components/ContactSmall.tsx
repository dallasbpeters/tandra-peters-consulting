import "@fontsource/bebas-neue/latin-400.css";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { usePostHog } from "@posthog/react";
import { Mail, Phone, Send } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useState } from "react";
import { Dither, LinearGradient, Shader, WaveDistortion } from "shaders/react";

import { layoutClass } from "../styles/layoutClasses";
import "@awesome.me/webawesome/dist/styles/themes/default.css";

import { mix, theme } from "../theme";
import type { ContactProps } from "../types";
import { TransitionLink } from "./TransitionLink";

/** Relative path so production stays same-origin; Vite can proxy `/api` in dev (see vite.config). */
const CONTACT_API_PATH = "/api/contact";

/** Compact form has no service picker; API requires `serviceInterest` + `message`. */
const COMPACT_DEFAULT_SERVICE = "shingle-roofing";
const COMPACT_DEFAULT_MESSAGE =
  "Please contact me using the email and phone provided.";

const trackGaContactForm = (payload: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (typeof gtag !== "function") {
    return;
  }

  gtag("event", "contact_form", payload);
};

export const ContactSmall = ({
  title = "Get a free roofing consultation.",
  formLabels,
}: ContactProps) => {
  const [fullName, setFullName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [consentToContact, setConsentToContact] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitStatus === "sending") {
      return;
    }
    setErrorMessage("");

    if (!consentToContact) {
      setSubmitStatus("error");
      setErrorMessage(
        "Please confirm you agree to be contacted before sending your message."
      );
      return;
    }

    setSubmitStatus("sending");

    try {
      const res = await fetch(CONTACT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: visitorEmail,
          phoneNumber,
          serviceInterest: COMPACT_DEFAULT_SERVICE,
          message: COMPACT_DEFAULT_MESSAGE,
          consentToContact: true,
          _hp: honeypot,
        }),
      });
      const rawText = await res.text();
      let data = {} as { ok?: boolean; error?: string };
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        data = {};
      }
      const vercelFnError = res.headers.get("x-vercel-error");
      const contentType = res.headers.get("content-type") ?? "";
      if (!(res.ok && data.ok)) {
        setSubmitStatus("error");
        const fromApi =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
        const byStatus = (() => {
          if (fromApi) {
            return "";
          }
          if (res.status === 404) {
            return "Contact form endpoint was not found. On local dev, set VITE_CONTACT_API_URL in .env.local to your live site (Vite will proxy /api) or run `vercel dev`.";
          }
          if (res.status === 403) {
            return "This site is not allowed to submit the form (ALLOWED_ORIGINS). Add your exact URL, including https:// and www if used.";
          }
          if (res.status === 503) {
            return "Email delivery isn't configured (missing RESEND_API_KEY or EMAIL_FROM). Add them in Vercel → Project → Environment Variables.";
          }
          if (res.status === 502) {
            return "Could not send your message right now. Try again later or contact us by phone or email.";
          }
          if (res.ok && !data.ok) {
            return "The server returned an unexpected response. Check that /api/contact is not rewritten to the SPA.";
          }
          if (
            !fromApi &&
            rawText &&
            !rawText.trim().startsWith("{") &&
            (res.status >= 500 ||
              vercelFnError ||
              contentType.includes("text/html"))
          ) {
            return vercelFnError === "FUNCTION_INVOCATION_FAILED"
              ? "Contact form server failed to run on Vercel (check Functions logs after deploy). If this persists, confirm api/contact.ts builds and redeploy."
              : "Server returned an error instead of JSON (often a Vercel function crash or HTML fallback). Check Vercel → Deployments → Functions → /api/contact logs.";
          }
          if (!fromApi && rawText && !rawText.trim().startsWith("{")) {
            return "Received a non-JSON response (often HTML). The /api/contact route may not be deployed or is being rewritten to index.html.";
          }
          return "Something went wrong. Please try again.";
        })();
        posthog?.capture("contact_form_error", {
          status: res.status,
          error: fromApi || byStatus,
        });
        setErrorMessage(fromApi || byStatus);
        return;
      }
      posthog?.identify(visitorEmail, { name: fullName, email: visitorEmail });
      posthog?.capture("contact_form_submitted", {
        service_interest: COMPACT_DEFAULT_SERVICE,
        has_message: false,
        has_phone: Boolean(phoneNumber.trim()),
        form_variant: "compact",
      });
      trackGaContactForm({
        form_variant: "compact",
        service_interest: COMPACT_DEFAULT_SERVICE,
        has_message: false,
        has_phone: Boolean(phoneNumber.trim()),
      });
      setSubmitStatus("success");
      setFullName("");
      setVisitorEmail("");
      setPhoneNumber("");
      setHoneypot("");
      setConsentToContact(false);
    } catch (err) {
      posthog?.captureException(err);
      setSubmitStatus("error");
      setErrorMessage(
        "Network or CORS error. Use the same URL as your deployed site, or run `vercel dev`. For `pnpm dev`, set VITE_CONTACT_API_URL in .env.local so Vite can proxy /api/contact to production."
      );
    }
  };

  const sectionStyle: React.CSSProperties = {
    paddingTop: theme.spacing.xxxxl,
    paddingBottom: theme.spacing.xxxxl,
    backgroundColor: theme.colors.evergladeLight,
    position: "relative",
  };

  const formCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.xxxxl,
    borderRadius: theme.radius.large,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    position: "relative",
    zIndex: 1,
  };

  const consentLinkStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 8vw, 3rem)",
    lineHeight: 1,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.fonts.special,
    fontWeight: 400,
  };

  const consentRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    color: theme.colors.everglade,
  };

  const checkboxStyle: React.CSSProperties = {
    marginTop: theme.spacing.nudge,
    width: "1.125rem",
    height: "1.125rem",
    flexShrink: 0,
    accentColor: theme.colors.everglade,
    cursor: "pointer",
  };

  const shaderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  const nameLabel = formLabels?.name ?? "Full Name";
  const emailLabel = formLabels?.email ?? "Email Address";
  const submitLabel = formLabels?.button ?? "Send";

  return (
    <section
      aria-labelledby="contact-small-heading"
      id="contact"
      style={sectionStyle}
    >
      <div className={layoutClass.containerContactCompact}>
        <style>{`
          .contact-form-field::placeholder {
            color: ${mix(theme.colors.everglade, 33)};
          }
          .contact-form-field:focus {
            border-bottom-color: ${theme.colors.accent} !important;
          }
          .contact-form-field:focus-visible {
            outline: 2px solid ${theme.colors.accent} !important;
            outline-offset: 2px;
          }
          .send-btn:hover { background-color: ${mix(theme.colors.everglade, 93)} !important; }
          .send-btn:hover .send-icon { transform: translate(8px, 0) !important; }
        `}</style>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          style={formCardStyle}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 id="contact-small-heading" style={headingStyle}>
            {title}
          </h2>

          {submitStatus === "success" ? (
            <div
              aria-live="polite"
              role="status"
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.5,
                color: theme.colors.everglade,
              }}
            >
              Thanks — your message was sent. We’ll be in touch soon.
            </div>
          ) : (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onKeyDown stops propagation on a native form element
            <form
              noValidate
              onKeyDown={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.xxl,
              }}
            >
              <input
                aria-hidden
                autoComplete="off"
                name="_hp"
                onChange={(ev) => setHoneypot(ev.target.value)}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
                tabIndex={-1}
                type="text"
                value={honeypot}
              />

              <WaInput
                autocomplete="name"
                className="contact-form-field"
                id="contact-small-full-name"
                label={nameLabel}
                name="full-name"
                onChange={(ev) => setFullName(ev.target.value)}
                placeholder="John Doe"
                required
                type="text"
                value={fullName}
              />

              <WaInput
                autocomplete="email"
                className="contact-form-field"
                id="contact-small-email"
                label={emailLabel}
                name="email"
                onChange={(ev) => setVisitorEmail(ev.target.value)}
                placeholder="john@example.com"
                required
                type="email"
                value={visitorEmail}
              >
                <Mail
                  aria-hidden
                  color="var(--wa-color-brand)"
                  height={16}
                  slot="start"
                  style={{ marginInlineEnd: theme.spacing.sm }}
                  width={16}
                />
              </WaInput>

              <WaInput
                autocomplete="tel"
                className="contact-form-field"
                id="contact-small-phone"
                label="Phone Number"
                name="phone"
                onChange={(ev) => setPhoneNumber(ev.target.value)}
                placeholder="(512) 555-0100"
                type="tel"
                value={phoneNumber}
                withLabel={true}
              >
                <Phone
                  aria-hidden
                  color="var(--wa-color-brand)"
                  height={16}
                  slot="start"
                  style={{ marginInlineEnd: theme.spacing.sm }}
                  width={16}
                />
              </WaInput>

              <div style={consentRowStyle}>
                <input
                  aria-labelledby="contact-small-consent-desc"
                  checked={consentToContact}
                  id="contact-small-consent"
                  onChange={(ev) => setConsentToContact(ev.target.checked)}
                  required
                  style={checkboxStyle}
                  type="checkbox"
                />
                <p id="contact-small-consent-desc">
                  I agree to be contacted about my inquiry by email, phone, or
                  SMS. I have read the{" "}
                  <TransitionLink style={consentLinkStyle} to="/privacy">
                    Privacy Policy
                  </TransitionLink>{" "}
                  and{" "}
                  <TransitionLink style={consentLinkStyle} to="/terms">
                    Terms of Service
                  </TransitionLink>
                  .
                </p>
              </div>

              <AnimatePresence>
                {errorMessage ? (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    initial={{ opacity: 0, x: -10 }}
                    role="alert"
                    style={{
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                      padding: theme.spacing.lg,
                      borderInlineStart: `4px solid ${theme.colors.danger}`,
                      backgroundColor: `color-mix(in srgb, ${theme.colors.danger} 10%, transparent)`,
                      color: theme.colors.danger,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {errorMessage}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                className="send-btn"
                disabled={submitStatus === "sending"}
                style={{
                  backgroundColor: theme.colors.everglade,
                  color: theme.colors.white,
                  width: "100%",
                  padding: theme.spacing.xxl,
                  fontFamily: theme.fonts.headline,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  borderRadius: theme.radius.large,
                  letterSpacing: "0.1em",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: theme.spacing.lg,
                  border: "none",
                  cursor: submitStatus === "sending" ? "wait" : "pointer",
                  transition: "all 0.3s",
                  opacity: submitStatus === "sending" ? 0.75 : 1,
                }}
                type="submit"
              >
                <span>
                  {submitStatus === "sending" ? "Sending…" : submitLabel}
                </span>
                <Send
                  className="send-icon"
                  height={18}
                  style={{ transition: "transform 0.3s" }}
                  width={18}
                />
              </button>
            </form>
          )}
        </motion.div>
      </div>
      <Shader style={shaderStyle}>
        {/* Explicit ids: React useId() fallback yields `__` GLSL names that fail on Safari. */}
        <LinearGradient
          colorA="#6c66de"
          colorB="#298f07"
          colorSpace="oklab"
          end={{
            x: 0.92,

            y: 0.81,
          }}
          id="contactGradient"
          start={{
            x: 0.18,

            y: 0.23,
          }}
        />

        <WaveDistortion
          angle={81}
          frequency={0.9}
          id="contactWave"
          speed={0.7}
          strength={0.75}
          transform={{ scale: 1.84 }}
        />

        <Dither
          blendMode="colorDodge"
          colorMode="source"
          id="contactDither"
          pattern="bayer8"
        />
      </Shader>
    </section>
  );
};
