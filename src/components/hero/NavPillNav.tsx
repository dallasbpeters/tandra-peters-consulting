import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";

import type { NavProps } from "../../types";

import { useIsMobile } from "../../hooks/isMobile";
import { theme } from "../../theme";
import { GoogleAuthGate } from "../GoogleAuthGate";
import { SiteNavLink } from "../nav/SiteNavLink";
import { TransitionLink } from "../TransitionLink";

/** Floating pill nav on desktop; compact fixed bar with hamburger on mobile. */
export const NavPillNav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About", href: "#about" },
    { name: "Reviews", href: "#testimonials" },
  ],
  ctaText = "Book Now",
  ctaHref = "#contact",
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile(1024);
  const [scrollY, setScrollY] = useState(0);
  const [hovLink, setHovLink] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const createLink =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3333/studio"
      : "https://tandra.me/studio";

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrolled = scrollY > 60;

  const styles: Record<string, CSSProperties> = {
    /* ── Desktop: floating pill ── */
    pill: {
      position: "fixed",
      top: scrolled ? "1rem" : "1.75rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 50,
      display: isMobile ? "none" : "flex",
      alignItems: "center",
      padding: `0 ${theme.spacing.sm} 0 ${theme.spacing.xl}`,
      height: scrolled ? "3rem" : "3.5rem",
      borderRadius: theme.radius.pill,
      justifyContent: "space-between",
      minInlineSize: "60vw",
      background: scrolled
        ? "oklch(18.97% 0.008 107.13 / 0.95)"
        : "oklch(18.97% 0.008 107.13 / 0.75)",
      backdropFilter: "blur(24px) saturate(1.5)",
      border: "1px solid oklch(100% 0 0 / 0.1)",
      boxShadow: scrolled ? "0 8px 32px oklch(0% 0 0 / 0.35)" : "0 4px 16px oklch(0% 0 0 / 0.2)",
      whiteSpace: "nowrap",
      transition: "top 0.3s, height 0.3s, background 0.3s, box-shadow 0.3s",
    },
    pillLogo: {
      fontWeight: 800,
      fontSize: "0.9375rem",
      color: "oklch(100% 0 0)",
      letterSpacing: "-0.025em",
      marginRight: theme.spacing.xxxxl,
      flexShrink: 0,
    },
    pillDivider: {
      width: "1px",
      height: "1.25rem",
      background: "oklch(100% 0 0 / 0.15)",
      marginRight: theme.spacing.xxxxl,
      flexShrink: 0,
    },
    pillLink: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: "rgba(200,210,205,0.85)",
      padding: `0 ${theme.spacing.lg}`,
      height: "100%",
      display: "flex",
      alignItems: "center",
      transition: "color 0.15s",
      textDecoration: "none",
    },
    pillLinkHover: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: "oklch(100% 0 0)",
      padding: `0 ${theme.spacing.lg}`,
      height: "100%",
      display: "flex",
      alignItems: "center",
      transition: "color 0.15s",
      textDecoration: "none",
    },
    pillCta: {
      background: hovBtn ? theme.colors.accent : theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: `0 ${theme.spacing.insetXl}`,
      height: "calc(100% - 0.625rem)",
      borderRadius: theme.radius.pill,
      marginLeft: theme.spacing.lg,
      fontWeight: 800,
      fontSize: "0.75rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      display: isMobile ? "none" : "flex",
      alignItems: "center",
      transition: "background 0.15s",
      flexShrink: 0,
      textDecoration: "none",
    },

    /* ── Mobile: fixed bar at top ── */
    mobileBar: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${theme.spacing.xl}`,

      height: "4rem",
      background: menuOpen
        ? "oklch(18.97% 0.008 107.13 / 0.97)"
        : "oklch(18.97% 0.008 107.13 / 0.82)",
      backdropFilter: "blur(20px) saturate(1.4)",
      borderBottom: "1px solid oklch(100% 0 0 / 0.08)",
    },
    mobileBarLogo: {
      fontWeight: 800,
      fontSize: "1rem",
      color: "oklch(100% 0 0)",
      letterSpacing: "-0.025em",
      flex: "1 1 auto",
    },
    mobileCta: {
      display: "none",
    },
    hamburger: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.sm,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "oklch(100% 0 0)",
      marginLeft: theme.spacing.md,
    },
    mobileMenu: {
      position: "fixed",
      top: "4rem",
      left: 0,
      right: 0,
      zIndex: 49,
      overflow: "hidden",
      background: "oklch(18.97% 0.008 107.13 / 0.95)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid oklch(100% 0 0 / 0.08)",
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
      color: "oklch(88% 0 0)",
    },
    mobileCtaFull: {
      background: theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.pill,
      fontWeight: 900,
      fontSize: "0.875rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      textAlign: "center",
      display: "block",
    },
  };

  return (
    <>
      {/* Desktop floating pill */}
      <nav
        aria-label="Site navigation"
        className={isMobile ? undefined : "site-nav-vt"}
        style={styles.pill}
      >
        <TransitionLink to="/" style={styles.pillLogo}>
          {logoText}
        </TransitionLink>
        <GoogleAuthGate>
          <div style={styles.pillDivider} />
          {navItems.map((item) => (
            <SiteNavLink
              key={item.name}
              href={item.href}
              style={hovLink === item.name ? styles.pillLinkHover : styles.pillLink}
              onMouseEnter={() => setHovLink(item.name)}
              onMouseLeave={() => setHovLink(null)}
            >
              {item.name}
            </SiteNavLink>
          ))}
          <SiteNavLink
            href={createLink}
            style={hovLink === "Creative" ? styles.pillLinkHover : styles.pillLink}
            onMouseEnter={() => setHovLink("Creative")}
            onMouseLeave={() => setHovLink(null)}
          >
            Creative
          </SiteNavLink>
        </GoogleAuthGate>
        <SiteNavLink
          className="pill-cta"
          href={ctaHref}
          style={styles.pillCta}
          onMouseEnter={() => setHovBtn(true)}
          onMouseLeave={() => setHovBtn(false)}
          onClick={() =>
            posthog?.capture("nav_cta_clicked", {
              variant: "dark-floating-pill",
              cta_text: ctaText,
            })
          }
        >
          {ctaText}
        </SiteNavLink>
      </nav>

      {/* Mobile fixed bar */}
      <nav
        aria-label="Site navigation"
        className={isMobile ? "site-nav-vt" : undefined}
        style={styles.mobileBar}
      >
        <span style={styles.mobileBarLogo}>{logoText}</span>
        <SiteNavLink
          href={ctaHref}
          style={styles.mobileCta}
          onClick={() =>
            posthog?.capture("nav_cta_clicked", {
              variant: "dark-floating-pill",
              cta_text: ctaText,
              location: "mobile",
            })
          }
        >
          {ctaText}
        </SiteNavLink>
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <Xmark width={22} height={22} aria-hidden />
          ) : (
            <Menu width={22} height={22} aria-hidden />
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu — isMobile guard removed; hamburger only appears on mobile so menuOpen is only ever true on mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
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
                style={styles.mobileCtaFull}
                onClick={() => {
                  posthog?.capture("nav_cta_clicked", {
                    variant: "dark-floating-pill",
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
    </>
  );
};
