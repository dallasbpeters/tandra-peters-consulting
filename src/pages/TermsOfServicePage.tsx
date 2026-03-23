import { LegalLayout } from "./LegalLayout";
import { legalSection } from "./legalSection";
import { theme } from "../theme";

export const TermsOfServicePage = () => (
  <LegalLayout title="Terms of Service">
    {[
      legalSection("agreement", "Agreement", [
        "These Terms of Service (“Terms”) govern your use of this website operated by Tandra Peters. By accessing or using the site, you agree to these Terms.",
      ]),
      legalSection("services", "Nature of the site", [
        "The site provides general information about roofing consultation services. Nothing on the site is a binding offer, guarantee of results, or substitute for a written agreement between you and the appropriate parties.",
      ]),
      legalSection("contact-consent", "Contacting you", [
        "If you submit the contact form and indicate consent to be contacted, you agree that we may use the information you provide to respond by email, phone, SMS, or other reasonable means.",
        "You may withdraw consent or ask us to stop contacting you by replying to a message or using the contact details on the site.",
      ]),
      legalSection("conduct", "Acceptable use", [
        "You agree not to misuse the site, attempt unauthorized access, transmit malware, scrape the site in a way that harms performance, or use the site for unlawful purposes.",
      ]),
      legalSection("ip", "Intellectual property", [
        "Content on this site (text, graphics, logos, and layout) is owned by Tandra Peters or licensors and is protected by applicable laws. You may not copy or reuse it without permission except as allowed by law.",
      ]),
      legalSection("disclaimer", "Disclaimer", [
        "The site and its content are provided “as is” without warranties of any kind, to the fullest extent permitted by law.",
      ]),
      legalSection("limitation", "Limitation of liability", [
        "To the fullest extent permitted by law, Tandra Peters is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the site.",
      ]),
      legalSection("indemnity", "Indemnity", [
        "You agree to indemnify and hold harmless Tandra Peters from claims arising from your misuse of the site or violation of these Terms, where permitted by law.",
      ]),
      legalSection("law", "Governing law", [
        "These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law rules, except where preempted by applicable law.",
      ]),
      legalSection("changes-tos", "Changes", [
        "We may update these Terms. Continued use after changes constitutes acceptance of the updated Terms.",
      ]),
    ]}
    <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: theme.colors.legalMuted }}>
      Last updated: March 21, 2026
    </p>
  </LegalLayout>
);
