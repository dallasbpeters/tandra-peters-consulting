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

/** Floating pill nav on desktop; compact fixed bar with hamburger on mobile. */
export const NavPillNav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  navItems = [
    { href: "#services", name: "services" },
    { href: "#about", name: "about" },
    { href: "#testimonials", name: "Reviews" },
  ],
  ctaText = "Book Now",
  ctaHref = "#contact",
  hideCta = false,
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile(1024);
  const [scrollY, setScrollY] = useState(0);
  const [hovLink, setHovLink] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrolled = scrollY > 60;

  const styles: Record<string, CSSProperties> = {
    hamburger: {
      alignItems: "center",
      background: "none",
      border: "none",
      color: "oklch(100% 0 0)",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      marginLeft: theme.spacing.md,
      padding: theme.spacing.sm,
    },

    /* ── Mobile: fixed bar at top ── */
    mobileBar: {
      alignItems: "center",
      backdropFilter: "blur(20px) saturate(1.4)",
      background: menuOpen
        ? "oklch(18.97% 0.008 107.13 / 0.97)"
        : "oklch(18.97% 0.008 107.13 / 0.82)",
      borderBottom: "1px solid oklch(100% 0 0 / 0.08)",
      display: isMobile ? "flex" : "none",
      height: "4rem",
      justifyContent: "space-between",
      left: 0,
      padding: `0 ${theme.spacing.xl}`,
      position: "fixed",
      right: 0,
      top: 0,
      zIndex: 50,
    },
    mobileBarLogo: {
      color: "oklch(100% 0 0)",
      flex: "1 1 auto",
      fontSize: "1rem",
      fontWeight: 800,
      letterSpacing: "-0.025em",
    },
    mobileCta: {
      display: "none",
    },
    mobileCtaFull: {
      background: theme.colors.accentLight,
      borderRadius: theme.radius.pill,
      color: theme.colors.everglade,
      display: "block",
      fontSize: "0.875rem",
      fontWeight: 900,
      letterSpacing: "0.1em",
      padding: theme.spacing.lg,
      textAlign: "center",
      textDecoration: "none",
      textTransform: "uppercase",
    },

    mobileLink: {
      color: "oklch(88% 0 0)",
      fontFamily: theme.fonts.headline,
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textDecoration: "none",
      textTransform: "uppercase",
    },
    mobileMenu: {
      backdropFilter: "blur(20px)",
      background: "oklch(18.97% 0.008 107.13 / 0.95)",
      borderBottom: "1px solid oklch(100% 0 0 / 0.08)",
      left: 0,
      overflow: "hidden",
      position: "fixed",
      right: 0,
      top: "4rem",
      zIndex: 49,
    },
    mobileMenuInner: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
      padding: theme.spacing.xxl,
    },
    overflowMenu: {
      backdropFilter: "blur(20px) saturate(1.4)",
      background: "oklch(18.97% 0.008 107.13 / 0.97)",
      border: "1px solid oklch(100% 0 0 / 0.1)",
      borderRadius: theme.radius.large,
      boxShadow: "0 8px 32px oklch(0% 0 0 / 0.35)",
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
    },
    overflowMenuLink: {
      borderRadius: theme.radius.medium,
      color: "oklch(88% 0 0)",
      display: "block",
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      textDecoration: "none",
      width: "100%",
    },
    overflowMore: {
      borderRadius: theme.radius.pill,
      color: "oklch(100% 0 0)",
      height: "100%",
    },
    /* ── Desktop: floating pill ── */
    pill: {
      alignItems: "center",
      backdropFilter: "blur(24px) saturate(1.5)",
      background: scrolled
        ? "oklch(18.97% 0.008 107.13 / 0.95)"
        : "oklch(18.97% 0.008 107.13 / 0.75)",
      border: "1px solid oklch(100% 0 0 / 0.1)",
      borderRadius: theme.radius.pill,
      boxShadow: scrolled
        ? "0 8px 32px oklch(0% 0 0 / 0.35)"
        : "0 4px 16px oklch(0% 0 0 / 0.2)",
      display: isMobile ? "none" : "flex",
      height: scrolled ? "3rem" : "3.5rem",
      justifyContent: "space-between",
      left: "50%",
      minInlineSize: "90vw",
      padding: `0 ${theme.spacing.sm} 0 ${theme.spacing.xl}`,
      position: "fixed",
      top: scrolled ? "1rem" : "1.75rem",
      transform: "translateX(-50%)",
      transition: "top 0.3s, height 0.3s, background 0.3s, box-shadow 0.3s",
      whiteSpace: "nowrap",
      zIndex: 50,
    },
    pillCta: {
      alignItems: "center",
      background: hovBtn ? theme.colors.accent : theme.colors.accentLight,
      borderRadius: theme.radius.pill,
      color: theme.colors.everglade,
      display: isMobile ? "none" : "flex",
      flexShrink: 0,
      fontSize: "0.75rem",
      fontWeight: 800,
      height: "calc(100% - 0.625rem)",
      letterSpacing: "0.1em",
      marginLeft: theme.spacing.lg,
      padding: `0 ${theme.spacing.insetXl}`,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s",
    },
    pillDivider: {
      background: "oklch(100% 0 0 / 0.15)",
      flexShrink: 0,
      height: "1.25rem",
      marginRight: theme.spacing.xxxxl,
      width: "1px",
    },
    pillLink: {
      alignItems: "center",
      color: "rgba(200,210,205,0.85)",
      display: "flex",
      fontSize: "0.8125rem",
      fontWeight: 600,
      height: "100%",
      letterSpacing: "0.04em",
      padding: `0 ${theme.spacing.lg}`,
      textDecoration: "none",
      transition: "color 0.15s",
    },
    pillLinkHover: {
      alignItems: "center",
      color: "oklch(100% 0 0)",
      display: "flex",
      fontSize: "0.8125rem",
      fontWeight: 600,
      height: "100%",
      letterSpacing: "0.04em",
      padding: `0 ${theme.spacing.lg}`,
      textDecoration: "none",
      transition: "color 0.15s",
    },
    pillLogo: {
      color: "oklch(100% 0 0)",
      flexShrink: 0,
      fontSize: "0.9375rem",
      fontWeight: 800,
      letterSpacing: "-0.025em",
      marginRight: theme.spacing.xxxxl,
    },
  };

  const pillItems: NavItem[] = [...navItems];

  const renderPillLink = (item: NavItem, context: "inline" | "menu") => (
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
        return hovLink === item.name ? styles.pillLinkHover : styles.pillLink;
      })()}
    >
      {item.name}
    </SiteNavLink>
  );

  return (
    <>
      {/* Desktop floating pill */}
      <nav
        aria-label="Site navigation"
        className={isMobile ? undefined : "site-nav-vt nav-pill"}
        style={styles.pill}
      >
        <TransitionLink style={styles.pillLogo} to="/">
          {logoText}
        </TransitionLink>
        <GoogleAuthGate>
          <div style={styles.pillDivider} />
          <OverflowNav
            containerStyle={{ flex: "1 1 auto", height: "100%" }}
            gap={0}
            items={pillItems}
            menuStyle={styles.overflowMenu}
            moreButtonStyle={styles.overflowMore}
            renderItem={renderPillLink}
          />
        </GoogleAuthGate>
        {hideCta ? null : (
          <SiteNavLink
            className="pill-cta"
            href={ctaHref}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                cta_text: ctaText,
                variant: "dark-floating-pill",
              })
            }
            onMouseEnter={() => setHovBtn(true)}
            onMouseLeave={() => setHovBtn(false)}
            style={styles.pillCta}
          >
            {ctaText}
          </SiteNavLink>
        )}
      </nav>

      {/* Mobile fixed bar */}
      <nav
        aria-label="Site navigation"
        className={isMobile ? "site-nav-vt" : undefined}
        style={styles.mobileBar}
      >
        <span style={styles.mobileBarLogo}>{logoText}</span>
        {hideCta ? null : (
          <SiteNavLink
            href={ctaHref}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                cta_text: ctaText,
                location: "mobile",
                variant: "dark-floating-pill",
              })
            }
            style={styles.mobileCta}
          >
            {ctaText}
          </SiteNavLink>
        )}
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen(!menuOpen)}
          style={styles.hamburger}
          type="button"
        >
          {menuOpen ? (
            <Xmark aria-hidden height={22} width={22} />
          ) : (
            <Menu aria-hidden height={22} width={22} />
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu — isMobile guard removed; hamburger only appears on mobile so menuOpen is only ever true on mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
            style={styles.mobileMenu}
            transition={{ duration: 0.18, ease: "easeOut" }}
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
                      variant: "dark-floating-pill",
                    });
                    setMenuOpen(false);
                  }}
                  style={styles.mobileCtaFull}
                >
                  {ctaText}
                </SiteNavLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
