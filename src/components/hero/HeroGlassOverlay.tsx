import type { CSSProperties } from "react";

import { usePostHog } from "@posthog/react";
import React, { useState } from "react";

import { useIsMobile } from "@/src/hooks/isMobile";
import { layoutClass } from "@/src/styles/layoutClasses";

import type { HeroProps } from "../../types";

import { RichText } from "../../portableText/RichText";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/imageUrl";
import { theme } from "../../theme";
import { GoogleAuthGate } from "../GoogleAuthGate";

const TRUST = [
  { value: "7×", label: "Best Roofer" },
  { value: "★ 4.9", label: "Google Rating" },
  { value: "500+", label: "Projects" },
];

const fallbackImage = "/roof.jpeg";

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { w, fit: "crop", q: 78 }) : url;

const srcSet = (url: string) =>
  isSanityCdnUrl(url)
    ? [640, 960, 1280, 1600, 2000].map((w) => `${optimized(url, w)} ${w}w`).join(", ")
    : undefined;

/** Direction 4 — Full-bleed hero photo with bottom-left copy block. Nav is rendered separately by NavGlassOverlay. */
export const HeroGlassOverlay: React.FC<HeroProps> = ({
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
  const isMobile = useIsMobile(800);
  const styles: Record<string, CSSProperties> = {
    section: {
      position: "relative",
      minHeight: isMobile ? "60vh" : "80vh",
      display: "grid",
      placeItems: "end stretch",
      overflow: "hidden",
      paddingTop: "8rem",
      paddingBottom: isMobile ? "5rem" : "8rem",
      background: theme.colors.black,
    },
    photo: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
    },
    gradient: {
      position: "absolute",
      inset: 0,

      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      maskImage: "linear-gradient(to top, black 0%, transparent 70%)",
      WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 70%)",
    },
    overlay: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(to top, oklch(18.97% 0.008 107.13 / 0.55) 40%, transparent 100%)",
    },
    copyInner: {
      maxWidth: "80rem",
      width: "100%",
      margin: "0 auto",
      boxSizing: "border-box",
      display: "grid",
      gridGap: "2rem",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      alignItems: "flex-end",
    },
    copyBlock: {
      maxWidth: "38rem",
      flex: "0 1 38rem",
    },
    badge: {
      display: "flex",
      alignItems: "center",
      gap: "0.625rem",
      marginBottom: "1.5rem",
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: theme.colors.accentLight,
      boxShadow: `0 0 8px ${theme.colors.accentLight}`,
    },
    badgeText: {
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: theme.colors.everglade,
    },
    h1: {
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(2.75rem, 6vw, 15.5rem)",
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
      color: "oklch(82% 0.01 107)",
      fontSize: "1.0625rem",
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
      padding: "1rem 2.5rem",
      borderRadius: "999px",
      fontWeight: 900,
      fontSize: "0.875rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      transition: "background 0.15s",
    },
    ctaSecondary: {
      border: `1px solid ${hovBtn === "secondary" ? "oklch(100% 0 0 / 0.7)" : "oklch(100% 0 0 / 0.4)"}`,
      color: "oklch(100% 0 0)",
      background: hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      padding: "1rem 2.5rem",
      borderRadius: "999px",
      fontWeight: 700,
      fontSize: "0.875rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      transition: "background 0.15s, border-color 0.15s",
    },
    trustStack: {
      display: "flex",
      flexDirection: isMobile ? "row" : "column",
      gap: "1.25rem",
      justifySelf: isMobile ? "center" : "flex-end",
      alignItems: "flex-end",
      background: "oklch(100% 0 0 / 0.08)",
      backdropFilter: "blur(4px)",
      border: "1px solid oklch(100% 0 0 / 0.2)",
      padding: "1rem",
      borderRadius: "12px",
    },
    trustValue: {
      color: theme.colors.accentLight,
      fontWeight: 800,
      fontSize: "1.75rem",
      letterSpacing: "-0.04em",
      lineHeight: 1,
    },
    trustLabel: {
      color: "oklch(72% 0.01 107)",
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginTop: "0.125rem",
    },
  };

  return (
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
      <div style={styles.overlay} />

      <div style={styles.copyRow} className={layoutClass.containerWideRow}>
        <div className="copy-inner" style={styles.copyInner}>
          <div style={styles.copyBlock}>
            {badgeText && (
              <div style={styles.badge}>
                <div style={styles.badgeDot} />
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
                      variant: "glass-overlay",
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
                      variant: "glass-overlay",
                      cta_text: secondaryCtaText,
                    })
                  }
                >
                  {secondaryCtaText}
                </a>
              </div>
            </GoogleAuthGate>
          </div>

          <div style={styles.trustStack}>
            {TRUST.map(({ value, label }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <div style={styles.trustValue}>{value}</div>
                <div style={styles.trustLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
