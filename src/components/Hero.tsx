import React from "react";
import { motion, type Variants } from "motion/react";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { HeroProps } from "../types";
import { usePostHog } from "@posthog/react";
import { RichText } from "../portableText/RichText";

export const Hero: React.FC<HeroProps> = ({
  title = (
    <>
      Your Roof.<br/>
      <span style={{ color: theme.colors.heroAccent }}>Our Expertise.</span>
    </>
  ),
  badgeText = "Birdcreek Roofing consultant · Austin, TX",
  subtitle = "Work with an Austin-based roofing consultant for roof assessments, insurance guidance, and careful project oversight—backed by Birdcreek Roofing, one of Central Texas’s most trusted installation teams. Voted Best Roofer in Central Texas 7 years in a row.",
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  backgroundImage = "/roof.png",
}) => {
  const posthog = usePostHog();

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
    paddingBottom: "3rem",
    background: `linear-gradient(135deg, ${theme.colors.black} 0%, ${theme.colors.black} 100%)`,
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

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "0.25rem 0.75rem",
    marginBottom: "2rem",
    color: theme.colors.purple,
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
    color: theme.colors.white,
    maxWidth: "36rem",
    marginBottom: "3rem",
    lineHeight: 1.6,
    fontWeight: 300,
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    backgroundColor: theme.colors.accentLight,
    color: theme.colors.everglade,
    padding: "1rem 2rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    transition: "filter 0.2s",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    border: "1px solid rgba(255, 255, 255, 1)",
    color: theme.colors.white,
    backgroundColor: "transparent",
    padding: "1rem 2rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "1rem",
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
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ duration: 1.5 }}
        style={bgImageStyle}
      />
      <div className={layoutClass.containerWideLayered}>
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
                color: theme.colors.purple,
                textTransform: "uppercase",
              }}
            >
              {badgeText}
            </span>
          </motion.div>
          <motion.h1 variants={itemVariants} style={h1Style}>
            {title}
          </motion.h1>
          <motion.div variants={itemVariants} style={pStyle}>
            <RichText
              value={subtitle}
              paragraphStyle={{
                fontSize: "inherit",
                color: "inherit",
                maxWidth: "inherit",
                marginBottom: "inherit",
                lineHeight: "inherit",
                fontWeight: "inherit",
              }}
            />
          </motion.div>
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
              onClick={() => posthog?.capture("hero_cta_clicked", { cta_text: ctaText, cta_href: ctaHref })}
            >
              {ctaText}
            </a>
            <a
              href={secondaryCtaHref}
              style={buttonSecondaryStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => posthog?.capture("hero_secondary_cta_clicked", { cta_text: secondaryCtaText, cta_href: secondaryCtaHref })}
            >
              {secondaryCtaText}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
