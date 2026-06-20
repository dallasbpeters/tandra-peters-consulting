import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { useIsMobile } from "../../hooks/is-mobile";
import { mix, theme } from "../../theme";
import type { NavProps } from "../../types";
import { GoogleAuthGate } from "../google-auth-gate";
import { SiteNavLink } from "../nav/site-nav-link";
import { TransitionLink } from "../transition-link";

/** Glass-overlay nav: centered logo, split links left/right, pill CTA. Transparent → dark glass on scroll. */
export const NavGlassOverlay: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  navItems = [
    { href: "#services", name: "services" },
    { href: "#about", name: "about" },
    { href: "#testimonials", name: "Reviews" },
    { href: "#contact", name: "contact" },
  ],
  ctaText = "Book Consult",
  ctaHref = "#contact",
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
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

  const ctaBackground = glassed
    ? theme.colors.heroAccent
    : theme.colors.everglade;

  const styles: Record<string, CSSProperties> = {
    cta: {
      background: hovBtn ? theme.colors.accent : ctaBackground,
      borderRadius: theme.radius.pill,
      color: theme.colors.white,
      display: isMobile ? "none" : "inline-flex",
      flexShrink: 0,
      fontSize: "0.75rem",
      fontWeight: 800,
      letterSpacing: "0.1em",
      padding: `${theme.spacing.sm} ${theme.spacing.insetXl}`,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s",
    },
    hamburger: {
      alignItems: "center",
      background: "none",
      border: "none",
      color: glassed || menuOpen ? theme.colors.white : theme.colors.everglade,
      cursor: "pointer",
      display: isMobile ? "flex" : "none",
      flexShrink: 0,
      justifyContent: "end",
      padding: theme.spacing.sm,
    },
    link: {
      color: glassed ? theme.colors.white : theme.colors.everglade,
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "color 0.15s",
    },
    linkGroupLeft: {
      alignItems: "center",
      display: isMobile ? "none" : "flex",
      flexGrow: 1,
      gap: theme.spacing.xxxl,
      justifyContent: isMobile ? "start" : "center",
    },
    linkGroupRight: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.xxxl,
      justifyContent: "end",
      marginLeft: "auto",
    },
    linkHover: {
      color: glassed ? theme.colors.heroAccent : theme.colors.evergladeMuted,
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "color 0.15s",
    },
    logo: {
      alignItems: "start",
      display: "flex",
      flex: isMobile ? "1 1 auto" : "none",
      flexDirection: "column",
      flexShrink: 0,
      position: "relative",
      userSelect: "none",
    },
    logoTagline: {
      color: glassed ? theme.colors.heroAccent : theme.colors.everglade,
      display: isMobile ? "none" : "block",
      fontSize: "0.625rem",
      fontWeight: 700,
      letterSpacing: "0.25em",
      marginTop: theme.spacing.xs,
      textTransform: "uppercase",
      transition: "color 0.35s",
    },
    logoText: {
      color: glassed || menuOpen ? theme.colors.white : theme.colors.everglade,
      fontSize: isMobile ? "1.2rem" : "1.25rem",
      fontWeight: 800,
      letterSpacing: "-0.03em",
      lineHeight: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    mobileCta: {
      background: theme.colors.accentLight,
      borderRadius: theme.radius.pill,
      color: theme.colors.everglade,
      display: "block",
      fontSize: "1.1em",
      fontWeight: 900,
      letterSpacing: "0.1em",
      padding: theme.spacing.lg,
      textAlign: "center",
      textDecoration: "none",
      textTransform: "uppercase",
      width: "100%",
    },
    mobileLink: {
      color: "oklch(88% 0 0)",
      fontFamily: theme.fonts.headline,
      fontSize: "1rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      paddingBlock: theme.spacing.lg,
      textDecoration: "none",
      textTransform: "uppercase",
    },
    mobileMenu: {
      overflow: "hidden",
    },
    mobileMenuInner: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
      padding: `${theme.spacing.xxl} ${theme.spacing.xxxxl}`,
    },
    nav: {
      backdropFilter: glassed || menuOpen ? "blur(20px) saturate(1.3)" : "none",
      background:
        glassed || menuOpen
          ? theme.colors.everglade
          : mix(theme.colors.white, 50),
      borderBottom: glassed
        ? "1px solid oklch(100% 0 0 / 0.08)"
        : "1px solid transparent",
      left: 0,
      position: "fixed",
      right: 0,
      top: 0,
      transition: "background 0.35s, backdrop-filter 0.35s, border-color 0.35s",
      zIndex: 50,
    },
    navInner: {
      display: "flex",
      flexGrow: 1,
      height: "5rem",
      padding: `0 ${theme.spacing.xxxxl}`,
      placeItems: "center stretch",
      position: "relative",
    },
  };

  return (
    <nav
      aria-label="Site navigation"
      className="site-nav-vt"
      style={styles.nav}
    >
      <div style={styles.navInner}>
        {/* Centered logo */}
        <TransitionLink
          className="logo"
          style={{ ...styles.logo, textDecoration: "none" }}
          to="/"
        >
          <span style={styles.logoText}>{logoText}</span>
          <span style={styles.logoTagline}>{logoTagline}</span>
        </TransitionLink>
        <GoogleAuthGate>
          <div style={styles.linkGroupLeft}>
            {leftLinks.map((item) => (
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
            {rightLinks.map((item) => (
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

        {/* Right links + CTA — logo is absolute-centered so this group doesn't skew it */}
        <div style={styles.linkGroupRight}>
          <SiteNavLink
            href={ctaHref}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                cta_text: ctaText,
                variant: "glass-overlay",
              })
            }
            onMouseEnter={() => setHovBtn(true)}
            onMouseLeave={() => setHovBtn(false)}
            style={styles.cta}
          >
            {ctaText}
          </SiteNavLink>
        </div>
        <GoogleAuthGate>
          {/* Hamburger — mobile only */}
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
              <SiteNavLink
                href={ctaHref}
                onClick={() => {
                  posthog?.capture("nav_cta_clicked", {
                    cta_text: ctaText,
                    location: "mobile",
                    variant: "glass-overlay",
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
