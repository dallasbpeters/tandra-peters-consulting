import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { TransitionLink } from "./TransitionLink";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { theme } from "../theme";
import { NavProps } from "../types";
import { usePostHog } from "@posthog/react";

export const Nav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  logoTagline = "Roofing Consultant",
  imageSrc = "https://lh3.googleusercontent.com/aida/ADBb0ujNxdAxaY1-ObgML2j-2_hQEat6D2y2JOsW0G-Nn8gEMYt8QMH7U-Mp2gVevbXa84NvM7lJlcHVvIjXYcDfZe9_-fp1a7L4EQMVBGE2ktk3dY-MipPdQrQxytiQHnu8Nk_rnwybn1BLOrZj6dHzlyB7eB5gEeCuXGlrZLwUbtJYNj519phafs2-Nn7eLvREdzsUNRz3p161dSRwqxjoy-whIG9170-WCK-SXsooTmYMrlWKh8nKBBZ6g1mLjaCetu1MTSg-G4xiuw",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About Tandra", href: "#about-tandra" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact"
}) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
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

  const navStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    width: "100%",
    zIndex: 50,
    transition: "all 0.5s",
    paddingTop: isScrolled ? "1rem" : "1.5rem",
    paddingBottom: isScrolled ? "1rem" : "1.5rem",
    backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.7)" : "transparent",
    backdropFilter: isScrolled ? "blur(20px)" : "none",
    boxShadow: isScrolled ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
  };

    const containerStyle: React.CSSProperties = {
      maxWidth: "80rem",
      marginLeft: "auto",
      marginRight: "auto",
      paddingLeft: "1.5rem",
      paddingRight: "1.5rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    };
    
    const logoStyle: React.CSSProperties = {
      
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gridTemplateAreas: `"image text" "image tagline"`,
      alignItems: "center",
      gap: "0 0.5rem"
    };
    const imageStyle: React.CSSProperties = {
      minInlineSize: "2.2rem",
      minBlockSize: "2.2rem",
      maxInlineSize: "2.2rem",
      maxBlockSize: "2.2rem",
      objectFit: "cover",
      borderRadius: "9999px",
      gridArea: "image",
      overflow: "hidden", 
    };

  const logoTextStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    gridArea: "text",
    fontFamily: theme.fonts.headline,
    color: isScrolled ? theme.colors.black : theme.colors.white,
    textDecoration: "none",
  };
  const logoTaglineStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    gridArea: "tagline",
    display: "block",
    textTransform: "uppercase",
    fontFamily: theme.fonts.headline,
    color: isScrolled ? theme.colors.evergladeMuted : theme.colors.white,
  };

  const desktopNavStyle: React.CSSProperties = {
    display: "none",
    alignItems: "center",
    gap: "2.5rem",
  };

  const navLinkStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontSize: "14px",
    opacity: 0.6,
    textDecoration: "none",
    color: isScrolled ? theme.colors.black : theme.colors.white,
    transition: "opacity 0.2s",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
    padding: "0.75rem 1.5rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "10px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textDecoration: "none",
    display: "inline-block",
  };

  return (
    <nav style={navStyle} className="site-nav-vt">
      <div style={containerStyle}>
          
        <TransitionLink
          to="/"
          aria-label={`${logoText} — home`}
          style={{ ...logoStyle, textDecoration: "none" }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: "contents" }}
          >
            <img src={imageSrc} alt="" style={imageStyle} />
            <span style={logoTextStyle}>{logoText}</span>
            <span style={logoTaglineStyle}>{logoTagline}</span>
          </motion.div>
        </TransitionLink>
        
        <div style={{ ...desktopNavStyle, display: "flex" }} className="md-flex">
          <style>{`
            @media (max-width: 1000px) {
              .md-flex { display: none !important; }
            }
          `}</style>
          {navItems.map((item, i) =>
            isHome ? (
              <motion.a
                key={item.name}
                href={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={navLinkStyle}
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
                key={item.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ display: "inline-block" }}
              >
                <TransitionLink
                  to={{ pathname: "/", hash: item.href }}
                  style={navLinkStyle}
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

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {isHome ? (
            <motion.a
              href={ctaHref}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={buttonStyle}
              className="hidden lg:block"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.colors.evergladeLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.everglade;
              }}
              onClick={() => posthog?.capture("nav_cta_clicked", { cta_text: ctaText, location: "desktop" })}
            >
              {ctaText}
            </motion.a>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden lg:block"
              style={{ display: "inline-block" }}
            >
              <TransitionLink
                to={{ pathname: "/", hash: ctaHref }}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    theme.colors.evergladeLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    theme.colors.everglade;
                }}
                onClick={() => posthog?.capture("nav_cta_clicked", { cta_text: ctaText, location: "desktop" })}
              >
                {ctaText}
              </TransitionLink>
            </motion.div>
          )}
          <button 
            style={{ display: "none", padding: "0.5rem", background: "none", border: "none", cursor: "pointer", color: isScrolled ? "black" : "white" }}
            className="md-hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <style>{`
              @media (max-width: 768px) {
                .md-hidden { display: block !important; }
                .hidden.lg\\:block { display: none !important; }
              }
            `}</style>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ 
              overflow: "hidden" 
            }}
          >
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {navItems.map((item) =>
                isHome ? (
                  <a
                    key={item.name}
                    href={item.href}
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
                    key={item.name}
                    to={{ pathname: "/", hash: item.href }}
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
                  style={{
                    ...buttonStyle,
                    fontSize: "0.75rem",
                    width: "100%",
                    textAlign: "center",
                  }}
                  onClick={(e) => {
                    posthog?.capture("nav_cta_clicked", { cta_text: ctaText, location: "mobile" });
                    handleMobileNavClick(ctaHref)(e);
                  }}
                >
                  {ctaText}
                </a>
              ) : (
                <TransitionLink
                  to={{ pathname: "/", hash: ctaHref }}
                  style={{
                    ...buttonStyle,
                    fontSize: "0.75rem",
                    width: "100%",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    posthog?.capture("nav_cta_clicked", { cta_text: ctaText, location: "mobile" });
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
