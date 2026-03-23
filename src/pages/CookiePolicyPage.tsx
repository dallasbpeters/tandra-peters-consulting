import type { CSSProperties } from "react";
import { TransitionLink } from "../components/TransitionLink";
import { LegalLayout } from "./LegalLayout";
import { legalSection } from "./legalSection";
import { theme } from "../theme";

const linkStyle: CSSProperties = {
  color: theme.colors.everglade,
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export const CookiePolicyPage = () => (
  <LegalLayout title="Cookie Policy">
    {[
      legalSection("what", "What are cookies?", [
        "Cookies are small text files stored on your device when you visit a website. They help the site remember preferences, measure usage, or support embedded features.",
      ]),
      legalSection("how-we-use", "How we use cookies", [
        "Essential cookies: required for basic site operation and security.",
        "Preference cookies: remember choices you make (where applicable).",
        "Analytics or performance cookies: help us understand how visitors use the site (if enabled).",
        "Third-party cookies: some embedded content (such as social or review widgets) may set their own cookies governed by those providers’ policies.",
      ]),
      legalSection("manage", "Managing cookies", [
        "You can block or delete cookies through your browser settings. Blocking all cookies may affect how the site works.",
      ]),
    ]}
    <p style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
      For how we handle personal data, see our{" "}
      <TransitionLink to="/privacy" style={linkStyle}>
        Privacy Policy
      </TransitionLink>
      .
    </p>
    {legalSection("contact-cookie", "Contact", [
      "Questions about this policy: use the contact form or email on the Contact section of the site.",
    ])}
    <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: theme.colors.legalMuted }}>
      Last updated: March 21, 2026
    </p>
  </LegalLayout>
);
