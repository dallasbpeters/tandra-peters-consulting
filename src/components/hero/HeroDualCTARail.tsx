import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import React, { useState } from "react";

import type { HeroProps } from "../../types";

import { useIsMobile } from "../../hooks/isMobile";
import { RichText } from "../../portableText/RichText";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/imageUrl";
import { layoutClass } from "../../styles/layoutClasses";
import { theme } from "../../theme";
import { GoogleAuthGate } from "../GoogleAuthGate";
import { DEFAULT_HERO_EYEBROW } from "./heroConstants";

const fallbackImage = "/roof.jpeg";

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { w, fit: "crop", q: 78 }) : url;

const srcSet = (url: string) =>
  isSanityCdnUrl(url)
    ? [640, 960, 1280, 1600, 2000].map((w) => `${optimized(url, w)} ${w}w`).join(", ")
    : undefined;

/** Direction 5 — Full-bleed photo hero. paddingTop offsets the fixed NavDualCTARail. Nav is rendered separately. */
export const HeroDualCTARail: React.FC<HeroProps> = ({
  title,
  badgeText = DEFAULT_HERO_EYEBROW,
  subtitle,
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  backgroundImage = fallbackImage,
}) => {
  const posthog = usePostHog();
  const [hovBtn, setHovBtn] = useState<"primary" | "secondary" | null>(null);
  const isMobile = useIsMobile(1000);
  const styles: Record<string, CSSProperties> = {
    wrapper: {
      paddingTop: theme.spacing.sectionLoose,
    },
    section: {
      position: "relative",
      height: isMobile ? "auto" : "calc(100vh - 20rem)",
      minHeight: isMobile ? 0 : 600,
      overflow: "hidden",
      background: theme.colors.black,
    },
    photo: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center 60%",
    },
    gradient: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, transparent 20%, oklch(8.97% 0.008 107.13 / 0.85) 100%)",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: "4px",
      background: theme.colors.heroAccent,
    },
    // Mobile flows in-document so the section grows with the stacked content;
    // desktop keeps the vertically-centered overlay.
    copyOuter: isMobile
      ? {
          position: "relative",
          zIndex: 10,
          padding: `${theme.spacing.section} 0`,
        }
      : {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: 0,
          right: 0,
          zIndex: 10,
        },
    contentRow: {
      display: "flex",
      alignItems: isMobile ? "flex-start" : "flex-end",
      justifyContent: isMobile ? "start" : "space-between",
      gap: theme.spacing.xxxxl,
      flexDirection: isMobile ? "column" : "row",
    },
    copyBlock: isMobile ? { maxWidth: "100%" } : { maxWidth: "40rem", flex: "0 0 40rem" },
    badge: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xxl,
    },
    badgeLine: {
      height: "1.5px",
      width: "3rem",
      background: theme.colors.everglade,
    },
    badgeText: {
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: theme.colors.everglade,
    },
    h1: {
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(4.5rem, 8vw, 10.5rem)",
      fontWeight: 800,
      lineHeight: 0.9,
      letterSpacing: "-0.04em",
      textTransform: "uppercase",
      color: "oklch(100% 0 0)",
      margin: `0 0 ${theme.spacing.xxl}`,
    },
    h1Accent: {
      fontFamily: theme.fonts.headlineAlt,
      fontStyle: "italic",
      fontWeight: 400,
      textTransform: "none",
      color: theme.colors.heroAccent,
      letterSpacing: "-0.02em",
    },
    subtitleStyle: {
      color: theme.colors.white,
      fontSize: "1.3rem",
      lineHeight: 1.7,
      marginBottom: theme.spacing.xxxxxxl,
    },
    ctaRow: {
      display: "flex",
      gap: theme.spacing.lg,
      flexWrap: "wrap",
      flexDirection: isMobile ? "column" : "row",
    },
    ctaPrimary: {
      background: hovBtn === "primary" ? theme.colors.accent : theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: `${theme.spacing.buttonPadYLg} ${theme.spacing.xxxxxl}`,
      fontWeight: 900,
      fontSize: "0.8125rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      textDecoration: "none",
      textAlign: isMobile ? "center" : undefined,
      transition: "background 0.15s",
    },
    ctaSecondary: {
      border: `1px solid ${hovBtn === "secondary" ? "oklch(100% 0 0 / 0.65)" : "oklch(100% 0 0 / 0.35)"}`,
      color: "oklch(100% 0 0)",
      background: hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      padding: `${theme.spacing.buttonPadYLg} ${theme.spacing.xxxxxl}`,
      fontWeight: 700,
      fontSize: "0.8125rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      textDecoration: "none",
      textAlign: isMobile ? "center" : undefined,
      transition: "background 0.15s, border-color 0.15s",
    },
  };

  return (
    <div style={styles.wrapper}>
      <section style={styles.section}>
        <img
          aria-hidden="true"
          alt=""
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
          src={optimized(backgroundImage, 1280)}
          srcSet={srcSet(backgroundImage)}
          style={styles.photo}
        />
        <div style={styles.gradient} />
        <div style={styles.accentBar} />

        {/* Copy — same containerWideLayered pattern as Hero.tsx */}
        <div style={styles.copyOuter}>
          <div className={layoutClass.containerWideLayered}>
            <div style={styles.contentRow}>
              <div style={styles.copyBlock}>
                {badgeText && (
                  <div style={styles.badge}>
                    <div style={styles.badgeLine} />
                    <span style={styles.badgeText}>{badgeText}</span>
                  </div>
                )}

                <h1 style={styles.h1}>
                  {title ?? (
                    <>
                      Helping Texas
                      <br />
                      <span style={styles.h1Accent}>Homeowners.</span>
                    </>
                  )}
                </h1>

                {subtitle && (
                  <div style={styles.subtitleStyle}>
                    <RichText
                      value={subtitle}
                      paragraphStyle={{
                        fontSize: "inherit",
                        color: "inherit",
                        lineHeight: "inherit",
                      }}
                    />
                  </div>
                )}

                <GoogleAuthGate>
                  <div style={styles.ctaRow}>
                    <a
                      href={ctaHref}
                      style={styles.ctaPrimary}
                      onMouseEnter={() => setHovBtn("primary")}
                      onMouseLeave={() => setHovBtn(null)}
                      onClick={() =>
                        posthog?.capture("hero_cta_clicked", {
                          variant: "dual-cta-rail",
                          cta_text: ctaText,
                        })
                      }
                    >
                      {ctaText}
                    </a>
                    <a
                      href={secondaryCtaHref}
                      style={styles.ctaSecondary}
                      onMouseEnter={() => setHovBtn("secondary")}
                      onMouseLeave={() => setHovBtn(null)}
                      onClick={() =>
                        posthog?.capture("hero_secondary_cta_clicked", {
                          variant: "dual-cta-rail",
                          cta_text: secondaryCtaText,
                        })
                      }
                    >
                      {secondaryCtaText}
                    </a>
                  </div>
                </GoogleAuthGate>
              </div>

              {/* Stat card — flex sibling inside the container so it respects the 80rem boundary */}
              <div
                className="elfsight-app-367b8f47-df3d-45c0-a27e-555bc948bfac"
                data-elfsight-app-lazy
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
