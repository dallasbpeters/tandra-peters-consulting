import React from "react";
import { motion, type Variants } from "motion/react";
import { theme } from "../theme";
import { HeroProps } from "../types";

export const Hero: React.FC<HeroProps> = ({
  title = (
    <>
      Your Roof.<br/>
      <span style={{ color: theme.colors.evergladeMuted }}>Our Expertise.</span>
    </>
  ),
  subtitle = "Professional roofing consultation with the architectural precision and backing of Austin's premier BirdCreek Roofing.",
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  backgroundImage = "/roof.jpeg"
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    paddingTop: "5rem",
    background: `linear-gradient(135deg, ${theme.colors.everglade} 0%, ${theme.colors.evergladeLight} 100%)`,
    overflow: "hidden",
  };

  const bgImageStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundImage: `url('${backgroundImage}')`,
  };

  const contentContainerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    width: "100%",
    position: "relative",
    zIndex: 10,
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "0.25rem 0.75rem",
    marginBottom: "2rem",
  };

  const h1Style: React.CSSProperties = {
    fontSize: "clamp(3rem, 10vw, 6rem)",
    color: theme.colors.white,
    lineHeight: 0.9,
    marginBottom: "2rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "-0.02em",
  };

  const pStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 2vw, 1.25rem)",
    color: theme.colors.evergladeMuted,
    maxWidth: "36rem",
    marginBottom: "3rem",
    lineHeight: 1.6,
    fontWeight: 300,
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    backgroundColor: theme.colors.accentLight,
    color: theme.colors.everglade,
    padding: "1.25rem 2.5rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "1.1rem",
    border: "none",
    cursor: "pointer",
    transition: "filter 0.2s",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: theme.colors.white,
    backgroundColor: "transparent",
    padding: "1.25rem 2.5rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "1.1rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
  };

  return (
    <section style={sectionStyle}>
      <motion.div 
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 1.5 }}
        style={bgImageStyle}
      />
      <div style={contentContainerStyle}>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ maxWidth: "56rem" }}
        >
          <motion.div variants={itemVariants} style={badgeStyle}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: theme.colors.evergladeMuted,
                textTransform: "uppercase",
              }}
            >
              BirdCreek Roofing Partner
            </span>
          </motion.div>
          <motion.h1 variants={itemVariants} style={h1Style}>
            {title}
          </motion.h1>
          <motion.p variants={itemVariants} style={pStyle}>
            {subtitle}
          </motion.p>
          <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="sm-row">
            <style>{`
              @media (min-width: 640px) {
                .sm-row { flex-direction: row !important; }
              }
            `}</style>
            <a 
              href={ctaHref}
              style={buttonPrimaryStyle}
              onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
            >
              {ctaText}
            </a>
            <a 
              href="#services"
              style={buttonSecondaryStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              Explore Services
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
