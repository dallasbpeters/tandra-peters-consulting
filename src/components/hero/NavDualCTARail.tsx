import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";

import type { NavProps } from "../../types";

import { useIsMobile } from "../../hooks/isMobile";
import { theme } from "../../theme";

type DualCTANavProps = NavProps & {
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
};

/** Dual-CTA rail nav: always opaque cream, left logo+tagline, center links, two CTA buttons on right. Compacts on scroll. */
export const NavDualCTARail: React.FC<DualCTANavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant · Austin, TX",
  imageSrc = "/tandra.png",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About", href: "#about" },
    { name: "Reviews", href: "#testimonials" },
    { name: "Contact", href: "#contact" },
  ],
  ctaText = "Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile();
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
      boxShadow: compact ? "0 2px 16px oklch(25.66% 0.046 163.60 / 0.06)" : "none",
      transition: "box-shadow 0.25s",
    },
    navInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile ? `0 ${theme.spacing.xl}` : `0 ${theme.spacing.xxxxxxxxl}`,
      height: compact ? "3.75rem" : "5rem",
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
      gap: theme.spacing.xxxxxxl,
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
      display: isMobile ? "none" : "flex",
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
    <nav aria-label="Site navigation" className="site-nav-vt" style={styles.nav}>
      <div style={styles.navInner}>
        {/* Logo */}
        <div style={styles.logoGroup}>
          <img src={imageSrc} alt="" style={styles.logoImage} />
          <div>
            <div style={styles.logoText}>{logoText}</div>
            <div style={styles.logoTagline}>{logoTagline}</div>
          </div>
        </div>

        {/* Desktop links */}
        <div style={styles.linkGroup}>
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              style={hovLink === item.name ? styles.linkHover : styles.link}
              onMouseEnter={() => setHovLink(item.name)}
              onMouseLeave={() => setHovLink(null)}
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Desktop dual CTAs */}
        <div style={styles.ctaGroup}>
          <a
            href={secondaryCtaHref}
            style={styles.ctaSecondary}
            onMouseEnter={() => setHovSecondary(true)}
            onMouseLeave={() => setHovSecondary(false)}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                variant: "dual-cta-rail",
                cta_text: secondaryCtaText,
                position: "secondary",
              })
            }
          >
            {secondaryCtaText}
          </a>
          <a
            href={ctaHref}
            style={styles.ctaPrimary}
            onMouseEnter={() => setHovPrimary(true)}
            onMouseLeave={() => setHovPrimary(false)}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                variant: "dual-cta-rail",
                cta_text: ctaText,
                position: "primary",
              })
            }
          >
            {ctaText} <span style={styles.ctaArrow}>→</span>
          </a>
        </div>

        {/* Hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <Xmark width={24} height={24} aria-hidden />
          ) : (
            <Menu width={24} height={24} aria-hidden />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: "spring",
              mass: 0.5,
              damping: 20,
              stiffness: 300,
            }}
            style={styles.mobileMenu}
          >
            <div style={styles.mobileMenuInner}>
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  style={styles.mobileLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <a
                href={ctaHref}
                style={styles.mobileCta}
                onClick={() => {
                  posthog?.capture("nav_cta_clicked", {
                    variant: "dual-cta-rail",
                    cta_text: ctaText,
                    location: "mobile",
                  });
                  setMenuOpen(false);
                }}
              >
                {ctaText}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
