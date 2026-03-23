import React, { useState } from "react";
import { TransitionLink } from "./TransitionLink";
import { motion } from "motion/react";
import {
  NavArrowDown,
  Send,
} from "iconoir-react";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import { CONTACT_SERVICE_OPTIONS } from "../../contactServiceOptions";
import { ContactProps } from "../types";
import { usePostHog } from "@posthog/react";

/** Relative path so production stays same-origin; Vite can proxy `/api` in dev (see vite.config). */
const CONTACT_API_PATH = "/api/contact";

/** Compact form has no service picker; API requires `serviceInterest` + `message`. */
const COMPACT_DEFAULT_SERVICE = "shingle-roofing";
const COMPACT_DEFAULT_MESSAGE =
  "Please contact me using the email and phone provided.";

export const ContactSmall = ({
  title = "Get a free roofing consultation.",
  serviceOptions = CONTACT_SERVICE_OPTIONS,
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
        "Please confirm you agree to be contacted before sending your message.",
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
      if (!res.ok || !data.ok) {
        setSubmitStatus("error");
        const fromApi =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        const byStatus = (() => {
          if (fromApi) return "";
          if (res.status === 404) {
            return "Contact form endpoint was not found. On local dev, set VITE_CONTACT_API_URL in .env.local to your live site (Vite will proxy /api) or run `vercel dev`.";
          }
          if (res.status === 403) {
            return "This site is not allowed to submit the form (ALLOWED_ORIGINS). Add your exact URL, including https:// and www if used.";
          }
          if (res.status === 503) {
            return "Server is missing ATTIO_API_TOKEN. Add it in Vercel → Project → Environment Variables.";
          }
          if (res.status === 502) {
            return "Could not save your message (CRM error). Try again later or contact us by phone or email.";
          }
          if (res.ok && !data.ok) {
            return "The server returned an unexpected response. Check that /api/contact is not rewritten to the SPA.";
          }
          if (
            !fromApi &&
            rawText &&
            !rawText.trim().startsWith("{") &&
            (res.status >= 500 || vercelFnError || contentType.includes("text/html"))
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
        phone_number: phoneNumber,
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
        "Network or CORS error. Use the same URL as your deployed site, or run `vercel dev`. For `pnpm dev`, set VITE_CONTACT_API_URL in .env.local so Vite can proxy /api/contact to production.",
      );
    }
  };
  const sectionStyle: React.CSSProperties = {
    paddingTop: "2rem",
    paddingBottom: "2rem",
    backgroundColor: theme.colors.evergladeLight,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.1em",
    color: mix(theme.colors.everglade, 40),
    marginBottom: "0.25rem",
  };

  const formCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.white,
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const underlineBorder = `1px solid ${mix(theme.colors.everglade, 20)}`;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: underlineBorder,
    borderRadius: 0,
    padding: "0.75rem 0",
    fontSize: "1rem",
    color: theme.colors.everglade,
    transition: "border-color 0.2s ease",
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
    marginBottom: "1rem",
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 600,
  };

  const consentRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    color: theme.colors.everglade,
  };

  const checkboxStyle: React.CSSProperties = {
    marginTop: "0.2rem",
    width: "1.125rem",
    height: "1.125rem",
    flexShrink: 0,
    accentColor: theme.colors.everglade,
    cursor: "pointer",
  };

  return (
    <section id="contact" style={sectionStyle} aria-labelledby="contact-heading">
      <div className={`${layoutClass.containerContactCompact} lg-grid-12`}>
        <style>{`
          @media (min-width: 1024px) {
            .lg-grid-12 { grid-template-columns: repeat(1, 1fr) !important; }
            .md-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
          }
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
          .send-btn:hover .send-icon { transform: translate(8px, 0px) !important; }
        `}</style>
       

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={formCardStyle}
          className="lg-col-12"
        >
           <motion.div 
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg-col-12"
        >
          <h2 id="contact-heading" style={headingStyle}>{title}</h2>
        </motion.div>
          <form
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            onSubmit={handleSubmit}
            noValidate
          >
            <input
              type="text"
              name="_hp"
              value={honeypot}
              onChange={(ev) => setHoneypot(ev.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
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
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }} className="md-grid-3">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="contact-full-name" style={labelStyle}>
                  Full Name
                </label>
                <input
                  id="contact-full-name"
                  type="text"
                  className="contact-form-field"
                  style={inputStyle}
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  required
                  maxLength={200}
                  autoComplete="name"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="contact-email" style={labelStyle}>
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="contact-form-field"
                  style={inputStyle}
                  placeholder="john@example.com"
                  value={visitorEmail}
                  onChange={(ev) => setVisitorEmail(ev.target.value)}
                  required
                  maxLength={320}
                  autoComplete="email"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="contact-phone" style={labelStyle}>
                  Phone Number
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className="contact-form-field"
                  style={inputStyle}
                  placeholder="123-456-7890"
                  value={phoneNumber}
                  onChange={(ev) => setPhoneNumber(ev.target.value)}
                  required
                  maxLength={320}
                  autoComplete="tel"
                />
              </div>
            </div>
            <div style={consentRowStyle}>
              <input
                id="contact-consent"
                type="checkbox"
                checked={consentToContact}
                onChange={(ev) => setConsentToContact(ev.target.checked)}
                style={checkboxStyle}
                aria-required
                aria-describedby="contact-consent-desc"
              />
              <label
                htmlFor="contact-consent"
                id="contact-consent-desc"
                style={{
                  cursor: "pointer",
                  fontFamily: theme.fonts.body,
                  fontWeight: 500,
                }}
              >
                I agree to be contacted about my inquiry by email, phone, or SMS.
                I have read the{" "}
                <TransitionLink to="/privacy" style={consentLinkStyle}>
                  Privacy Policy
                </TransitionLink>{" "}
                and{" "}
                <TransitionLink to="/terms" style={consentLinkStyle}>
                  Terms of Service
                </TransitionLink>
                .
              </label>
            </div>
            {submitStatus === "success" ||
            (submitStatus === "error" && errorMessage) ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  color:
                    submitStatus === "error"
                      ? theme.colors.danger
                      : theme.colors.everglade,
                }}
              >
                {submitStatus === "success"
                  ? "Thanks — your message was sent. We’ll be in touch soon."
                  : errorMessage}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={submitStatus === "sending"}
              style={{
                backgroundColor: theme.colors.everglade,
                color: theme.colors.white,
                width: "100%",
                padding: "1.5rem",
                fontFamily: theme.fonts.headline,
                fontWeight: 900,
                textTransform: "uppercase",
                borderRadius: "1rem",
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                border: "none",
                cursor: submitStatus === "sending" ? "wait" : "pointer",
                transition: "all 0.3s",
                opacity: submitStatus === "sending" ? 0.75 : 1,
              }}
              className="send-btn"
            >
              <span>{submitStatus === "sending" ? "Sending…" : "Send"}</span>
              <Send
                width={18}
                height={18}
                className="send-icon"
                style={{ transition: "transform 0.3s" }}
              />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};
