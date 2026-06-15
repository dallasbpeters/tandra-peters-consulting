import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";

import type { NavProps } from "../../types";

import { useIsMobile } from "../../hooks/isMobile";
import { mix, theme } from "../../theme";
import { GoogleAuthGate } from "../GoogleAuthGate";
import { SiteNavLink } from "../nav/SiteNavLink";
import { TransitionLink } from "../TransitionLink";

/** Glass-overlay nav: centered logo, split links left/right, pill CTA. Transparent → dark glass on scroll. */
export const NavGlassOverlay: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About", href: "#about" },
    { name: "Reviews", href: "#testimonials" },
    { name: "Contact", href: "#contact" },
  ],
  ctaText = "Book Consult",
  ctaHref = "#contact",
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile(1400);
  const [scrollY, setScrollY] = useState(0);
  const [hovLink, setHovLink] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const glassed = scrollY > 48;
  const mid = Math.ceil(navItems.length / 2);
  const leftLinks = navItems.slice(0, mid);
  const rightLinks = navItems.slice(mid);

  const styles: Record<string, CSSProperties> = {
    nav: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: glassed || menuOpen ? theme.colors.everglade : mix(theme.colors.white, 50),
      backdropFilter: glassed || menuOpen ? "blur(20px) saturate(1.3)" : "none",
      borderBottom: glassed ? "1px solid oklch(100% 0 0 / 0.08)" : "1px solid transparent",
      transition: "background 0.35s, backdrop-filter 0.35s, border-color 0.35s",
    },
    navInner: {
      position: "relative",
      height: "5rem",
      display: "flex",
      padding: `0 ${theme.spacing.xxxxl}`,
      placeItems: "center stretch",
      flexGrow: 1,
    },
    linkGroupLeft: {
      display: isMobile ? "none" : "flex",
      flexGrow: 1,
      gap: theme.spacing.xxxl,
      alignItems: "center",
      justifyContent: isMobile ? "start" : "center",
    },
    linkGroupRight: {
      display: "flex",
      gap: theme.spacing.xxxl,
      alignItems: "center",
      justifyContent: "end",
      marginLeft: "auto",
    },
    link: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: glassed ? theme.colors.white : theme.colors.everglade,
      transition: "color 0.15s",
      textDecoration: "none",
    },
    linkHover: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: glassed ? theme.colors.heroAccent : theme.colors.evergladeMuted,
      transition: "color 0.15s",
      textDecoration: "none",
    },
    logo: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      flexShrink: 0,
      userSelect: "none",
      flex: isMobile ? "1 1 auto" : "none",
    },
    logoText: {
      color: glassed || menuOpen ? theme.colors.white : theme.colors.everglade,
      fontWeight: 800,
      fontSize: isMobile ? "1.2rem" : "1.25rem",
      letterSpacing: "-0.03em",
      lineHeight: 1,
      whiteSpace: "nowrap",
      textTransform: "uppercase",
    },
    logoTagline: {
      fontSize: "0.625rem",
      fontWeight: 700,
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      color: glassed ? theme.colors.heroAccent : theme.colors.everglade,
      marginTop: theme.spacing.xs,
      transition: "color 0.35s",
      display: isMobile ? "none" : "block",
    },
    cta: {
      background: hovBtn
        ? theme.colors.accent
        : glassed
          ? theme.colors.heroAccent
          : theme.colors.everglade,
      color: theme.colors.white,
      padding: `${theme.spacing.sm} ${theme.spacing.insetXl}`,
      borderRadius: theme.radius.pill,
      fontWeight: 800,
      fontSize: "0.75rem",
      display: isMobile ? "none" : "inline-flex",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      flexShrink: 0,
      transition: "background 0.15s",
    },
    hamburger: {
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "end",
      padding: theme.spacing.sm,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: glassed || menuOpen ? theme.colors.white : theme.colors.everglade,
      flexShrink: 0,
    },
    mobileMenu: {
      overflow: "hidden",
    },
    mobileMenuInner: {
      padding: `${theme.spacing.xxl} ${theme.spacing.xxxxl}`,
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
    },
    mobileLink: {
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "1rem",
      paddingBlock: theme.spacing.lg,
      textDecoration: "none",
      color: "oklch(88% 0 0)",
    },
    mobileCta: {
      background: theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.pill,
      fontWeight: 900,
      fontSize: "1.1em",
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
        {/* Centered logo */}
        <TransitionLink to="/" className="logo" style={{ ...styles.logo, textDecoration: "none" }}>
          <span style={styles.logoText}>{logoText}</span>
          <span style={styles.logoTagline}>{logoTagline}</span>
        </TransitionLink>
        <GoogleAuthGate>
          <div style={styles.linkGroupLeft}>
            {leftLinks.map((item) => (
              <SiteNavLink
                key={item.name}
                href={item.href}
                style={hovLink === item.name ? styles.linkHover : styles.link}
                onMouseEnter={() => setHovLink(item.name)}
                onMouseLeave={() => setHovLink(null)}
              >
                {item.name}
              </SiteNavLink>
            ))}
            {rightLinks.map((item) => (
              <SiteNavLink
                key={item.name}
                href={item.href}
                style={hovLink === item.name ? styles.linkHover : styles.link}
                onMouseEnter={() => setHovLink(item.name)}
                onMouseLeave={() => setHovLink(null)}
              >
                {item.name}
              </SiteNavLink>
            ))}
          </div>
        </GoogleAuthGate>

        {/* Right links + CTA — logo is absolute-centered so this group doesn't skew it */}
        <div style={styles.linkGroupRight}>
          <SiteNavLink
            href={ctaHref}
            style={styles.cta}
            onMouseEnter={() => setHovBtn(true)}
            onMouseLeave={() => setHovBtn(false)}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                variant: "glass-overlay",
                cta_text: ctaText,
              })
            }
          >
            {ctaText}
          </SiteNavLink>
        </div>
        <GoogleAuthGate>
          {/* Hamburger — mobile only */}
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
        </GoogleAuthGate>
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
                <SiteNavLink
                  key={item.name}
                  href={item.href}
                  style={styles.mobileLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </SiteNavLink>
              ))}
              <SiteNavLink
                href={ctaHref}
                style={styles.mobileCta}
                onClick={() => {
                  posthog?.capture("nav_cta_clicked", {
                    variant: "glass-overlay",
                    cta_text: ctaText,
                    location: "mobile",
                  });
                  setMenuOpen(false);
                }}
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
