import { usePostHog } from "@posthog/react";
import type React from "react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { useIsMobile } from "../../hooks/is-mobile";
import { RichText } from "../../portableText/rich-text";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/image-url";
import { layoutClass } from "../../styles/layout-classes";
import { theme } from "../../theme";
import type { HeroProps } from "../../types";
import { GoogleAuthGate } from "../google-auth-gate";
import { DEFAULT_HERO_EYEBROW } from "./hero-constants";

const fallbackImage = "/roof.jpeg";

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { fit: "crop", q: 78, w }) : url;

const srcSet = (url: string) =>
  isSanityCdnUrl(url)
    ? [640, 960, 1280, 1600, 2000]
        .map((w) => `${optimized(url, w)} ${w}w`)
        .join(", ")
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
    accentBar: {
      background: theme.colors.heroAccent,
      bottom: 0,
      left: 0,
      position: "absolute",
      top: 0,
      width: "4px",
    },
    badge: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xxl,
    },
    badgeLine: {
      background: theme.colors.everglade,
      height: "1.5px",
      width: "3rem",
    },
    badgeText: {
      color: theme.colors.everglade,
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
    },
    contentRow: {
      alignItems: isMobile ? "flex-start" : "flex-end",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: theme.spacing.xxxxl,
      justifyContent: isMobile ? "start" : "space-between",
    },
    copyBlock: isMobile
      ? { maxWidth: "100%" }
      : { flex: "0 0 40rem", maxWidth: "40rem" },
    // Mobile flows in-document so the section grows with the stacked content;
    // desktop keeps the vertically-centered overlay.
    copyOuter: isMobile
      ? {
          padding: `${theme.spacing.section} 0`,
          position: "relative",
          zIndex: 10,
        }
      : {
          left: 0,
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
        },
    ctaPrimary: {
      background:
        hovBtn === "primary" ? theme.colors.accent : theme.colors.accentLight,
      color: theme.colors.everglade,
      fontSize: "0.8125rem",
      fontWeight: 900,
      letterSpacing: "0.12em",
      padding: `${theme.spacing.buttonPadYLg} ${theme.spacing.xxxxxl}`,
      textAlign: isMobile ? "center" : undefined,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s",
    },
    ctaRow: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      flexWrap: "wrap",
      gap: theme.spacing.lg,
    },
    ctaSecondary: {
      background:
        hovBtn === "secondary" ? "oklch(100% 0 0 / 0.08)" : "transparent",
      border: `1px solid ${hovBtn === "secondary" ? "oklch(100% 0 0 / 0.65)" : "oklch(100% 0 0 / 0.35)"}`,
      color: "oklch(100% 0 0)",
      fontSize: "0.8125rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      padding: `${theme.spacing.buttonPadYLg} ${theme.spacing.xxxxxl}`,
      textAlign: isMobile ? "center" : undefined,
      textDecoration: "none",
      textTransform: "uppercase",
      transition: "background 0.15s, border-color 0.15s",
    },

    gradient: {
      background:
        "linear-gradient(180deg, transparent 20%, oklch(8.97% 0.008 107.13 / 0.85) 100%)",
      inset: 0,
      position: "absolute",
    },
    h1: {
      color: "oklch(100% 0 0)",
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(4.5rem, 8vw, 10.5rem)",
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
    photo: {
      height: "100%",
      inset: 0,
      objectFit: "cover",
      objectPosition: "center 60%",
      position: "absolute",
      width: "100%",
    },
    section: {
      background: theme.colors.black,
      height: isMobile ? "auto" : "calc(100vh - 20rem)",
      minHeight: isMobile ? 0 : 600,
      overflow: "hidden",
      position: "relative",
    },
    subtitleStyle: {
      color: theme.colors.white,
      fontSize: "1.3rem",
      lineHeight: 1.7,
      marginBottom: theme.spacing.xxxxxxl,
    },
    wrapper: {
      paddingTop: theme.spacing.sectionLoose,
    },
  };

  return (
    <div style={styles.wrapper}>
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
                          variant: "dual-cta-rail",
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
                          variant: "dual-cta-rail",
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

              {/* Stat card — flex sibling inside the container so it respects the 80rem boundary */}
              <div
                className="elfsight-app-367b8f47-df3d-45c0-a27e-555bc948bfac"
                data-elfsight-app-lazy
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
