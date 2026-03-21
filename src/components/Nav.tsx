import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { theme } from "../theme";
import { NavProps } from "../types";

export const Nav: React.FC<NavProps> = ({
  logoText = "Tandra Peters",
  imageSrc = "https://lh3.googleusercontent.com/aida/ADBb0ujNxdAxaY1-ObgML2j-2_hQEat6D2y2JOsW0G-Nn8gEMYt8QMH7U-Mp2gVevbXa84NvM7lJlcHVvIjXYcDfZe9_-fp1a7L4EQMVBGE2ktk3dY-MipPdQrQxytiQHnu8Nk_rnwybn1BLOrZj6dHzlyB7eB5gEeCuXGlrZLwUbtJYNj519phafs2-Nn7eLvREdzsUNRz3p161dSRwqxjoy-whIG9170-WCK-SXsooTmYMrlWKh8nKBBZ6g1mLjaCetu1MTSg-G4xiuw",
  navItems = [
    { name: "Services", href: "#services" },
    { name: "About Tandra", href: "#about-tandra" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Contact", href: "#contact" }
  ],
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact"
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

    const imageStyle: React.CSSProperties = {
      width: "2rem",
      height: "2rem",
      objectFit: "cover",
      borderRadius: "9999px",
      overflow: "hidden",
    };

  const logoStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    fontFamily: theme.fonts.headline,
    color: isScrolled ? theme.colors.black : theme.colors.white,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
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
    <nav style={navStyle}>
      <div style={containerStyle}>
          
        <motion.a 
          href="#"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={logoStyle}
        >
          <img src={imageSrc} alt={logoText} style={imageStyle} />
          {logoText}
        </motion.a>
        
        <div style={{ ...desktopNavStyle, display: "flex" }} className="md-flex">
          <style>{`
            @media (max-width: 768px) {
              .md-flex { display: none !important; }
            }
          `}</style>
          {navItems.map((item, i) => (
            <motion.a 
              key={item.name} 
              href={item.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={navLinkStyle}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
            >
              {item.name}
            </motion.a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <motion.a 
            href={ctaHref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={buttonStyle}
            className="hidden lg:block"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.evergladeLight}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.everglade}
          >
            {ctaText}
          </motion.a>
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
              backgroundColor: theme.colors.white, 
              borderBottom: `1px solid ${theme.colors.paperDark}`, 
              overflow: "hidden" 
            }}
          >
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {navItems.map((item) => (
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
                    color: theme.colors.everglade
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <a href={ctaHref} style={{ ...buttonStyle, fontSize: "0.75rem", width: "100%", textAlign: "center" }} onClick={() => setIsMobileMenuOpen(false)}>
                {ctaText}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
