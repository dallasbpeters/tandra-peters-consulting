import { usePostHog } from "@posthog/react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type React from "react";

import { useIsMobile } from "../hooks/is-mobile";
import { RichText } from "../portableText/rich-text";
import { isSanityCdnUrl, sanityImageUrl } from "../sanity/image-url";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { HeroProps } from "../types";
import { GoogleAuthGate } from "./google-auth-gate";
import { DEFAULT_HERO_EYEBROW } from "./hero/hero-constants";

const fallbackHeroImage = "/roof.jpeg";

const optimizedHeroImageUrl = (url: string, width: number): string => {
  if (!isSanityCdnUrl(url)) {
    return url;
  }

  return sanityImageUrl(url, { fit: "crop", q: 78, w: width });
};

const heroImageSrcSet = (url: string): string | undefined => {
  if (!isSanityCdnUrl(url)) {
    return;
  }

  return [640, 960, 1280, 1600, 2000]
    .map((width) => `${optimizedHeroImageUrl(url, width)} ${width}w`)
    .join(", ");
};

export const Hero: React.FC<HeroProps> = ({
  title = (
    <>
      Your Roof.
      <br />
      <span style={{ color: theme.colors.heroAccent }}>Our Expertise.</span>
    </>
  ),
  badgeText = DEFAULT_HERO_EYEBROW,
  subtitle = "Work with an Austin-based roofing consultant for roof assessments, insurance guidance, and careful project oversight—backed by Birdcreek Roofing, one of Central Texas’s most trusted installation teams. Voted Best Roofer in Central Texas 7 years in a row.",
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  backgroundImage = fallbackHeroImage,
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile();
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" as const },
      y: 0,
    },
  };

  const sectionStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${theme.colors.black} 0%, ${theme.colors.black} 100%)`,
    minHeight: isMobile ? "60vh" : "80vh",
    overflow: "hidden",
    paddingBottom: theme.spacing.sectionLoose,
    paddingTop: theme.spacing.sectionHero,
    position: "relative",
  };

  const heroImageStyle: React.CSSProperties = {
    height: "100%",
    inset: 0,
    objectFit: "cover",
    objectPosition: "center",
    opacity: 0.5,
    pointerEvents: "none",
    position: "absolute",
    width: "100%",
  };

  const badgeStyle: React.CSSProperties = {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: theme.colors.purple,
    display: "inline-flex",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
  };

  const h1Style: React.CSSProperties = {
    color: theme.colors.white,
    fontFamily: theme.fonts.headline,
    fontSize: "clamp(3rem, 10vw, 6rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 0.9,
    marginBottom: theme.spacing.xxxxl,
    textTransform: "uppercase",
  };

  const pStyle: React.CSSProperties = {
    color: theme.colors.white,
    fontSize: "clamp(1rem, 2vw, 1.25rem)",
    fontWeight: 500,
    lineHeight: 1.6,
    marginBottom: theme.spacing.xxxxxxxxl,
    maxWidth: "45rem",
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    backgroundColor: theme.colors.accentLight,
    border: "none",
    color: theme.colors.everglade,
    cursor: "pointer",
    display: "inline-block",
    fontFamily: theme.fonts.headline,
    fontSize: "1rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    padding: `${theme.spacing.lg} ${theme.spacing.xxxxl}`,
    textAlign: "center",
    textDecoration: "none",
    textTransform: "uppercase",
    transition: "filter 0.2s",
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 1)",
    color: theme.colors.white,
    cursor: "pointer",
    display: "inline-block",
    fontFamily: theme.fonts.headline,
    fontSize: "1rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    padding: `${theme.spacing.lg} ${theme.spacing.xxxxl}`,
    textAlign: "center",
    textDecoration: "none",
    textTransform: "uppercase",
    transition: "background-color 0.2s",
  };

  return (
    <section className="wa-cluster" style={sectionStyle}>
      {/* biome-ignore lint/correctness/useImageSize: dynamic size fills viewport via CSS */}
      <img
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
        sizes="100vw"
        src={optimizedHeroImageUrl(backgroundImage, 1280)}
        srcSet={heroImageSrcSet(backgroundImage)}
        style={heroImageStyle}
      />
      <div className={layoutClass.containerWideLayered}>
        <motion.div
          animate="visible"
          initial="hidden"
          style={{ maxWidth: "56rem" }}
          variants={containerVariants}
        >
          <motion.div style={badgeStyle} variants={itemVariants}>
            <span
              style={{
                color: theme.colors.purple,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {badgeText}
            </span>
          </motion.div>
          <motion.h1 style={h1Style} variants={itemVariants}>
            {title}
          </motion.h1>
          <motion.div style={pStyle} variants={itemVariants}>
            <RichText
              paragraphStyle={{
                color: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                lineHeight: "inherit",
                marginBottom: "inherit",
                maxWidth: "inherit",
              }}
              value={subtitle}
            />
          </motion.div>
          <GoogleAuthGate>
            <motion.div
              className="sm-row"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.lg,
              }}
              variants={itemVariants}
            >
              <style>{`
                @media (min-width: 640px) {
                  .sm-row { flex-direction: row !important; }
                }
              `}</style>
              <a
                href={ctaHref}
                onClick={() =>
                  posthog?.capture("hero_cta_clicked", {
                    cta_href: ctaHref,
                    cta_text: ctaText,
                  })
                }
                onMouseEnter={(e) =>
                  (e.currentTarget.style.filter = "brightness(1.1)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                style={buttonPrimaryStyle}
              >
                {ctaText}
              </a>
              <a
                href={secondaryCtaHref}
                onClick={() =>
                  posthog?.capture("hero_secondary_cta_clicked", {
                    cta_href: secondaryCtaHref,
                    cta_text: secondaryCtaText,
                  })
                }
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
                style={buttonSecondaryStyle}
              >
                {secondaryCtaText}
              </a>
            </motion.div>
          </GoogleAuthGate>
        </motion.div>
      </div>
    </section>
  );
};
