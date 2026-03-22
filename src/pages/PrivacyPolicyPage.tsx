import { LegalLayout, legalSection } from "./LegalLayout";

export const PrivacyPolicyPage = () => (
  <LegalLayout title="Privacy Policy">
    {[
      legalSection("intro", "Overview", [
        "Tandra Peters (“we,” “us”) respects your privacy. This policy describes how we collect, use, and share information when you visit this website or submit the contact form.",
        "By using the site, you agree to this policy. If you do not agree, please do not use the site or submit personal information through it.",
      ]),
      legalSection("collect", "Information we collect", [
        "Contact form: name, email address, service interest, optional property address, and your message.",
        "Technical data: IP address, browser type, device type, and similar data sent automatically by your browser (often through hosting or analytics tools).",
        "Cookies and similar technologies: see our Cookie Policy for details.",
      ]),
      legalSection("use", "How we use information", [
        "To respond to inquiries and schedule consultations.",
        "To operate, secure, and improve the website.",
        "To comply with law or protect rights, safety, and integrity where required.",
      ]),
      legalSection("share", "Sharing", [
        "We may share information with service providers that help us run the site, host data, or manage customer relationships (for example, CRM or email tools), subject to appropriate safeguards.",
        "We may disclose information if required by law or in connection with a legal process, or to protect users and the public.",
        "We do not sell your personal information as a product.",
      ]),
      legalSection("retention", "Retention", [
        "We retain contact submissions and related records for as long as needed to respond, follow up, and meet legal or business requirements, then delete or anonymize where appropriate.",
      ]),
      legalSection("rights", "Your choices", [
        "You may request access, correction, or deletion of personal information we hold, where applicable law provides those rights. Contact us using the details on the Contact section of the site.",
        "You can control cookies through your browser settings; some site features may not work if you disable essential cookies.",
      ]),
      legalSection("security", "Security", [
        "We use reasonable measures to protect information. No method of transmission over the Internet is completely secure.",
      ]),
      legalSection("children", "Children", [
        "This site is not directed to children under 13, and we do not knowingly collect their personal information.",
      ]),
      legalSection("changes", "Changes", [
        "We may update this policy from time to time. The “Last updated” date below will change when we do.",
      ]),
      legalSection("contact", "Contact", [
        "Questions about privacy: use the contact form on this site or the email shown in the Contact section.",
      ]),
    ]}
    <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#666" }}>
      Last updated: March 21, 2026
    </p>
  </LegalLayout>
);
