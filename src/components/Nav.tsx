import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { TransitionLink } from "./TransitionLink";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Xmark } from "iconoir-react";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { NavProps } from "../types";
import { usePostHog } from "@posthog/react";
import { useIsMobile } from "../hooks/isMobile";
import type { CSSProperties } from "react";

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
      padding: "0.75rem 1.5rem",
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
      paddingTop: isScrolled ? "1rem" : "1.5rem",
      paddingBottom: isScrolled ? "1rem" : "1.5rem",
      backgroundColor: isScrolled
        ? "rgba(255, 255, 255, 0.8)"
        : isMobile
          ? "rgba(255, 255, 255, 1)"
          : "rgba(255, 255, 255, 0)",
      backdropFilter: isScrolled ? "blur(20px)" : "none",
      boxShadow: isScrolled ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
      overflowX: "clip",
    },

    logo: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0, 1fr)",
      gridTemplateAreas: isMobile
        ? `"image text"`
        : `"image text" "image tagline"`,
      alignItems: "center",
      gap: "0 0.5rem",
      minWidth: 0,
    },
    image: {
      minInlineSize: isMobile ? "2rem" : "3rem",
      minBlockSize: isMobile ? "2rem" : "3rem",
      maxInlineSize: isMobile ? "2rem" : "3rem",
      maxBlockSize: isMobile ? "2rem" : "3rem",
      objectFit: "cover",
      borderRadius: "9999px",
      gridArea: "image",
      overflow: "hidden",
    },

    logoText: {
      fontSize: isMobile ? "0.95rem" : "1.15rem",
      fontWeight: 900,
      letterSpacing: "0.01em",
      gridArea: "text",
      fontFamily: theme.fonts.headline,
      color: isScrolled
        ? theme.colors.everglade
        : isMobile
          ? theme.colors.black
          : theme.colors.white,
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
      color: isScrolled
        ? theme.colors.everglade
        : isMobile
          ? theme.colors.black
          : theme.colors.purple,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    desktopNav: {
      display: "none",
      alignItems: "center",
      gap: "1.5rem",
      justifyContent: "center",
    },

    navLink: {
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      letterSpacing: "0.1em",
      fontSize: "0.875rem",
      opacity: 0.6,
      textDecoration: "none",
      color: isScrolled
        ? theme.colors.black
        : isMobile
          ? theme.colors.black
          : theme.colors.white,
      transition: "opacity 0.2s",
    },
  };

  return (
    <nav style={styles.nav} className="site-nav-vt">
      <div
        className={layoutClass.containerWideRow}
        style={{
          width: "100%",
          maxWidth: 1300,
          boxSizing: "border-box",
          paddingInline: isMobile ? "1rem" : "1.5rem",
          gap: isMobile ? "0.5rem" : "0.75rem",
          overflowX: "clip",
          placeItems: "stretch",
        }}
      >
        <TransitionLink
          to="/"
          className="logo-link nav-focusable"
          style={{
            ...styles.logo,
            textDecoration: "none",
            flex: "1 1 auto",
            minWidth: 0,
            marginRight: isMobile ? "0.25rem" : "0.5rem",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: "contents" }}
          >
            <img src={imageSrc} alt="" style={styles.image} height="3rem" width="auto" />
            <span style={styles.logoText}>{logoText}</span>
            {isMobile ? null : (
              <span style={styles.logoTagline}>{logoTagline}</span>
            )}
          </motion.div>
        </TransitionLink>

        <div
          style={{ ...styles.desktopNav, display: "flex" }}
          className="md-flex"
        >
          <style>{`
            .nav-focusable:focus-visible {
              outline: 2px solid ${theme.colors.everglade} !important;
              outline-offset: 3px;
              border-radius: 0.25rem;
            }
            @media (max-width: 1000px) {
              .md-flex { display: none !important; }

            }
          `}</style>
          {navItems.map((item, i) =>
            isHome ? (
              <motion.a
                key={i}
                href={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                tabIndex={0}
                style={styles.navLink}
                className="nav-focusable"
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.6";
                }}
              >
                {item.name}
              </motion.a>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ display: "inline-block" }}
              >
                <TransitionLink
                  to={offHomeNavTo(item.href)}
                  viewTransition
                  style={styles.navLink}
                  className="nav-focusable"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.6";
                  }}
                >
                  {item.name}
                </TransitionLink>
              </motion.div>
            ),
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "0.5rem" : "1rem",
            flex: "0 0 auto",
            justifyContent: "flex-end",
          }}
        >
          <motion.a
            href={ctaHref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.button}
            className="hidden lg:block nav-focusable"
            whileHover={{ backgroundColor: "#715eec" }}
            onClick={() =>
              posthog?.capture("nav_cta_clicked", {
                cta_text: ctaText,
                location: "desktop",
              })
            }
          >
            {ctaText}
          </motion.a>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="site-mobile-nav"
            style={{
              display: "none",
              padding: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isScrolled ? "black" : isMobile ? "black" : "white",
            }}
            className="md-hidden nav-focusable"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <style>{`
              @media (max-width: 768px) {
                .md-hidden { display: block !important; }
                .hidden.lg\\:block { display: none !important; }
              }
            `}</style>
            {isMobileMenuOpen ? (
              <Xmark width={24} height={24} aria-hidden />
            ) : (
              <Menu width={24} height={24} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
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
            style={{
              overflow: "hidden",
            }}
            id="site-mobile-nav"
          >
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {navItems.map((item, i) =>
                isHome ? (
                  <a
                    key={i}
                    href={item.href}
                    className="nav-focusable"
                    style={{
                      fontFamily: theme.fonts.headline,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      color: theme.colors.everglade,
                    }}
                    onClick={handleMobileNavClick(item.href)}
                  >
                    {item.name}
                  </a>
                ) : (
                  <TransitionLink
                    key={i}
                    to={offHomeNavTo(item.href)}
                    viewTransition
                    className="nav-focusable"
                    style={{
                      fontFamily: theme.fonts.headline,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      color: theme.colors.everglade,
                    }}
                    onClick={handleMobileSectionLinkClose}
                  >
                    {item.name}
                  </TransitionLink>
                ),
              )}
              {isHome ? (
                <a
                  href={ctaHref}
                  className="nav-focusable"
                  style={{
                    ...styles.button,
                    fontSize: "0.75rem",
                    width: "100%",
                    textAlign: "center",
                  }}
                  onClick={(e) => {
                    posthog?.capture("nav_cta_clicked", {
                      cta_text: ctaText,
                      location: "mobile",
                    });
                    handleMobileNavClick(ctaHref)(e);
                  }}
                >
                  {ctaText}
                </a>
              ) : (
                <TransitionLink
                  to={{ pathname: "/", hash: ctaHref }}
                  className="nav-focusable"
                  style={{
                    ...styles.button,
                    fontSize: "0.75rem",
                    width: "100%",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    posthog?.capture("nav_cta_clicked", {
                      cta_text: ctaText,
                      location: "mobile",
                    });
                    handleMobileSectionLinkClose();
                  }}
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
