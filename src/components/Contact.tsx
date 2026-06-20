import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import { AddressAutofill } from "@mapbox/search-js-react";
import { usePostHog } from "@posthog/react";
import { stegaClean } from "@sanity/client/stega";
import { Mail, MapPin, Phone, Send } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import type React from "react";
import { useState } from "react";

import { CONTACT_SERVICE_OPTIONS } from "../../contactServiceOptions";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import type { ContactProps } from "../types";
import { TransitionLink } from "./TransitionLink";

/** Relative path so production stays same-origin; Vite can proxy `/api` in dev (see vite.config). */
export const CONTACT_API_PATH = "/api/contact";

const isInvisibleTextCodePoint = (codePoint: number): boolean =>
  codePoint === 0x03_4f ||
  codePoint === 0x06_1c ||
  codePoint === 0x11_5f ||
  codePoint === 0x11_60 ||
  codePoint === 0x17_b4 ||
  codePoint === 0x17_b5 ||
  codePoint === 0x18_0e ||
  (codePoint >= 0x20_0b && codePoint <= 0x20_0f) ||
  (codePoint >= 0x20_2a && codePoint <= 0x20_2e) ||
  (codePoint >= 0x20_60 && codePoint <= 0x20_6f) ||
  codePoint === 0x31_64 ||
  codePoint === 0xfe_ff ||
  codePoint === 0xff_a0;

const stripInvisibleText = (value: string): string =>
  Array.from(value)
    .filter((char) => !isInvisibleTextCodePoint(char.codePointAt(0) ?? 0))
    .join("");

const cleanPlainText = (value: string): string => {
  try {
    const cleaned = stegaClean(value);
    if (typeof cleaned === "string") {
      return stripInvisibleText(cleaned).trim();
    }
  } catch {
    // Fall back to a plain invisible-character strip if Sanity metadata is malformed.
  }
  return stripInvisibleText(value).trim();
};

const phoneHrefFor = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "#contact";
  }
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `tel:+${normalized}`;
};

const eventStringValue = (event: React.SyntheticEvent): string => {
  const value = (event.target as { value?: string | null }).value;
  return value ?? "";
};

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
  const [propertyAddress, setPropertyAddress] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [consentToContact, setConsentToContact] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
  const cleanedTagline = cleanPlainText(tagline);
  const cleanedTitle = cleanPlainText(title);
  const cleanedEmail = cleanPlainText(email);
  const cleanedPhone = cleanPlainText(phone);
  const cleanedLocation = cleanPlainText(location);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
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
          propertyAddress,
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
      if (!(res.ok && data.ok)) {
        setSubmitStatus("error");
        const fromApi =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
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
        service_interest: serviceInterest,
        has_message: Boolean(message),
        has_phone: Boolean(phoneNumber.trim()),
      });
      trackGaContactForm({
        form_variant: "full",
        service_interest: serviceInterest || "unknown",
        has_message: Boolean(message),
        has_phone: Boolean(phoneNumber.trim()),
      });
      setSubmitStatus("success");
      setFullName("");
      setVisitorEmail("");
      setServiceInterest("");
      setPhoneNumber("");
      setPropertyAddress("");
      setMessage("");
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
    backgroundColor: theme.colors.paper,
  };

  const infoItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.lg,
  };

  const iconWrapperStyle: React.CSSProperties = {
    minWidth: "3rem",
    height: "3rem",
    backgroundColor: theme.colors.purple,
    color: theme.colors.black,
    borderRadius: theme.radius.pill,
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
    marginBottom: theme.spacing.xs,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  };

  const formCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.xxxxl,
    borderRadius: theme.radius.large,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const nameLabel = formLabels?.name ?? "Full Name";
  const emailLabel = formLabels?.email ?? "Email Address";
  const serviceLabel = formLabels?.service ?? "Service interest";
  const propertyLabel = formLabels?.property ?? "Property Address";
  const messageLabel = formLabels?.message ?? "Your Message";
  const submitLabel = formLabels?.button ?? "Send Message";

  /** Native input styled to match the WebAwesome fields (Mapbox needs a real input, not a custom element). */
  const addressLabelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-label-font-size, 1rem)",
    color: theme.colors.everglade,
    marginBottom: "0.5rem",
  };

  const addressInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-value-font-size, 1rem)",
    color: theme.colors.everglade,
    backgroundColor: "var(--wa-form-control-background-color, #fff)",
    border:
      "var(--wa-form-control-border-width, 1px) var(--wa-form-control-border-style, solid) var(--wa-form-control-border-color)",
    borderRadius: "var(--wa-border-radius-m, 0.5rem)",
    height: "var(--wa-form-control-height, 2.625rem)",
    padding: "0 var(--wa-form-control-padding-inline, 1rem)",
    outline: "none",
  };

  const consentLinkStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  const consentRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    width: "100%",
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

  return (
    <section
      aria-labelledby="contact-heading"
      className={`${layoutClass.sectionPadded} contact-section`}
      id="contact"
      style={sectionStyle}
    >
      <div className={`${layoutClass.containerWideContact} lg-grid-12`}>
        <style>{`
          @media (min-width: 1024px) {
            .lg-grid-12 { grid-template-columns: repeat(12, 1fr) !important; }
            .lg-col-6 { grid-column: span 6 / span 6 !important; }
            .md-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
          }
          .contact-section {
            padding-block-end: calc(var(--theme-spacing-section-wide) + 5.5rem + env(safe-area-inset-bottom));
          }
          .contact-heading {
            font-size: 3.75rem;
          }
          @media (min-width: 768px) {
            .contact-section {
              padding-block-end: var(--theme-spacing-section-wide);
            }
          }
          @media (max-width: 767px) {
            .contact-heading {
              font-size: 2.75rem;
            }
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
          mapbox-address-autofill { display: block; width: 100%; }
          .contact-address-input::placeholder { color: ${mix(theme.colors.everglade, 33)}; }
          .contact-address-input:focus {
            border-color: var(--wa-form-control-activated-color, ${theme.colors.accent}) !important;
          }
          .contact-address-input:focus-visible {
            outline: 2px solid ${theme.colors.accent};
            outline-offset: 2px;
          }
        `}</style>
        <motion.div
          className="lg-col-6"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          <span
            style={{
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: theme.colors.accent,
              textTransform: "uppercase",
              fontSize: "0.75rem",
              marginBottom: theme.spacing.xxl,
              display: "block",
            }}
          >
            {cleanedTagline}
          </span>
          <h2
            className="contact-heading"
            id="contact-heading"
            style={{
              lineHeight: 1,
              marginBottom: theme.spacing.xxxxxxxxl,
              fontFamily: theme.fonts.headline,
              fontWeight: 900,
            }}
          >
            {cleanedTitle}
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.lg,
            }}
          >
            <div className="contact-group" style={infoItemStyle}>
              <div className="icon-wrapper" style={iconWrapperStyle}>
                <Mail style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Email</p>
                <a href={`mailto:${cleanedEmail}`} style={valueStyle}>
                  {cleanedEmail}
                </a>
              </div>
            </div>
            <div className="contact-group" style={infoItemStyle}>
              <div className="icon-wrapper" style={iconWrapperStyle}>
                <Phone style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Phone</p>
                <a href={phoneHrefFor(cleanedPhone)} style={valueStyle}>
                  {cleanedPhone}
                </a>
              </div>
            </div>
            <div className="contact-group" style={infoItemStyle}>
              <div className="icon-wrapper" style={iconWrapperStyle}>
                <MapPin style={{ color: "inherit" }} />
              </div>
              <div>
                <p style={labelStyle}>Location</p>
                <p style={valueStyle}>{cleanedLocation}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="lg-col-6"
          initial={{ opacity: 0 }}
          style={formCardStyle}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
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
                gap: theme.spacing.xxxxl,
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
              <div
                className="md-grid-2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: theme.spacing.xxxxl,
                }}
              >
                <WaInput
                  autocomplete="name"
                  className="contact-form-field"
                  id="contact-full-name"
                  label={nameLabel}
                  name="full-name"
                  onChange={(ev) => setFullName(eventStringValue(ev))}
                  placeholder="John Doe"
                  required
                  type="text"
                  value={fullName}
                />

                <WaInput
                  autocomplete="email"
                  className="contact-form-field"
                  id="contact-email"
                  label={emailLabel}
                  name="email"
                  onChange={(ev) => setVisitorEmail(eventStringValue(ev))}
                  placeholder="john@example.com"
                  required
                  type="email"
                  value={visitorEmail}
                >
                  <Mail
                    color="var(--wa-color-brand)"
                    height={16}
                    name="email"
                    slot="start"
                    style={{ marginInlineEnd: theme.spacing.sm }}
                    width={16}
                  />
                </WaInput>
              </div>
              <WaInput
                autocomplete="tel"
                className="contact-form-field"
                id="contact-phone"
                label="Phone Number"
                name="phone"
                onChange={(ev) => setPhoneNumber(eventStringValue(ev))}
                placeholder="(512) 555-0100"
                type="tel"
                value={phoneNumber}
                withLabel={true}
              >
                <Phone
                  color="var(--wa-color-brand)"
                  height={16}
                  name="phone"
                  slot="start"
                  style={{ marginInlineEnd: theme.spacing.sm }}
                  width={16}
                />
              </WaInput>
              <div>
                <label
                  htmlFor="contact-property-address"
                  style={addressLabelStyle}
                >
                  {propertyLabel}{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: mix(theme.colors.everglade, 45),
                    }}
                  >
                    (optional)
                  </span>
                </label>
                {mapboxToken ? (
                  <AddressAutofill
                    accessToken={mapboxToken}
                    onRetrieve={(res) => {
                      const props = res?.features?.[0]?.properties as
                        | { full_address?: string; place_name?: string }
                        | undefined;
                      const full = props?.full_address || props?.place_name;
                      if (full) {
                        setPropertyAddress(full);
                      }
                    }}
                    options={{ country: "US", language: "en" }}
                  >
                    <input
                      autoComplete="address-line1"
                      className="contact-address-input"
                      id="contact-property-address"
                      maxLength={500}
                      name="property-address"
                      onChange={(ev) => setPropertyAddress(ev.target.value)}
                      placeholder="123 Main St, Austin, TX"
                      style={addressInputStyle}
                      type="text"
                      value={propertyAddress}
                    />
                  </AddressAutofill>
                ) : (
                  <input
                    autoComplete="street-address"
                    className="contact-address-input"
                    id="contact-property-address"
                    maxLength={500}
                    name="property-address"
                    onChange={(ev) => setPropertyAddress(ev.target.value)}
                    placeholder="123 Main St, Austin, TX"
                    style={addressInputStyle}
                    type="text"
                    value={propertyAddress}
                  />
                )}
              </div>
              <WaSelect
                appearance="outlined"
                label={serviceLabel}
                name="service-interest"
                onChange={(e) => setServiceInterest(eventStringValue(e))}
                placeholder="Select a service..."
                size="m"
                value={serviceInterest}
                withClear
              >
                {serviceOptions.map((opt) => (
                  <WaOption id={opt.value} key={opt.value} value={opt.value}>
                    {opt.label}
                  </WaOption>
                ))}
              </WaSelect>

              <WaTextarea
                aria-label={messageLabel}
                className="contact-form-field"
                id="contact-message"
                label={messageLabel}
                maxlength={8000}
                name="message"
                onChange={(ev) => setMessage(eventStringValue(ev))}
                placeholder="Tell us about your roofing needs..."
                required
                rows={4}
                style={{ resize: "none", minHeight: "6rem" }}
                value={message}
              />
              <div style={consentRowStyle}>
                <input
                  aria-labelledby="contact-consent-desc"
                  checked={consentToContact}
                  id="contact-consent"
                  onChange={(ev) => setConsentToContact(ev.target.checked)}
                  required
                  style={checkboxStyle}
                  type="checkbox"
                />
                <p id="contact-consent-desc">
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
    </section>
  );
};
