import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { theme } from "../theme";
import { ContactProps } from "../types";

const contactApiUrl = (): string => {
  const base = import.meta.env.VITE_CONTACT_API_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/api/contact` : "/api/contact";
};

export const Contact = ({
  tagline = "Get in Touch",
  title = "Start Your Consultation.",
  email = "tandrapeters@birdcreekroofing.com",
  phone = "(512) 968-3965",
  location = "Austin, Texas",
}: ContactProps) => {
  const [fullName, setFullName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitStatus === "sending") {
      return;
    }
    setSubmitStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch(contactApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: visitorEmail,
          propertyAddress,
          message,
          company: honeypot,
        }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = (contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {}) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitStatus("error");
        const fallback =
          res.ok && !data.ok
            ? "The contact endpoint returned an invalid response. Redeploy after fixing API routing, or run `vercel dev` locally."
            : "Something went wrong. Please try again.";
        setErrorMessage(
          typeof data.error === "string" && data.error
            ? data.error
            : fallback,
        );
        return;
      }
      setSubmitStatus("success");
      setFullName("");
      setVisitorEmail("");
      setPropertyAddress("");
      setMessage("");
      setHoneypot("");
    } catch {
      setSubmitStatus("error");
      setErrorMessage(
        "Network error. If you are running the site locally, use `vercel dev` or set VITE_CONTACT_API_URL to your deployed site.",
      );
    }
  };
  const sectionStyle: React.CSSProperties = {
    paddingTop: "8rem",
    paddingBottom: "8rem",
    backgroundColor: theme.colors.paperDim,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "5rem",
  };

  const infoItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  };

  const iconWrapperStyle: React.CSSProperties = {
    minWidth: "3rem",
    height: "3rem",
    backgroundColor: theme.colors.white,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.5s",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.1em",
    color: `${theme.colors.everglade}66`,
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
    padding: "3rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: theme.colors.paperDim,
    border: "none",
    borderBottom: `1px solid ${theme.colors.paperDark}33`,
    padding: "1rem",
    fontSize: "1rem",
    transition: "border-color 0.3s",
    outline: "none",
  };

  return (
    <section id="contact" style={sectionStyle}>
      <div style={containerStyle} className="lg-grid-12">
        <style>{`
          @media (min-width: 1024px) {
            .lg-grid-12 { grid-template-columns: repeat(12, 1fr) !important; }
            .lg-col-5 { grid-column: span 5 / span 5 !important; }
            .lg-col-7 { grid-column: span 7 / span 7 !important; }
            .md-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
          }
          .contact-group:hover .icon-wrapper { background-color: ${theme.colors.accentLight} !important; }
          input:focus, textarea:focus { border-bottom-color: ${theme.colors.accent} !important; }
          .send-btn:hover { background-color: ${theme.colors.everglade}ee !important; }
          .send-btn:hover .send-icon { transform: translate(8px, -8px) !important; }
        `}</style>
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg-col-5"
        >
          <span style={{ fontWeight: 700, letterSpacing: "0.2em", color: theme.colors.accent, textTransform: "uppercase", fontSize: "0.75rem", marginBottom: "1.5rem", display: "block" }}>{tagline}</span>
          <h2 style={{ fontSize: "clamp(2rem, 10vw, 4rem)", lineHeight: 1, marginBottom: "3rem", fontFamily: theme.fonts.headline, fontWeight: 700, textTransform: "uppercase" }}>{title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <Mail style={{ color: theme.colors.everglade }} />
              </div>
              <div>
                <p style={labelStyle}>Email</p>
                <p style={valueStyle}>{email}</p>
              </div>
            </div>
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <Phone style={{ color: theme.colors.everglade }} />
              </div>
              <div>
                <p style={labelStyle}>Phone</p>
                <p style={valueStyle}>{phone}</p>
              </div>
            </div>
            <div style={infoItemStyle} className="contact-group">
              <div style={iconWrapperStyle} className="icon-wrapper">
                <MapPin style={{ color: theme.colors.everglade }} />
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
          className="lg-col-7"
        >
          <form
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            onSubmit={handleSubmit}
            noValidate
          >
            <input
              type="text"
              name="company"
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }} className="md-grid-2">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="contact-full-name" style={labelStyle}>
                  Full Name
                </label>
                <input
                  id="contact-full-name"
                  type="text"
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
                  style={inputStyle}
                  placeholder="john@example.com"
                  value={visitorEmail}
                  onChange={(ev) => setVisitorEmail(ev.target.value)}
                  required
                  maxLength={320}
                  autoComplete="email"
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="contact-property" style={labelStyle}>
                Property Address
              </label>
              <input
                id="contact-property"
                type="text"
                style={inputStyle}
                placeholder="123 Austin Way"
                value={propertyAddress}
                onChange={(ev) => setPropertyAddress(ev.target.value)}
                maxLength={500}
                autoComplete="street-address"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="contact-message" style={labelStyle}>
                Your Message
              </label>
              <textarea
                id="contact-message"
                rows={4}
                style={{ ...inputStyle, resize: "none" }}
                placeholder="Tell us about your roofing needs..."
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                required
                maxLength={8000}
              />
            </div>
            <div
              role="status"
              aria-live="polite"
              style={{
                minHeight: "1.25rem",
                fontSize: "0.875rem",
                color:
                  submitStatus === "error"
                    ? "#b91c1c"
                    : submitStatus === "success"
                      ? theme.colors.everglade
                      : `${theme.colors.everglade}99`,
              }}
            >
              {submitStatus === "success"
                ? "Thanks — your message was sent. We’ll be in touch soon."
                : null}
              {submitStatus === "error" ? errorMessage : null}
            </div>
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
              <span>{submitStatus === "sending" ? "Sending…" : "Send Message"}</span>
              <Send size={18} className="send-icon" style={{ transition: "transform 0.3s" }} />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};
