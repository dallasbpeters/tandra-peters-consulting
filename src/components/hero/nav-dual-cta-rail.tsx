import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { useIsMobile } from "../../hooks/is-mobile";
import { theme } from "../../theme";
import type { NavItem, NavProps } from "../../types";
import { GoogleAuthGate } from "../google-auth-gate";
import { OverflowNav } from "../nav/overflow-nav";
import { SiteNavLink } from "../nav/site-nav-link";
import { TransitionLink } from "../transition-link";

/** Dual-CTA rail nav: always opaque cream, left logo+tagline, center links, two CTA buttons on right. Compacts on scroll. */
export const NavDualCTARail: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  imageSrc = "/tandra.png",
  navItems = [
    { href: "#services", name: "services" },
    { href: "#about", name: "about" },
    { href: "#testimonials", name: "Reviews" },
    { href: "#contact", name: "contact" },
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  hideCta = false,
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
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compact = scrollY > 40;

  const styles: Record<string, CSSProperties> = {
    ctaArrow: {
      fontWeight: 400,
    },
    ctaGroup: {
      alignItems: "center",
      display: "flex",
      flexShrink: 0,
      gap: theme.spacing.md,
    },
    ctaPrimary: {
      alignItems: "center",
      background: hovPrimary ? "oklch(22% 0.04 163)" : theme.colors.everglade,
      color: theme.colors.paper,
      display: "inline-flex",
      fontSize: "0.8125rem",
      fontWeight: 800,
      gap: theme.spacing.tight,
      letterSpacing: "0.04em",
      padding: `${theme.spacing.buttonPadY} ${theme.spacing.insetXl}`,
      textDecoration: "none",
      transition: "background 0.15s",
    },
    ctaSecondary: {
      background: hovSecondary ? "oklch(97% 0.003 163)" : "transparent",
      border: `1px solid ${hovSecondary ? theme.colors.everglade : "oklch(64.58% 0.131 162.02)"}`,
      color: theme.colors.everglade,
      fontSize: "0.8125rem",
      fontWeight: 700,
      letterSpacing: "0.04em",
      padding: `${theme.spacing.buttonPadY} ${theme.spacing.insetXl}`,
      textDecoration: "none",
      transition: "background 0.15s, border-color 0.15s",
    },
    hamburger: {
      alignItems: "center",
      background: "none",
      border: "none",
      color: theme.colors.everglade,
      cursor: "pointer",
      display: isMobile ? "flex" : "none",
      justifyContent: "center",
      padding: theme.spacing.sm,
    },
    link: {
      color: theme.colors.evergladeMuted,
      fontSize: "0.875rem",
      fontWeight: 600,
      letterSpacing: "0.02em",
      textDecoration: "none",
      transition: "color 0.15s",
    },
    linkGroup: {
      display: isMobile ? "none" : "flex",
      gap: theme.spacing.xl,
    },
    linkHover: {
      color: theme.colors.everglade,
      fontSize: "0.875rem",
      fontWeight: 600,
      letterSpacing: "0.02em",
      textDecoration: "none",
      transition: "color 0.15s",
    },
    logoGroup: {
      alignItems: "center",
      display: "flex",
      flexShrink: 0,
      gap: theme.spacing.cozy,
    },
    logoImage: {
      borderRadius: theme.radius.pill,
      gridArea: "image",
      maxBlockSize: isMobile ? "2rem" : "3rem",
      maxInlineSize: isMobile ? "2rem" : "3rem",
      minBlockSize: isMobile ? "2rem" : "3rem",
      minInlineSize: isMobile ? "2rem" : "3rem",
      objectFit: "cover",
      overflow: "hidden",
    },
    logoMark: {
      alignItems: "center",
      background: theme.colors.everglade,
      display: "flex",
      flexShrink: 0,
      height: compact ? "2rem" : "2.5rem",
      justifyContent: "center",
      transition: "width 0.25s, height 0.25s",
      width: compact ? "2rem" : "2.5rem",
    },
    logoMarkInner: {
      background: theme.colors.accentLight,
      height: "50%",
      width: "50%",
    },
    logoTagline: {
      color: theme.colors.accent,
      fontSize: "0.5625rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      maxHeight: compact || isMobile ? 0 : "1rem",
      opacity: compact || isMobile ? 0 : 1,
      overflow: "hidden",
      textTransform: "uppercase",
      transition: "opacity 0.2s, max-height 0.25s",
    },
    logoText: {
      color: theme.colors.everglade,
      fontSize: compact ? "0.9375rem" : "1.0625rem",
      fontWeight: 800,
      letterSpacing: "-0.025em",
      lineHeight: 1.1,
      transition: "font-size 0.25s",
    },
    mobileCta: {
      background: theme.colors.everglade,
      color: theme.colors.paper,
      display: "block",
      fontSize: "0.875rem",
      fontWeight: 900,
      letterSpacing: "0.1em",
      padding: theme.spacing.lg,
      textAlign: "center",
      textDecoration: "none",
      textTransform: "uppercase",
      width: "100%",
    },
    mobileLink: {
      color: theme.colors.everglade,
      fontFamily: theme.fonts.headline,
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textDecoration: "none",
      textTransform: "uppercase",
    },
    mobileMenu: {
      background: theme.colors.paper,
      borderTop: `1px solid ${theme.colors.paperDark}`,
      overflow: "hidden",
    },
    mobileMenuInner: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
      padding: theme.spacing.xxl,
    },
    overflowMenu: {
      background: theme.colors.paper,
      border: `1px solid ${theme.colors.paperDark}`,
      borderRadius: theme.radius.large,
      boxShadow: "0 8px 24px oklch(25.66% 0.046 163.60 / 0.12)",
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
    },
    overflowMenuLink: {
      borderRadius: theme.radius.medium,
      color: theme.colors.everglade,
      display: "block",
      fontSize: "0.875rem",
      fontWeight: 600,
      letterSpacing: "0.02em",
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      textDecoration: "none",
      width: "100%",
    },
    nav: {
      background: theme.colors.paper,
      borderBottom: `1px solid ${theme.colors.paperDark}`,
      boxShadow: compact
        ? "0 2px 16px oklch(25.66% 0.046 163.60 / 0.06)"
        : "none",
      left: 0,
      position: "fixed",
      right: 0,
      top: 0,
      transition: "box-shadow 0.25s",
      zIndex: 100,
    },
    navInner: {
      alignItems: "center",
      display: "flex",
      height: compact ? "4.5rem" : "5rem",
      justifyContent: "space-between",
      padding: isMobile
        ? `0 ${theme.spacing.xl}`
        : `0 ${theme.spacing.xxxxxxxxl}`,
      transition: "height 0.25s",
    },
  };

  const renderRailLink = (item: NavItem, context: "inline" | "menu") => (
    <SiteNavLink
      href={item.href}
      onMouseEnter={
        context === "inline" ? () => setHovLink(item.name) : undefined
      }
      onMouseLeave={context === "inline" ? () => setHovLink(null) : undefined}
      style={(() => {
        if (context === "menu") {
          return styles.overflowMenuLink;
        }
        return hovLink === item.name ? styles.linkHover : styles.link;
      })()}
    >
      {item.name}
    </SiteNavLink>
  );

  return (
    <nav
      aria-label="Site navigation"
      className="site-nav-vt nav-dual-cta-rail"
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
          {isMobile ? null : (
            <OverflowNav
              align="center"
              containerStyle={{
                flex: "1 1 auto",
                margin: `0 ${theme.spacing.xl}`,
              }}
              gap={20}
              items={navItems}
              menuStyle={styles.overflowMenu}
              moreButtonStyle={{ color: theme.colors.evergladeMuted }}
              renderItem={renderRailLink}
            />
          )}
        </GoogleAuthGate>

        {/* Desktop dual CTAs */}
        {hideCta ? null : (
          <div className="cta-group" style={styles.ctaGroup}>
            <GoogleAuthGate>
              <SiteNavLink
                href={secondaryCtaHref}
                onClick={() =>
                  posthog?.capture("nav_cta_clicked", {
                    cta_text: secondaryCtaText,
                    position: "secondary",
                    variant: "dual-cta-rail",
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
                  cta_text: ctaText,
                  position: "primary",
                  variant: "dual-cta-rail",
                })
              }
              onMouseEnter={() => setHovPrimary(true)}
              onMouseLeave={() => setHovPrimary(false)}
              style={styles.ctaPrimary}
            >
              {ctaText} <span style={styles.ctaArrow}>→</span>
            </SiteNavLink>
          </div>
        )}

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
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            style={styles.mobileMenu}
            transition={{
              damping: 20,
              mass: 0.5,
              stiffness: 300,
              type: "spring",
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
              {hideCta ? null : (
                <SiteNavLink
                  href={ctaHref}
                  onClick={() => {
                    posthog?.capture("nav_cta_clicked", {
                      cta_text: ctaText,
                      location: "mobile",
                      variant: "dual-cta-rail",
                    });
                    setMenuOpen(false);
                  }}
                  style={styles.mobileCta}
                >
                  {ctaText}
                </SiteNavLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
