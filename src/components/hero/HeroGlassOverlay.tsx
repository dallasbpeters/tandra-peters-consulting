import { usePostHog } from "@posthog/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { useIsMobile } from "@/src/hooks/isMobile";
import { layoutClass } from "@/src/styles/layoutClasses";

import { RichText } from "../../portableText/RichText";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/imageUrl";
import { theme } from "../../theme";
import type { HeroProps } from "../../types";
import { GoogleAuthGate } from "../GoogleAuthGate";
import { DEFAULT_HERO_EYEBROW } from "./heroConstants";

const TRUST = [
  { value: "7×", label: "Best Roofer" },
  { value: "★ 4.7", label: "Google Rating" },
  { value: "500+", label: "Projects" },
];

const fallbackImage = "/roof.jpeg";

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { w, fit: "crop", q: 78 }) : url;

const srcSet = (url: string) =>
  isSanityCdnUrl(url)
    ? [640, 960, 1280, 1600, 2000]
        .map((w) => `${optimized(url, w)} ${w}w`)
        .join(", ")
    : undefined;

/** Direction 4 — Full-bleed hero photo with bottom-left copy block. Nav is rendered separately by NavGlassOverlay. */
export const HeroGlassOverlay: React.FC<HeroProps> = ({
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
    section: {
      position: "relative",
      minHeight: isMobile ? "60vh" : "80vh",
      display: "grid",
      placeItems: "end stretch",
      overflow: "hidden",
      paddingTop: theme.spacing.sectionHero,
      paddingBottom: isMobile
        ? theme.spacing.sectionLoose
        : theme.spacing.sectionHero,
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

      backdropFilter: "blur(2px)",
      WebkitBackdropFilter: "blur(2px)",
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
      alignItems: isMobile ? "center" : "flex-end",
    },
    copyBlock: {
      maxWidth: "38rem",
      flex: "0 1 38rem",
    },
    badge: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.compact,
      marginBottom: theme.spacing.xxl,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.pill,
      background: theme.colors.everglade,
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
      fontSize: "clamp(3.5rem, 7vw, 10.5rem)",
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
      fontSize: "1.0625rem",
      lineHeight: 1.7,
      marginBottom: theme.spacing.xxxxxxl,
    },
    ctaRow: {
      display: "flex",
      gap: theme.spacing.lg,
      flexWrap: "wrap",
    },
    ctaPrimary: {
      background:
        hovBtn === "primary" ? theme.colors.accent : theme.colors.accentLight,
      color: theme.colors.everglade,
      padding: `${theme.spacing.lg} ${theme.spacing.xxxxxxl}`,
      borderRadius: theme.radius.pill,
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
      background:
        hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      padding: `${theme.spacing.lg} ${theme.spacing.xxxxxxl}`,
      borderRadius: theme.radius.pill,
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
      gap: theme.spacing.xl,
      justifySelf: isMobile ? "flex-start" : "flex-end",
      alignSelf: isMobile ? "flex-start" : "flex-end",
      alignItems: "flex-end",
      background: "oklch(100% 0 0 / 0.08)",
      backdropFilter: "blur(4px)",
      border: "1px solid oklch(100% 0 0 / 0.2)",
      padding: theme.spacing.lg,
      borderRadius: theme.radius.large,
      width: "auto",
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
      marginTop: theme.spacing.hairline,
    },
  };

  return (
    <section style={styles.section}>
      {/* biome-ignore lint/correctness/useImageSize: dynamic size fills viewport via CSS */}
      <img
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
        sizes="100vw"
        src={optimized(backgroundImage, 1280)}
        srcSet={srcSet(backgroundImage)}
        style={styles.photo}
      />
      <div style={styles.gradient} />
      <div style={styles.overlay} />

      <div className={layoutClass.containerWideRow} style={styles.copyRow}>
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
                  paragraphStyle={{
                    fontSize: "inherit",
                    color: "inherit",
                    lineHeight: "inherit",
                  }}
                  value={subtitle}
                />
              </div>
            )}

            <GoogleAuthGate>
              <div style={styles.ctaRow}>
                <a
                  href={ctaHref}
                  onClick={() =>
                    posthog?.capture("hero_cta_clicked", {
                      variant: "glass-overlay",
                      cta_text: ctaText,
                    })
                  }
                  onMouseEnter={() => setHovBtn("primary")}
                  onMouseLeave={() => setHovBtn(null)}
                  style={styles.ctaPrimary}
                >
                  {ctaText}
                </a>
                <a
                  href={secondaryCtaHref}
                  onClick={() =>
                    posthog?.capture("hero_secondary_cta_clicked", {
                      variant: "glass-overlay",
                      cta_text: secondaryCtaText,
                    })
                  }
                  onMouseEnter={() => setHovBtn("secondary")}
                  onMouseLeave={() => setHovBtn(null)}
                  style={styles.ctaSecondary}
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
