import { Facebook, Mail } from "iconoir-react";
import type React from "react";

import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import type { FooterProps } from "../types";
import FooterBg from "./FooterBg";
import { GoogleAuthFooterTrigger, GoogleAuthGate } from "./GoogleAuthGate";
import { TransitionLink } from "./TransitionLink";

export const Footer: React.FC<FooterProps> = ({
  logoText = "Tandra Peters",
  description = "Austin roofing consultant for roof assessments, insurance claim support, and end-to-end project oversight—paired with Birdcreek Roofing for trusted installation across Texas.",
  socialLinks = [
    {
      icon: Facebook,
      href: "https://www.facebook.com/tandra.peters.3",
      platform: "Visit my Facebook",
    },
    {
      icon: Mail,
      href: "mailto:tandra@birdcreekroofing.com",
      platform: "Email me",
    },
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
  partnerText = "Birdcreek Roofing",
}) => {
  const footerStyle: React.CSSProperties = {
    backgroundColor: theme.palette.everglade[900],
    color: theme.colors.white,
    /* Pull up 1px so footer paint covers the hairline below the last Band stripe (subpixel layout). */
    marginTop: "-1px",
    paddingTop: theme.spacing.section,
    paddingBottom: theme.spacing.xxxxxxxxl,
    position: "relative",
  };

  const socialLinkStyle: React.CSSProperties = {
    width: "2.5rem",
    height: "2.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.radius.pill,
    color: theme.colors.heroAccent,
    transition: "all 0.3s",
    textDecoration: "none",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.3em",
    color: theme.colors.textOnBrand,
    marginBottom: theme.spacing.xxxxl,
  };

  const linkListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    fontSize: "0.875rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    letterSpacing: "0.1em",
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
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 0,
    width: "100%",
    height: "100%",
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
              fontSize: "1.875rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              fontFamily: theme.fonts.headline,
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
              maxWidth: "20rem",
              marginBottom: theme.spacing.xxxxxxl,
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
                      to={{ pathname: "/", hash: link.href }}
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
