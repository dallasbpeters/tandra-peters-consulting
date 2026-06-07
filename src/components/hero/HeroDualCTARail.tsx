import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import React, { useState } from "react";

import type { HeroProps } from "../../types";

import { RichText } from "../../portableText/RichText";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/imageUrl";
import { layoutClass } from "../../styles/layoutClasses";
import { theme } from "../../theme";
import { GoogleAuthGate } from "../GoogleAuthGate";

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
  badgeText = "Birdcreek Roofing · Austin, TX",
  subtitle,
  ctaText = "Schedule a Free Consultation",
  ctaHref = "#contact",
  secondaryCtaText = "Explore Services",
  secondaryCtaHref = "#services",
  backgroundImage = fallbackImage,
}) => {
  const posthog = usePostHog();
  const [hovBtn, setHovBtn] = useState<"primary" | "secondary" | null>(null);

  const styles: Record<string, CSSProperties> = {
    wrapper: {
      paddingTop: "5rem",
    },
    section: {
      position: "relative",
      height: "calc(100vh - 5rem)",
      minHeight: 600,
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
      background:
        "linear-gradient(180deg, transparent 40%, oklch(18.97% 0.008 107.13 / 0.85) 100%)",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: "4px",
      background: theme.colors.heroAccent,
    },
    copyOuter: {
      position: "absolute",
      bottom: "4.5rem",
      left: 0,
      right: 0,
      zIndex: 10,
    },
    contentRow: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "2rem",
    },
    copyBlock: {
      maxWidth: "40rem",
      flex: "0 1 40rem",
    },
    badge: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      marginBottom: "1.5rem",
    },
    badgeLine: {
      height: "1.5px",
      width: "3rem",
      background: theme.colors.accentLight,
    },
    badgeText: {
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: theme.colors.accentLight,
    },
    h1: {
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(2.75rem, 5vw, 5.5rem)",
      fontWeight: 800,
      lineHeight: 0.9,
      letterSpacing: "-0.04em",
      textTransform: "uppercase",
      color: "oklch(100% 0 0)",
      margin: "0 0 1.5rem",
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
      color: "oklch(80% 0.01 107)",
      fontSize: "1rem",
      lineHeight: 1.7,
      marginBottom: "2.5rem",
    },
    ctaRow: {
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap",
    },
    ctaPrimary: {
      background: hovBtn === "primary" ? theme.colors.accent : theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: "0.9375rem 2.25rem",
      fontWeight: 900,
      fontSize: "0.8125rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      textDecoration: "none",
      transition: "background 0.15s",
    },
    ctaSecondary: {
      border: `1px solid ${hovBtn === "secondary" ? "oklch(100% 0 0 / 0.65)" : "oklch(100% 0 0 / 0.35)"}`,
      color: "oklch(100% 0 0)",
      background: hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      padding: "0.9375rem 2.25rem",
      fontWeight: 700,
      fontSize: "0.8125rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      textDecoration: "none",
      transition: "background 0.15s, border-color 0.15s",
    },
    statCard: {
      background: theme.colors.paper,
      padding: "1.5rem 2rem",
      borderTop: `3px solid ${theme.colors.accentLight}`,
      flexShrink: 0,
      alignSelf: "flex-end",
    },
    statValue: {
      fontFamily: theme.fonts.headline,
      fontWeight: 800,
      fontSize: "2.5rem",
      color: theme.colors.everglade,
      letterSpacing: "-0.04em",
      lineHeight: 1,
    },
    statLabel: {
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: theme.colors.accent,
      marginTop: "0.375rem",
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
              <div style={styles.statCard}>
                <div style={styles.statValue}>★ 4.9</div>
                <div style={styles.statLabel}>Google · 200+ Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
