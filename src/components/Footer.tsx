import React from "react";
import { Facebook, Instagram, Linkedin } from "iconoir-react";
import { theme } from "../theme";
import { FooterProps } from "../types";

export const Footer: React.FC<FooterProps> = ({
  logoText = "Tandra Peters",
  description = "Professional roofing consultation with architectural precision and the backing of Austin's premier BirdCreek Roofing.",
  socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/tandra/" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/tandra-peters-b8b38026/" },
    { icon: Facebook, href: "https://www.facebook.com/tandra.peters.3" }
  ],
  quickLinks = [
    { label: "Services", href: "#services" },
    { label: "About Tandra", href: "#about-tandra" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Contact", href: "#contact" }
  ],
  legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" }
  ],
  copyrightText = "© 2026 Tandra Peters. All Rights Reserved.",
  partnerText = "Partnered with BirdCreek Roofing"
}) => {
  const footerStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
    paddingTop: "5rem",
    paddingBottom: "5rem",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "4rem",
  };

  const socialLinkStyle: React.CSSProperties = {
    width: "2.5rem",
    height: "2.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.colors.white,
    transition: "all 0.3s",
    textDecoration: "none",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
     
    fontSize: "10px",
    letterSpacing: "0.3em",
    color: theme.colors.evergladeMuted,
    marginBottom: "2rem",
  };

  const linkListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    fontSize: "0.875rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
     
    letterSpacing: "0.1em",
    opacity: 0.6,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.white,
    textDecoration: "none",
    transition: "color 0.2s",
  };

  const bottomBarStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    marginTop: "5rem",
    paddingTop: "2.5rem",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1.5rem",
    fontSize: "12px",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: theme.colors.evergladeMuted,
    opacity: 0.4,
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle} className="md-grid-12">
        <style>{`
          @media (min-width: 768px) {
            .md-grid-12 { grid-template-columns: repeat(6, 1fr) !important; }
            .md-col-4 { grid-column: span 2 / span 2 !important; }
            .md-col-2 { grid-column: span 2 / span 2 !important; }
            .md-row { flex-direction: row !important; }
          }
          .social-link:hover { background-color: ${theme.colors.accentLight} !important; color: ${theme.colors.everglade} !important; }
          .footer-link:hover { color: ${theme.colors.accentLight} !important; }
          .newsletter-input:focus { border-color: ${theme.colors.accentLight} !important; outline: none; }
          .newsletter-btn:hover { filter: brightness(1.1); }
        `}</style>
        <div className="md-col-4">
          <div style={{ fontSize: "1.875rem", fontWeight: 900, letterSpacing: "-0.05em",   fontFamily: theme.fonts.headline, marginBottom: "2rem" }}>{logoText}</div>
          <p style={{ color: theme.colors.evergladeMuted, fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "20rem", marginBottom: "2.5rem", opacity: 0.6 }}>
            {description}
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {socialLinks.map((social, i) => (
              <a key={i} href={social.href} style={socialLinkStyle} className="social-link">
                <social.icon width={18} height={18} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
        
        <div className="md-col-2">
          <h4 style={headingStyle}>Quick Links</h4>
          <ul style={linkListStyle}>
            {quickLinks.map((link, i) => (
              <li key={i}><a href={link.href} style={linkStyle} className="footer-link">{link.label}</a></li>
            ))}
          </ul>
        </div>

        <div className="md-col-2">
          <h4 style={headingStyle}>Legal</h4>
          <ul style={linkListStyle}>
            {legalLinks.map((link, i) => (
              <li key={i}><a href={link.href} style={linkStyle} className="footer-link">{link.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div style={bottomBarStyle} className="md-row">
        <p>{copyrightText}</p>
        <p>{partnerText}</p>
      </div>
    </footer>
  );
};
