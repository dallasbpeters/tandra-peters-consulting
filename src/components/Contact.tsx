import React, { useState } from "react";
import { TransitionLink } from "./TransitionLink";
import { motion } from "motion/react";
import { Mail, MapPin, Phone, Send } from "iconoir-react";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import { CONTACT_SERVICE_OPTIONS } from "../../contactServiceOptions";
import { ContactProps } from "../types";
import { usePostHog } from "@posthog/react";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import "@awesome.me/webawesome/dist/styles/webawesome.css";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import WaCheckbox from "@awesome.me/webawesome/dist/react/checkbox/index.js";
import { AnimatePresence } from "motion/react";

/** Relative path so production stays same-origin; Vite can proxy `/api` in dev (see vite.config). */
export const CONTACT_API_PATH = "/api/contact";

export const Contact = ({
  tagline = "Contact the consultant",
  title = "Request a free roofing consultation in Austin or statewide.",
  email = "tandra@birdcreekroofing.com",
  phone = "(512) 968-3965",
  location = "Austin, Texas",
  serviceOptions = CONTACT_SERVICE_OPTIONS,
  formLabels,
}: ContactProps) => {
  const [fullName, setFullName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
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
          serviceInterest,
          message,
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
        service_interest: serviceInterest,
        has_message: Boolean(message),
        has_phone: Boolean(phoneNumber.trim()),
      });
      setSubmitStatus("success");
      setFullName("");
      setVisitorEmail("");
      setServiceInterest("");
      setPhoneNumber("");
      setMessage("");
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
    backgroundColor: theme.colors.paper,
  };

  const infoItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  };

  const iconWrapperStyle: React.CSSProperties = {
    minWidth: "3rem",
    height: "3rem",
    backgroundColor: theme.colors.purple,
    color: theme.colors.black,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: 0.8,
    letterSpacing: "0.1em",
    color: mix(theme.colors.everglade, 40),
    marginBottom: "0.25rem",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  };

  const formCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.white,
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const serviceLabel = formLabels?.service ?? "Service interest";

  const consentLinkStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  const consentRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    width: "100%",
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
    <section
      id="contact"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="contact-heading"
    >
      <div className={`${layoutClass.containerWideContact} lg-grid-12`}>
        <style>{`
          @media (min-width: 1024px) {
            .lg-grid-12 { grid-template-columns: repeat(12, 1fr) !important; }
            .lg-col-6 { grid-column: span 6 / span 6 !important; }
            .md-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
          }
          .contact-group:has( a ):hover .icon-wrapper { background-color: ${theme.palette.blue[300]} !important; }
          .contact-group:hover a { text-decoration: underline !important; }
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
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg-col-6"
        >
          <span
            style={{
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: theme.colors.accent,
              textTransform: "uppercase",
              fontSize: "0.75rem",
              marginBottom: "1.5rem",
              display: "block",
            }}
          >
            {tagline}
          </span>
          <h2
            id="contact-heading"
            style={{
              fontSize: "clamp(2rem, 10vw, 4rem)",
              lineHeight: 1,
              marginBottom: "3rem",
              fontFamily: theme.fonts.special,
              fontWeight: 400,
            }}
          >
            {title}
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <Mail style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Email</p>
                <a href={`mailto:${email}`} style={valueStyle}>
                  {email}
                </a>
              </div>
            </div>
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <Phone style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Phone</p>
                <a href="sms:15129683965" style={valueStyle}>
                  {phone}
                </a>
              </div>
            </div>
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <MapPin style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Location</p>
                <p style={valueStyle}>{location}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={formCardStyle}
          className="lg-col-6"
        >


          {submitStatus === "success"  ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.5,
                color:
                  theme.colors.everglade,
              }}
            >
              Thanks — your message was sent. We’ll be in touch soon.
            </div>
          ) : (
            <form
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
              onSubmit={handleSubmit}
              onKeyDown={(e) => e.stopPropagation()}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "2rem",
                }}
                className="md-grid-2"
              >
                <WaInput
                  label="Full Name"
                  id="contact-full-name"
                  name="full-name"
                  type="text"
                  className="contact-form-field"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  required
                  autocomplete="name"
                />

                <WaInput
                  label="Email Address"
                  id="contact-email"
                  name="email"
                  type="email"
                  className="contact-form-field"
                  placeholder="john@example.com"
                  value={visitorEmail}
                  onChange={(ev) => setVisitorEmail(ev.target.value)}
                  required
                  autocomplete="email"
                >
                  <Mail
                    slot="start"
                    style={{ marginInlineEnd: "0.5rem" }}
                    color="var(--wa-color-brand)"
                    height={16}
                    width={16}
                    name="email"
                  />
                </WaInput>
              </div>
              <WaInput
                id="contact-phone"
                name="phone"
                label="Phone Number"
                type="tel"
                className="contact-form-field"
                placeholder="(512) 555-0100"
                value={phoneNumber}
                onChange={(ev) => setPhoneNumber(ev.target.value)}
                autocomplete="tel"
                withLabel={true}
              >
                <Phone
                  slot="start"
                  style={{ marginInlineEnd: "0.5rem" }}
                  color="var(--wa-color-brand)"
                  height={16}
                  width={16}
                  name="phone"
                ></Phone>
              </WaInput>
              <WaSelect
                name="service-interest"
                label={serviceLabel}
                value={serviceInterest}
                appearance="outlined"
                placeholder="Select a service..."
                size="m"
                withClear
                onChange={(e) =>
                  setServiceInterest(
                    (e.target as unknown as { value: string }).value,
                  )
                }
              >
                {serviceOptions.map((opt) => (
                  <WaOption key={opt.value} value={opt.value} id={opt.value}>
                    {opt.label}
                  </WaOption>
                ))}
              </WaSelect>

              <WaTextarea
                aria-label="Your Message"
                label="Your Message"
                id="contact-message"
                name="message"
                rows={4}
                className="contact-form-field"
                style={{ resize: "none", minHeight: "6rem" }}
                placeholder="Tell us about your roofing needs..."
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                required
                maxlength={8000}
              />
              <div style={consentRowStyle}>
                <WaCheckbox
                  id="contact-consent"
                  checked={consentToContact}
                  onChange={(ev) => setConsentToContact(ev.target.checked)}
                  style={checkboxStyle}
                  aria-required
                  aria-describedby="contact-consent-desc"
                  defaultValue="I agree to be contacted about my inquiry by email, phone, or SMS. I have read the Privacy Policy and Terms of Service."
                />
                <p>
                  I agree to be contacted about my inquiry by email, phone, or
                  SMS. I have read the{" "}
                  <TransitionLink to="/privacy" style={consentLinkStyle}>
                    Privacy Policy
                  </TransitionLink>{" "}
                  and{" "}
                  <TransitionLink to="/terms" style={consentLinkStyle}>
                    Terms of Service
                  </TransitionLink>
                  .
                </p>
              </div>
              <AnimatePresence>
              {errorMessage ? (
                <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  padding: "1rem",
                  borderInlineStart: `4px solid ${theme.colors.danger}`,
                  backgroundColor: `color-mix(in srgb, ${theme.colors.danger} 10%, transparent)`,
                  color: theme.colors.danger }}>{errorMessage}</motion.div>
              ) : null}
              </AnimatePresence>
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
                <span>
                  {submitStatus === "sending" ? "Sending…" : "Send Message"}
                </span>
                <Send
                  width={18}
                  height={18}
                  className="send-icon"
                  style={{ transition: "transform 0.3s" }}
                />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};
