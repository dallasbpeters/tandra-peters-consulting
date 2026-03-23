import React from "react";
import { TransitionLink } from "./TransitionLink";
import { Facebook, Instagram, Linkedin } from "iconoir-react";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { FooterProps } from "../types";
import { RichText } from "../portableText/RichText";

export const Footer: React.FC<FooterProps> = ({
  logoText = "Tandra Peters",
  description = "Austin roofing consultant for roof assessments, insurance claim support, and end-to-end project oversight—paired with BirdCreek Roofing for trusted installation across Texas.",
  socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/tandra/" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/tandra-peters-b8b38026/" },
    { icon: Facebook, href: "https://www.facebook.com/tandra.peters.3" }
  ],
  quickLinks = [
    { name: "Services", href: "#services" },
    { name: "About Tandra", href: "#about-tandra" },
    { name: "Articles", href: "/articles" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ],
  legalLinks = [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
  copyrightText = "© 2026 Tandra Peters. All Rights Reserved.",
  partnerText = "BirdCreek Roofing"
}) => {
  const footerStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
    /* Pull up 1px so footer paint covers the hairline below the last Band stripe (subpixel layout). */
    marginTop: "-1px",
    paddingTop: "5rem",
    paddingBottom: "5rem",
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
    textTransform: "uppercase",
    fontSize: "10px",
    letterSpacing: "0.3em",
    color: theme.colors.textOnBrand,
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

  const bottomBarColorStyle: React.CSSProperties = {
    color: theme.colors.textOnBrand,
    opacity: 0.4,
  };

  return (
    <footer style={footerStyle}>
      <div className={`${layoutClass.containerWideGridFooter} md-grid-12`}>
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
          <div
            style={{
              color: theme.colors.textOnBrand,
              fontSize: "0.875rem",
              lineHeight: 1.6,
              maxWidth: "20rem",
              marginBottom: "2.5rem",
              opacity: 0.6,
            }}
          >
            <RichText
              flow="heading"
              value={description}
              paragraphStyle={{
                color: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                opacity: "inherit",
              }}
              linkStyle={{ color: theme.colors.accentLight }}
            />
          </div>
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
              <li key={i}>
                {link.href.startsWith("#") ? (
                  <TransitionLink
                    to={{ pathname: "/", hash: link.href }}
                    style={linkStyle}
                    className="footer-link"
                  >
                    {link.name}
                  </TransitionLink>
                ) : (
                  <TransitionLink
                    to={link.href}
                    viewTransition
                    style={linkStyle}
                    className="footer-link"
                  >
                    {link.name}
                  </TransitionLink>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="md-col-2">
          <h4 style={headingStyle}>Legal</h4>
          <ul style={linkListStyle}>
            {legalLinks.map((link, i) => (
              <li key={i}>
                <TransitionLink
                  to={link.href}
                  style={linkStyle}
                  className="footer-link"
                >
                  {link.name}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={`${layoutClass.containerWideFooterLegal} md-row`}
        style={bottomBarColorStyle}
      >
        <p>{copyrightText}</p>
        <p>{partnerText}</p>
      </div>
    </footer>
  );
};
