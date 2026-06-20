import { Facebook, Mail } from "iconoir-react";
import type React from "react";

import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { FooterProps } from "../types";
import FooterBg from "./footer-bg";
import { GoogleAuthFooterTrigger, GoogleAuthGate } from "./google-auth-gate";
import { TransitionLink } from "./transition-link";

export const Footer: React.FC<FooterProps> = ({
  logoText = "Tandra Peters",
  description = "Austin roofing consultant for roof assessments, insurance claim support, and end-to-end project oversight—paired with Birdcreek Roofing for trusted installation across Texas.",
  socialLinks = [
    {
      href: "https://www.facebook.com/tandra.peters.3",
      icon: Facebook,
      platform: "Visit my Facebook",
    },
    {
      href: "mailto:tandra@birdcreekroofing.com",
      icon: Mail,
      platform: "Email me",
    },
  ],
  quickLinks = [
    { href: "#services", name: "services" },
    { href: "#about-tandra", name: "About Tandra" },
    { href: "/articles", name: "Articles" },
    { href: "#testimonials", name: "testimonials" },
    { href: "#faq", name: "FAQ" },
    { href: "#contact", name: "contact" },
  ],
  legalLinks = [
    { href: "/privacy", name: "Privacy Policy" },
    { href: "/terms", name: "Terms of Service" },
    { href: "/cookies", name: "Cookie Policy" },
  ],
  copyrightText = "© 2026 Tandra Peters. All Rights Reserved.",
  partnerText = "Birdcreek Roofing",
}) => {
  const footerStyle: React.CSSProperties = {
    backgroundColor: theme.palette.everglade[900],
    color: theme.colors.white,
    /* Pull up 1px so footer paint covers the hairline below the last Band stripe (subpixel layout). */
    marginTop: "-1px",
    paddingBottom: theme.spacing.xxxxxxxxl,
    paddingTop: theme.spacing.section,
    position: "relative",
  };

  const socialLinkStyle: React.CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.radius.pill,
    color: theme.colors.heroAccent,
    height: "2.5rem",
    textDecoration: "none",
    transition: "all 0.3s",
    width: "2.5rem",
  };

  const headingStyle: React.CSSProperties = {
    color: theme.colors.textOnBrand,
    fontFamily: theme.fonts.headline,
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.3em",
    marginBottom: theme.spacing.xxxxl,
    textTransform: "uppercase",
  };

  const linkListStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const linkStyle: React.CSSProperties = {
    textDecoration: "none",
    transition: "color 0.2s",
  };
  const linklistItemStyle: React.CSSProperties = {
    marginInlineStart: 0,
  } as React.CSSProperties;

  const bottomBarColorStyle: React.CSSProperties = {
    color: theme.colors.textOnBrand,
    opacity: 0.4,
  };

  const footerBgStyle: React.CSSProperties = {
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 0,
  };

  return (
    <footer className="footer" style={footerStyle}>
      <div className={`${layoutClass.containerWideGridFooter} md-grid-12`}>
        <style>{`
          @media (min-width: 768px) {
            .md-grid-12 { grid-template-columns: repeat(12, 1fr) !important; }
            .md-col-4 { grid-column: 1 / span 6 !important; }
            .md-col-3 { grid-column: span 3 / span 2 !important; }
            .md-row { flex-direction: row !important; }

          }
          .social-link:hover { background-color: ${theme.colors.accentLight} !important; color: ${theme.colors.everglade};}
          .footer-link { color: ${theme.colors.white} }
          .footer-link:hover { color: ${theme.colors.accentLight}; }
        `}</style>
        <div className="md-col-4">
          <div
            style={{
              fontFamily: theme.fonts.headline,
              fontSize: "1.875rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              marginBottom: theme.spacing.xxxxl,
            }}
          >
            {logoText}
          </div>
          <div
            style={{
              color: theme.colors.textOnBrand,
              fontSize: "0.875rem",
              lineHeight: 1.6,
              marginBottom: theme.spacing.xxxxxxl,
              maxWidth: "20rem",
              opacity: 0.6,
            }}
          >
            <RichText
              flow="heading"
              linkStyle={{ color: theme.colors.accentLight }}
              paragraphStyle={{
                color: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                opacity: "inherit",
              }}
              value={description}
            />
          </div>
          <div style={{ display: "flex", gap: theme.spacing.xxl }}>
            {socialLinks.map((social) => (
              <a
                aria-label={social.platform ?? "Visit social profile"}
                className="social-link layout-flex-center"
                href={social.href}
                key={social.href}
                style={socialLinkStyle}
                tabIndex={0}
              >
                <social.icon
                  aria-hidden
                  height={18}
                  strokeWidth={1.5}
                  width={18}
                />
              </a>
            ))}
          </div>
        </div>
        <GoogleAuthGate>
          <div className="md-col-3">
            <h2 style={headingStyle}>Quick Links</h2>
            <ul className="wa-stack wa-gap-2xs" style={linkListStyle}>
              {quickLinks.map((link) => (
                <li key={link.href} style={linklistItemStyle}>
                  {link.href.startsWith("#") ? (
                    <TransitionLink
                      className="footer-link"
                      style={linkStyle}
                      tabIndex={0}
                      to={{ hash: link.href, pathname: "/" }}
                    >
                      {link.name}
                    </TransitionLink>
                  ) : (
                    <TransitionLink
                      className="footer-link"
                      style={linkStyle}
                      tabIndex={0}
                      to={link.href}
                      viewTransition
                    >
                      {link.name}
                    </TransitionLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="md-col-3">
            <h2 style={headingStyle}>Legal</h2>
            <ul className="wa-stack wa-gap-2xs" style={linkListStyle}>
              {legalLinks.map((link) => (
                <li key={link.href} style={linklistItemStyle}>
                  <TransitionLink
                    className="footer-link"
                    style={linkStyle}
                    tabIndex={0}
                    to={link.href}
                  >
                    {link.name}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </GoogleAuthGate>
      </div>
      <div
        className={`${layoutClass.containerWideFooterLegal} md-row google-auth-gate__footer-bar`}
        style={bottomBarColorStyle}
      >
        <GoogleAuthFooterTrigger />
        <p>{copyrightText}</p>
        <p>{partnerText}</p>
      </div>
      <FooterBg style={footerBgStyle} />
    </footer>
  );
};
