import { usePostHog } from "@posthog/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { useIsMobile } from "@/src/hooks/is-mobile";
import { layoutClass } from "@/src/styles/layout-classes";

import { RichText } from "../../portableText/rich-text";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/image-url";
import { theme } from "../../theme";
import type { HeroProps } from "../../types";
import { GoogleAuthGate } from "../google-auth-gate";
import { DEFAULT_HERO_EYEBROW } from "./hero-constants";

const TRUST = [
  { label: "Best Roofer", value: "7×" },
  { label: "Google Rating", value: "★ 4.7" },
  { label: "Projects", value: "500+" },
];

const fallbackImage = "/roof.jpeg";

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { fit: "crop", q: 78, w }) : url;

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
    badge: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.compact,
      marginBottom: theme.spacing.xxl,
    },
    badgeDot: {
      background: theme.colors.everglade,
      borderRadius: theme.radius.pill,
      boxShadow: `0 0 8px ${theme.colors.accentLight}`,
      height: 6,
      width: 6,
    },
    badgeText: {
      color: theme.colors.everglade,
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
    },
    copyBlock: {
      flex: "0 1 38rem",
      maxWidth: "38rem",
    },
    copyInner: {
      alignItems: isMobile ? "center" : "flex-end",
      boxSizing: "border-box",
      display: "grid",
      gridGap: "2rem",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      margin: "0 auto",
      maxWidth: "80rem",
      width: "100%",
    },
    ctaPrimary: {
      background:
        hovBtn === "primary" ? theme.colors.accent : theme.colors.accentLight,
      borderRadius: theme.radius.pill,
      color: theme.colors.everglade,
      fontSize: "0.875rem",
      fontWeight: 900,
      letterSpacing: "0.1em",
      padding: `${theme.spacing.lg} ${theme.spacing.xxxxxxl}`,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s",
    },
    ctaRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing.lg,
    },
    ctaSecondary: {
      background:
        hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      border: `1px solid ${hovBtn === "secondary" ? "oklch(100% 0 0 / 0.7)" : "oklch(100% 0 0 / 0.4)"}`,
      borderRadius: theme.radius.pill,
      color: "oklch(100% 0 0)",
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      padding: `${theme.spacing.lg} ${theme.spacing.xxxxxxl}`,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s, border-color 0.15s",
    },
    gradient: {
      WebkitBackdropFilter: "blur(2px)",
      WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 70%)",
      backdropFilter: "blur(2px)",
      inset: 0,
      maskImage: "linear-gradient(to top, black 0%, transparent 70%)",
      position: "absolute",
    },
    h1: {
      color: "oklch(100% 0 0)",
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(3.5rem, 7vw, 10.5rem)",
      fontWeight: 800,
      letterSpacing: "-0.04em",
      lineHeight: 0.9,
      margin: `0 0 ${theme.spacing.xxl}`,
      textTransform: "uppercase",
    },
    h1Accent: {
      color: theme.colors.heroAccent,
      fontFamily: theme.fonts.headlineAlt,
      fontStyle: "italic",
      fontWeight: 400,
      letterSpacing: "-0.02em",
      textTransform: "none",
    },
    overlay: {
      background:
        "linear-gradient(to top, oklch(18.97% 0.008 107.13 / 0.55) 40%, transparent 100%)",
      inset: 0,
      position: "absolute",
    },
    photo: {
      height: "100%",
      inset: 0,
      objectFit: "cover",
      objectPosition: "center",
      position: "absolute",
      width: "100%",
    },
    section: {
      background: theme.colors.black,
      display: "grid",
      minHeight: isMobile ? "60vh" : "80vh",
      overflow: "hidden",
      paddingBottom: isMobile
        ? theme.spacing.sectionLoose
        : theme.spacing.sectionHero,
      paddingTop: theme.spacing.sectionHero,
      placeItems: "end stretch",
      position: "relative",
    },
    subtitleStyle: {
      color: theme.colors.white,
      fontSize: "1.0625rem",
      lineHeight: 1.7,
      marginBottom: theme.spacing.xxxxxxl,
    },
    trustLabel: {
      color: "oklch(72% 0.01 107)",
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      marginTop: theme.spacing.hairline,
      textTransform: "uppercase",
    },
    trustStack: {
      alignItems: "flex-end",
      alignSelf: isMobile ? "flex-start" : "flex-end",
      backdropFilter: "blur(4px)",
      background: "oklch(100% 0 0 / 0.08)",
      border: "1px solid oklch(100% 0 0 / 0.2)",
      borderRadius: theme.radius.large,
      display: "flex",
      flexDirection: isMobile ? "row" : "column",
      gap: theme.spacing.xl,
      justifySelf: isMobile ? "flex-start" : "flex-end",
      padding: theme.spacing.lg,
      width: "auto",
    },
    trustValue: {
      color: theme.colors.accentLight,
      fontSize: "1.75rem",
      fontWeight: 800,
      letterSpacing: "-0.04em",
      lineHeight: 1,
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
                    color: "inherit",
                    fontSize: "inherit",
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
                      cta_text: ctaText,
                      variant: "glass-overlay",
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
                      cta_text: secondaryCtaText,
                      variant: "glass-overlay",
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
