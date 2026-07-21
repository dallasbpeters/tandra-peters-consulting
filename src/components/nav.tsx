import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useIsMobile } from "../hooks/is-mobile";
import { isInPageHashHref } from "../hooks/use-site-nav";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { NavItem, NavProps } from "../types";
import { GoogleAuthGate } from "./google-auth-gate";
import { OverflowNav } from "./nav/overflow-nav";
import { SiteNavLink } from "./nav/site-nav-link";
import { TransitionLink } from "./transition-link";

export const Nav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  navItems = [
    { href: "#services", name: "services" },
    { href: "#testimonials", name: "testimonials" },
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  hideCta = false,
}) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  const offHomeNavTo = (href: string) =>
    href.startsWith("#") ? { hash: href, pathname: "/" as const } : href;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const handleMobileNavClick =
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isHome) {
        setIsMobileMenuOpen(false);
        return;
      }
      if (href.startsWith("#") && href !== "#") {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        const id = href.slice(1);
        window.setTimeout(() => {
          document.querySelector(`#${id}`)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          window.history.replaceState(null, "", href);
        }, 200);
        return;
      }
      setIsMobileMenuOpen(false);
    };

  const handleMobileSectionLinkClose = () => {
    setIsMobileMenuOpen(false);
  };

  const isMobile = useIsMobile();
  const styles: Record<string, CSSProperties> = {
    button: {
      backgroundColor: theme.colors.evergladeLight,
      color: theme.colors.white,
      fontFamily: theme.fonts.headline,
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      marginInlineStart: "auto",
      maxInlineSize: "18rem",
      overflow: "hidden",
      padding: `${theme.spacing.md} ${theme.spacing.xxl}`,
      textOverflow: "ellipsis",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    image: {
      borderRadius: theme.radius.pill,
      gridArea: "image",
      maxBlockSize: isMobile ? "2rem" : "3rem",
      maxInlineSize: isMobile ? "2rem" : "3rem",
      minBlockSize: isMobile ? "2rem" : "3rem",
      minInlineSize: isMobile ? "2rem" : "3rem",
      objectFit: "cover",
      overflow: "hidden",
    },
    logo: {
      minWidth: 0,
    },
    logoTagline: {
      color: (() => {
        if (isScrolled) {
          return theme.colors.everglade;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.purple;
      })(),
      display: isMobile ? "none" : "block",
      fontFamily: theme.fonts.headline,
      fontSize: "11px",
      fontWeight: 700,
      gridArea: "tagline",
      letterSpacing: "0.1em",
      overflow: "hidden",
      textOverflow: "ellipsis",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    logoText: {
      color: (() => {
        if (isScrolled) {
          return theme.colors.everglade;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.white;
      })(),
      fontFamily: theme.fonts.headline,
      fontSize: isMobile ? "0.95rem" : "1.15rem",
      fontWeight: 900,
      gridArea: "text",
      letterSpacing: "0.01em",
      overflow: "hidden",
      textDecoration: "none",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    nav: {
      backdropFilter: isScrolled ? "blur(20px)" : "none",
      backgroundColor: (() => {
        if (isScrolled) {
          return "rgba(255, 255, 255, 0.8)";
        }
        if (isMobile) {
          return "rgba(255, 255, 255, 1)";
        }
        return "rgba(255, 255, 255, 0)";
      })(),
      boxShadow: isScrolled ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
      left: 0,
      overflowX: "clip",
      paddingBottom: isScrolled ? theme.spacing.lg : theme.spacing.xxl,
      paddingTop: isScrolled ? theme.spacing.lg : theme.spacing.xxl,
      position: "fixed",
      right: 0,
      top: 0,
      transition: "all 0.5s",
      zIndex: 50,
    },
    navLink: {
      color: (() => {
        if (isScrolled) {
          return theme.colors.black;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.white;
      })(),
      fontFamily: theme.fonts.headline,
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      maxWidth: "12rem",
      opacity: 0.6,
      overflow: "hidden",
      textDecoration: "none",
      textOverflow: "ellipsis",
      transition: "opacity 0.2s",
      whiteSpace: "nowrap",
    },
    overflowMenu: {
      background: theme.colors.white,
      border: "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: theme.radius.large,
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
    },
    overflowMenuLink: {
      borderRadius: theme.radius.medium,
      color: theme.colors.black,
      display: "block",
      fontFamily: theme.fonts.headline,
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      maxWidth: "16rem",
      overflow: "hidden",
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      textDecoration: "none",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      width: "100%",
    },
  };

  const renderControlLink = (item: NavItem, context: "inline" | "menu") => {
    if (context === "menu") {
      return (
        <SiteNavLink
          className="site-nav-menu-link"
          href={item.href}
          style={styles.overflowMenuLink}
        >
          {item.name}
        </SiteNavLink>
      );
    }
    return (
      <SiteNavLink
        className="site-nav-inline-link"
        href={item.href}
        onMouseEnter={(event) => {
          event.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = "0.6";
        }}
        style={styles.navLink}
      >
        {item.name}
      </SiteNavLink>
    );
  };

  return (
    <nav className="site-nav-vt" style={styles.nav}>
      <div
        className={layoutClass.containerWideRow}
        style={{
          boxSizing: "border-box",
          gap: isMobile ? theme.spacing.sm : theme.spacing.md,
          maxWidth: 1300,
          overflowX: "clip",
          paddingInline: isMobile ? theme.spacing.lg : theme.spacing.xxl,
          placeItems: "stretch",
          width: "100%",
        }}
      >
        <TransitionLink
          className="logo-link nav-focusable nav-logo"
          style={{
            flex: "1 1 auto",
            marginRight: isMobile ? theme.spacing.xs : theme.spacing.sm,
            minWidth: 0,
            textDecoration: "none",
          }}
          to="/"
        >
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -20 }}
            style={{ display: "contents" }}
          >
            <span className="site-nav-logo-text" style={styles.logoText}>
              {logoText}
            </span>
            {isMobile ? null : (
              <span
                className="site-nav-logo-tagline"
                style={styles.logoTagline}
              >
                {logoTagline}
              </span>
            )}
          </motion.div>
        </TransitionLink>

        <div className="md-flex nav-desktop-nav">
          <style>{`
            .nav-focusable:focus-visible {
              outline: 2px solid ${theme.colors.everglade} !important;
              outline-offset: 3px;
              border-radius: ${theme.radius.small};
            }
            @media (max-width: 768px) {
              .md-flex { display: none !important; }

            }
          `}</style>
          <GoogleAuthGate>
            <OverflowNav
              align="center"
              containerStyle={{ flex: "1 1 auto", width: "100%" }}
              gap={Number.parseFloat(theme.spacing.xl) * 16}
              items={navItems}
              menuStyle={styles.overflowMenu}
              moreButtonStyle={{ color: styles.navLink.color }}
              renderItem={renderControlLink}
            />
          </GoogleAuthGate>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: "0 0 auto",
            gap: isMobile ? theme.spacing.sm : theme.spacing.lg,
            justifyContent: "flex-end",
          }}
        >
          {hideCta ? null : (
            <motion.a
              animate={{ opacity: 1, scale: 1 }}
              className="nav-focusable hidden lg:block"
              href={ctaHref}
              initial={{ opacity: 0, scale: 0.9 }}
              onClick={() =>
                posthog?.capture("nav_cta_clicked", {
                  cta_text: ctaText,
                  location: "desktop",
                })
              }
              style={styles.button}
              whileHover={{ backgroundColor: "#715eec" }}
            >
              {ctaText}
            </motion.a>
          )}
          <button
            aria-controls="site-mobile-nav"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className="md-hidden nav-focusable site-nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: "none",
              border: "none",
              color: (() => {
                if (isScrolled) {
                  return "black";
                }
                if (isMobile) {
                  return "black";
                }
                return "white";
              })(),
              cursor: "pointer",
              display: "none",
              padding: theme.spacing.sm,
            }}
            type="button"
          >
            <style>{`
              @media (max-width: 768px) {
                .md-hidden { display: block !important; }
                .hidden.lg\\:block { display: none !important; }
              }
            `}</style>
            {isMobileMenuOpen ? (
              <Xmark aria-hidden height={24} width={24} />
            ) : (
              <Menu aria-hidden height={24} width={24} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            id="site-mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            style={{
              overflow: "hidden",
            }}
            transition={{
              damping: 20,
              mass: 0.5,
              stiffness: 300,
              type: "spring",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.lg,
                padding: theme.spacing.xxl,
              }}
            >
              {navItems.map((item, _i) =>
                isHome && isInPageHashHref(item.href) ? (
                  <a
                    className="nav-focusable site-nav-mobile-link"
                    href={item.href}
                    key={item.href}
                    onClick={handleMobileNavClick(item.href)}
                    style={{
                      color: theme.colors.everglade,
                      fontFamily: theme.fonts.headline,
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.name}
                  </a>
                ) : (
                  <TransitionLink
                    className="nav-focusable site-nav-mobile-link"
                    key={item.href}
                    onClick={handleMobileSectionLinkClose}
                    style={{
                      color: theme.colors.everglade,
                      fontFamily: theme.fonts.headline,
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                    to={offHomeNavTo(item.href)}
                    viewTransition
                  >
                    {item.name}
                  </TransitionLink>
                )
              )}
              {!hideCta &&
                (isHome ? (
                  <a
                    className="nav-focusable"
                    href={ctaHref}
                    onClick={(e) => {
                      posthog?.capture("nav_cta_clicked", {
                        cta_text: ctaText,
                        location: "mobile",
                      });
                      handleMobileNavClick(ctaHref)(e);
                    }}
                    style={{
                      ...styles.button,
                      fontSize: "0.75rem",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    {ctaText}
                  </a>
                ) : (
                  <TransitionLink
                    className="nav-focusable"
                    onClick={() => {
                      posthog?.capture("nav_cta_clicked", {
                        cta_text: ctaText,
                        location: "mobile",
                      });
                      handleMobileSectionLinkClose();
                    }}
                    style={{
                      ...styles.button,
                      fontSize: "0.75rem",
                      textAlign: "center",
                      width: "100%",
                    }}
                    to={{ hash: ctaHref, pathname: "/" }}
                  >
                    {ctaText}
                  </TransitionLink>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
