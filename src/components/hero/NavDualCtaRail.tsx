import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useIsMobile } from "../../hooks/isMobile";
import { theme } from "../../theme";
import type { NavProps } from "../../types";
import { GoogleAuthGate } from "../GoogleAuthGate";
import { SiteNavLink } from "../nav/SiteNavLink";
import { TransitionLink } from "../TransitionLink";

/** Dual-CTA rail nav: always opaque cream, left logo+tagline, center links, two CTA buttons on right. Compacts on scroll. */
export const NavDualCTARail: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  imageSrc = "/tandra.png",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About", href: "#about" },
    { name: "Reviews", href: "#testimonials" },
    { name: "Contact", href: "#contact" },
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile(1300);
  const [scrollY, setScrollY] = useState(0);
  const [hovLink, setHovLink] = useState<string | null>(null);
  const [hovPrimary, setHovPrimary] = useState(false);
  const [hovSecondary, setHovSecondary] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compact = scrollY > 40;

  const styles: Record<string, CSSProperties> = {
    nav: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: theme.colors.paper,
      borderBottom: `1px solid ${theme.colors.paperDark}`,
      boxShadow: compact
        ? "0 2px 16px oklch(25.66% 0.046 163.60 / 0.06)"
        : "none",
      transition: "box-shadow 0.25s",
    },
    navInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile
        ? `0 ${theme.spacing.xl}`
        : `0 ${theme.spacing.xxxxxxxxl}`,
      height: compact ? "4.5rem" : "5rem",
      transition: "height 0.25s",
    },
    logoGroup: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.cozy,
      flexShrink: 0,
    },
    logoMark: {
      width: compact ? "2rem" : "2.5rem",
      height: compact ? "2rem" : "2.5rem",
      background: theme.colors.everglade,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "width 0.25s, height 0.25s",
    },
    logoMarkInner: {
      width: "50%",
      height: "50%",
      background: theme.colors.accentLight,
    },
    logoText: {
      fontWeight: 800,
      fontSize: compact ? "0.9375rem" : "1.0625rem",
      color: theme.colors.everglade,
      letterSpacing: "-0.025em",
      lineHeight: 1.1,
      transition: "font-size 0.25s",
    },
    logoTagline: {
      fontSize: "0.5625rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: theme.colors.accent,
      opacity: compact || isMobile ? 0 : 1,
      maxHeight: compact || isMobile ? 0 : "1rem",
      overflow: "hidden",
      transition: "opacity 0.2s, max-height 0.25s",
    },
    logoImage: {
      minInlineSize: isMobile ? "2rem" : "3rem",
      minBlockSize: isMobile ? "2rem" : "3rem",
      maxInlineSize: isMobile ? "2rem" : "3rem",
      maxBlockSize: isMobile ? "2rem" : "3rem",
      objectFit: "cover",
      borderRadius: theme.radius.pill,
      gridArea: "image",
      overflow: "hidden",
    },
    linkGroup: {
      display: isMobile ? "none" : "flex",
      gap: theme.spacing.xl,
    },
    link: {
      fontSize: "0.875rem",
      fontWeight: 600,
      letterSpacing: "0.02em",
      color: theme.colors.evergladeMuted,
      transition: "color 0.15s",
      textDecoration: "none",
    },
    linkHover: {
      fontSize: "0.875rem",
      fontWeight: 600,
      letterSpacing: "0.02em",
      color: theme.colors.everglade,
      transition: "color 0.15s",
      textDecoration: "none",
    },
    ctaGroup: {
      display: "flex",
      gap: theme.spacing.md,
      alignItems: "center",
      flexShrink: 0,
    },
    ctaSecondary: {
      border: `1px solid ${hovSecondary ? theme.colors.everglade : "oklch(64.58% 0.131 162.02)"}`,
      color: theme.colors.everglade,
      background: hovSecondary ? "oklch(97% 0.003 163)" : "transparent",
      padding: `${theme.spacing.buttonPadY} ${theme.spacing.insetXl}`,
      fontWeight: 700,
      fontSize: "0.8125rem",
      letterSpacing: "0.04em",
      textDecoration: "none",
      transition: "background 0.15s, border-color 0.15s",
    },
    ctaPrimary: {
      background: hovPrimary ? "oklch(22% 0.04 163)" : theme.colors.everglade,
      color: theme.colors.paper,
      padding: `${theme.spacing.buttonPadY} ${theme.spacing.insetXl}`,
      fontWeight: 800,
      fontSize: "0.8125rem",
      letterSpacing: "0.04em",
      display: "inline-flex",
      alignItems: "center",
      gap: theme.spacing.tight,
      textDecoration: "none",
      transition: "background 0.15s",
    },
    ctaArrow: {
      fontWeight: 400,
    },
    hamburger: {
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.sm,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: theme.colors.everglade,
    },
    mobileMenu: {
      overflow: "hidden",
      background: theme.colors.paper,
      borderTop: `1px solid ${theme.colors.paperDark}`,
    },
    mobileMenuInner: {
      padding: theme.spacing.xxl,
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
    },
    mobileLink: {
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "0.875rem",
      textDecoration: "none",
      color: theme.colors.everglade,
    },
    mobileCta: {
      background: theme.colors.everglade,
      color: theme.colors.paper,
      padding: theme.spacing.lg,
      fontWeight: 900,
      fontSize: "0.875rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      textAlign: "center",
      width: "100%",
      display: "block",
    },
  };

  return (
    <nav
      aria-label="Site navigation"
      className="site-nav-vt"
      style={styles.nav}
    >
      <div style={styles.navInner}>
        {/* Logo */}
        <TransitionLink
          style={{ ...styles.logoGroup, textDecoration: "none" }}
          to="/"
        >
          {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS */}
          <img alt="Tandra Peters" src={imageSrc} style={styles.logoImage} />
          <div>
            <div style={styles.logoText}>{logoText}</div>
            <div style={styles.logoTagline}>{logoTagline}</div>
          </div>
        </TransitionLink>
        <GoogleAuthGate>
          {/* Desktop links */}
          <div style={styles.linkGroup}>
            {navItems.map((item) => (
              <SiteNavLink
                href={item.href}
                key={item.name}
                onMouseEnter={() => setHovLink(item.name)}
                onMouseLeave={() => setHovLink(null)}
                style={hovLink === item.name ? styles.linkHover : styles.link}
              >
                {item.name}
              </SiteNavLink>
            ))}
          </div>
        </GoogleAuthGate>

        {/* Desktop dual CTAs */}
        <div className="cta-group" style={styles.ctaGroup}>
          <GoogleAuthGate>
            <SiteNavLink
              href={secondaryCtaHref}
              onClick={() =>
                posthog?.capture("nav_cta_clicked", {
                  variant: "dual-cta-rail",
                  cta_text: secondaryCtaText,
                  position: "secondary",
                })
              }
              onMouseEnter={() => setHovSecondary(true)}
              onMouseLeave={() => setHovSecondary(false)}
              style={styles.ctaSecondary}
            >
              {secondaryCtaText}
            </SiteNavLink>
          </GoogleAuthGate>
          <SiteNavLink
            href={ctaHref}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                variant: "dual-cta-rail",
                cta_text: ctaText,
                position: "primary",
              })
            }
            onMouseEnter={() => setHovPrimary(true)}
            onMouseLeave={() => setHovPrimary(false)}
            style={styles.ctaPrimary}
          >
            {ctaText} <span style={styles.ctaArrow}>→</span>
          </SiteNavLink>
        </div>

        {/* Hamburger */}
        <GoogleAuthGate>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(!menuOpen)}
            style={styles.hamburger}
            type="button"
          >
            {menuOpen ? (
              <Xmark aria-hidden height={24} width={24} />
            ) : (
              <Menu aria-hidden height={24} width={24} />
            )}
          </button>
        </GoogleAuthGate>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            style={styles.mobileMenu}
            transition={{
              type: "spring",
              mass: 0.5,
              damping: 20,
              stiffness: 300,
            }}
          >
            <div style={styles.mobileMenuInner}>
              {navItems.map((item) => (
                <SiteNavLink
                  href={item.href}
                  key={item.name}
                  onClick={() => setMenuOpen(false)}
                  style={styles.mobileLink}
                >
                  {item.name}
                </SiteNavLink>
              ))}
              <SiteNavLink
                href={ctaHref}
                onClick={() => {
                  posthog?.capture("nav_cta_clicked", {
                    variant: "dual-cta-rail",
                    cta_text: ctaText,
                    location: "mobile",
                  });
                  setMenuOpen(false);
                }}
                style={styles.mobileCta}
              >
                {ctaText}
              </SiteNavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
