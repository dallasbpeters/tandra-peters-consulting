import { usePostHog } from "@posthog/react";
import { Menu, Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useIsMobile } from "../hooks/isMobile";
import { isInPageHashHref } from "../hooks/useSiteNav";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import type { NavProps } from "../types";
import { GoogleAuthGate } from "./GoogleAuthGate";
import { TransitionLink } from "./TransitionLink";

export const Nav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  imageSrc = "/tandra.png",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "Testimonials", href: "#testimonials" },
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
}) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  const offHomeNavTo = (href: string) =>
    href.startsWith("#") ? { pathname: "/" as const, hash: href } : href;
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
          document.getElementById(id)?.scrollIntoView({
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
      padding: `${theme.spacing.md} ${theme.spacing.xxl}`,
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "0.875rem",
      marginInlineStart: "auto",
    },
    nav: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      transition: "all 0.5s",
      paddingTop: isScrolled ? theme.spacing.lg : theme.spacing.xxl,
      paddingBottom: isScrolled ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: (() => {
        if (isScrolled) {
          return "rgba(255, 255, 255, 0.8)";
        }
        if (isMobile) {
          return "rgba(255, 255, 255, 1)";
        }
        return "rgba(255, 255, 255, 0)";
      })(),
      backdropFilter: isScrolled ? "blur(20px)" : "none",
      boxShadow: isScrolled ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
      overflowX: "clip",
    },

    logo: {
      minWidth: 0,
    },
    image: {
      minInlineSize: isMobile ? "2rem" : "3rem",
      minBlockSize: isMobile ? "2rem" : "3rem",
      maxInlineSize: isMobile ? "2rem" : "3rem",
      maxBlockSize: isMobile ? "2rem" : "3rem",
      objectFit: "cover",
      borderRadius: theme.radius.pill,
      gridArea: "image",
      overflow: "hidden",
    },

    logoText: {
      fontSize: isMobile ? "0.95rem" : "1.15rem",
      fontWeight: 900,
      letterSpacing: "0.01em",
      gridArea: "text",
      fontFamily: theme.fonts.headline,
      color: (() => {
        if (isScrolled) {
          return theme.colors.everglade;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.white;
      })(),
      textDecoration: "none",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    logoTagline: {
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      gridArea: "tagline",
      display: isMobile ? "none" : "block",
      textTransform: "uppercase",
      fontFamily: theme.fonts.headline,
      color: (() => {
        if (isScrolled) {
          return theme.colors.everglade;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.purple;
      })(),
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    navLink: {
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      letterSpacing: "0.1em",
      fontSize: "0.875rem",
      opacity: 0.6,
      textDecoration: "none",
      color: (() => {
        if (isScrolled) {
          return theme.colors.black;
        }
        if (isMobile) {
          return theme.colors.black;
        }
        return theme.colors.white;
      })(),
      transition: "opacity 0.2s",
    },
  };

  return (
    <nav className="site-nav-vt" style={styles.nav}>
      <div
        className={layoutClass.containerWideRow}
        style={{
          width: "100%",
          maxWidth: 1300,
          boxSizing: "border-box",
          paddingInline: isMobile ? theme.spacing.lg : theme.spacing.xxl,
          gap: isMobile ? theme.spacing.sm : theme.spacing.md,
          overflowX: "clip",
          placeItems: "stretch",
        }}
      >
        <TransitionLink
          className="logo-link nav-focusable nav-logo"
          style={{
            textDecoration: "none",
            flex: "1 1 auto",
            minWidth: 0,
            marginRight: isMobile ? theme.spacing.xs : theme.spacing.sm,
          }}
          to="/"
        >
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -20 }}
            style={{ display: "contents" }}
          >
            <img
              alt=""
              height="3rem"
              src={imageSrc}
              style={styles.image}
              width="auto"
            />
            <span style={styles.logoText}>{logoText}</span>
            {isMobile ? null : (
              <span style={styles.logoTagline}>{logoTagline}</span>
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
            @media (max-width: 1000px) {
              .md-flex { display: none !important; }

            }
          `}</style>
          <GoogleAuthGate>
            {navItems.map((item, i) =>
              isHome && isInPageHashHref(item.href) ? (
                <motion.a
                  animate={{ opacity: 1, y: 0 }}
                  className="nav-focusable"
                  href={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  key={item.href}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.6";
                  }}
                  style={styles.navLink}
                  tabIndex={0}
                  transition={{
                    delay: i * 0.05,
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                >
                  {item.name}
                </motion.a>
              ) : (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: -10 }}
                  key={item.href}
                  style={{ display: "inline-block" }}
                  transition={{
                    delay: isHome ? i * 0.05 : i * 0.1,
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                >
                  <TransitionLink
                    className="nav-focusable"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.6";
                    }}
                    style={styles.navLink}
                    to={offHomeNavTo(item.href)}
                    viewTransition
                  >
                    {item.name}
                  </TransitionLink>
                </motion.div>
              )
            )}
          </GoogleAuthGate>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? theme.spacing.sm : theme.spacing.lg,
            flex: "0 0 auto",
            justifyContent: "flex-end",
          }}
        >
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
          <button
            aria-controls="site-mobile-nav"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className="md-hidden nav-focusable"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              display: "none",
              padding: theme.spacing.sm,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: (() => {
                if (isScrolled) {
                  return "black";
                }
                if (isMobile) {
                  return "black";
                }
                return "white";
              })(),
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
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            id="site-mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            style={{
              overflow: "hidden",
            }}
            transition={{
              type: "spring",
              mass: 0.5,
              damping: 20,
              stiffness: 300,
            }}
          >
            <div
              style={{
                padding: theme.spacing.xxl,
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.lg,
              }}
            >
              {navItems.map((item, _i) =>
                isHome && isInPageHashHref(item.href) ? (
                  <a
                    className="nav-focusable"
                    href={item.href}
                    key={item.href}
                    onClick={handleMobileNavClick(item.href)}
                    style={{
                      fontFamily: theme.fonts.headline,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      color: theme.colors.everglade,
                    }}
                  >
                    {item.name}
                  </a>
                ) : (
                  <TransitionLink
                    className="nav-focusable"
                    key={item.href}
                    onClick={handleMobileSectionLinkClose}
                    style={{
                      fontFamily: theme.fonts.headline,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      color: theme.colors.everglade,
                    }}
                    to={offHomeNavTo(item.href)}
                    viewTransition
                  >
                    {item.name}
                  </TransitionLink>
                )
              )}
              {isHome ? (
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
                    width: "100%",
                    textAlign: "center",
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
                    width: "100%",
                    textAlign: "center",
                  }}
                  to={{ pathname: "/", hash: ctaHref }}
                >
                  {ctaText}
                </TransitionLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
