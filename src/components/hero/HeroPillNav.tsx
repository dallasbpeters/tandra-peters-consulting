import type { CSSProperties } from "react";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import React, { useRef } from "react";
// Plugins registered once in main.tsx — do not re-register here.
import { Shader, ChromaFlow, Dither, ImageTexture } from "shaders/react";

import type { HeroProps } from "../../types";

import { useIsMobile } from "../../hooks/isMobile";
import { RichText } from "../../portableText/RichText";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/imageUrl";
import { theme } from "../../theme";

const STATS = [
  { value: "7×", label: "Best Roofer Award" },
  { value: "★ 4.7", label: "Google Rating" },
  { value: "500+", label: "Projects Completed" },
  { value: "12yrs", label: "Serving Austin" },
];

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { w, fit: "crop", q: 78 }) : url;

function ShaderEffect({ src, style }: { src: string; style: CSSProperties }) {
  return (
    <Shader style={style} className="sky">
      <ChromaFlow
        id="idmostv5d9xi2rmvn45"
        baseColor="#ffffff"
        downColor="#ffffff"
        intensity={0.6}
        leftColor="#ffffff"
        momentum={60}
        radius={2.9}
        rightColor="#ffffff"
        upColor="#ffffff"
        visible={false}
      />

      <ImageTexture id="heroPillImage" url={src} />

      {/* Explicit ids: React useId() fallback yields `__` GLSL names that fail on Safari. */}
      <Dither
        id="heroPillDither"
        colorA="#2e73b3"
        colorB="#c3d5e3"
        pattern="bayer8"
        pixelSize={2}
        threshold={{
          type: "map",

          source: "idmostv5d9xi2rmvn45",

          channel: "alpha",

          inputMin: 0,

          inputMax: 1,

          outputMin: 0,

          outputMax: 1,
        }}
      />
    </Shader>
  );
}

/**
 * Direction 6 — Two-layer parallax hero.
 * skyImage        → Layer 1 background, parallax 0.3× (recedes).
 * foregroundImage → Layer 3 house/roof cutout, parallax −0.3× (rises toward viewer).
 *
 * Desktop: all content layers absolutely positioned for the stacked depth look.
 * Mobile:  flex-column flow so nothing gets covered — no absolute content layers.
 */
export const HeroPillNav: React.FC<HeroProps> = ({
  titleLine1 = "Helping Texas",
  titleLine2 = "Homeowners.",
  subtitle,
  skyImage,
  foregroundImage,
}) => {
  const isMobile = useIsMobile(1200);
  const sectionRef = useRef<HTMLElement>(null);
  const skyWrapRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HTMLImageElement>(null);

  useGSAP(
    () => {
      // Let GSAP own the responsive lifecycle so we don't tear down/revert
      // animations when viewport height changes (mobile toolbar show/hide).
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1200px)", () => {
        const trigger = {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        };

        if (skyWrapRef.current) {
          gsap.to(skyWrapRef.current, {
            yPercent: -35,
            scrollTrigger: trigger,
          });
        }
        if (houseRef.current) {
          gsap.to(houseRef.current, {
            yPercent: -20,
            ease: "none",
            scrollTrigger: trigger,
          });
        }
      });
    },
    { scope: sectionRef },
  );

  const styles: Record<string, CSSProperties> = {
    /* Section is flex-column on mobile so content stacks in flow */
    section: {
      position: "relative",
      minHeight: isMobile ? "auto" : "98vh",
      overflow: "hidden",
      background: theme.colors.black,
      boxSizing: "border-box",
      width: isMobile ? "100%" : `calc(100% - 2 * ${theme.spacing.lg})`,
      margin: isMobile ? 0 : theme.spacing.lg,
      borderRadius: isMobile ? "0" : theme.radius.large,
      display: isMobile ? "flex" : "block",
      flexDirection: isMobile ? "column" : undefined,
    },

    /* ── Image layers — always absolute (background) ── */
    sky: {
      width: "100%",
      height: "130%",
      objectFit: "cover",
      objectPosition: "center",
      display: "block",
    },
    overlay: {
      position: "absolute",
      inset: 0,
      zIndex: 2,
      background:
        "linear-gradient(to bottom, oklch(18.97% 0.008 107.13 / 0.45) 0%, oklch(18.97% 0.008 107.13 / 0.15) 40%, oklch(18.97% 0.008 107.13 / 0.55) 100%)",
    },
    house: {
      position: "absolute",
      bottom: isMobile ? "-10%" : "min(-15vw, -15%)",
      left: 0,
      width: "100%",
      height: "auto",
      zIndex: 10,
      willChange: "transform",
      minWidth: 1500,
      display: "block",
      pointerEvents: "none",
      filter: "contrast(1.2) brightness(0.8)",
    },

    /* ── DESKTOP: absolute content layers ── */
    headlineLayerDesktop: {
      position: "absolute",
      inset: "auto 0 50% 0",
      zIndex: 5,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: theme.spacing.lg,
      padding: `clamp(${theme.spacing.xxxxxxxxl}, 14vh, ${theme.spacing.navClearance}) ${theme.spacing.xxxxl} 0`,
      pointerEvents: "none",
    },
    copyLayerDesktop: {
      position: "absolute",
      bottom: "clamp(15%, 10vw, 35%)",
      left: "10vw",
      right: "10vw",
      zIndex: 15,
      display: "flex",
      justifyContent: "center",
      padding: theme.spacing.xxxxl,
      pointerEvents: "none",
    },
    statBarDesktop: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 25,
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: `${theme.spacing.xxxxl} ${theme.spacing.section}`,
      background: `${theme.colors.everglade}e0`,
      backdropFilter: "blur(12px)",
      borderTop: "1px solid oklch(100% 0 0 / 0.09)",
      padding: `${theme.spacing.xl} ${theme.spacing.xxxxl}`,
    },

    /* ── MOBILE: flex-column in-flow content ── */
    mobileContent: {
      position: "relative",
      zIndex: 15,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      padding: `${theme.spacing.navClearance} ${theme.spacing.xxl} ${theme.spacing.xxxxl}`, // top clears the mobile nav bar
      gap: theme.spacing.xxl,
    },
    statBarMobile: {
      position: "relative",
      zIndex: 25,
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: `${theme.spacing.lg} ${theme.spacing.xxxxl}`,
      background: `${theme.colors.everglade}e0`,
      backdropFilter: "blur(12px)",
      borderBlock: "1px solid oklch(100% 0 0 / 0.08)",
      padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
      marginTop: "auto",
    },
    h1: {
      fontFamily: theme.fonts.headline,
      fontSize: isMobile ? "clamp(3rem, 12vw, 5rem)" : "clamp(4rem, 10vw, 12rem)",
      fontWeight: 800,
      lineHeight: 0.9,
      letterSpacing: "-0.04em",
      textTransform: "uppercase",
      color: "oklch(100% 0 0)",
      margin: `0 0 ${theme.spacing.sm}`,
      maxWidth: "14ch",
    },
    h1Accent: {
      fontFamily: theme.fonts.headline,
      color: theme.colors.heroAccent,
      marginInlineStart: theme.spacing.lg,
      letterSpacing: "-0.025em",
      fontSize: "1em",
      mixBlendMode: "multiply",
    },
    copyText: {
      color: "rgba(244,244,241,0.82)",
      fontSize: "clamp(1.375rem, 2.3vw, 1.625rem)",
      lineHeight: 1.35,
      maxWidth: "56rem",
      textAlign: "center",
      margin: 0,
      fontWeight: 400,
    },
    statValue: {
      color: theme.colors.white,
      fontWeight: 800,
      fontSize: isMobile ? "1.125rem" : "1.775rem",
      letterSpacing: "-0.03em",
      lineHeight: 1,
    },
    statLabel: {
      color: theme.colors.white,
      fontSize: "0.625rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginTop: theme.spacing.xs,
    },
  };

  const headlineEl = (
    <h1 style={styles.h1}>
      {titleLine1}
      <span style={styles.h1Accent}>{titleLine2}</span>
    </h1>
  );

  const copyEl = subtitle ? (
    <div style={styles.copyText}>
      <RichText
        value={subtitle}
        paragraphStyle={{
          fontSize: "inherit",
          color: "inherit",
          lineHeight: "inherit",
          textAlign: "center",
        }}
      />
    </div>
  ) : (
    <p style={styles.copyText}>
      Our goal is to help Texas homeowners navigate the roof replacement process—making it easier
      and less stressful from start to finish.
    </p>
  );

  const statsEl = STATS.map(({ value, label }) => (
    <div key={label} style={{ textAlign: isMobile ? "left" : "center" }}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  ));

  return (
    <section ref={sectionRef} style={styles.section}>
      {/* Background layers — always absolute */}
      {skyImage && (
        <div
          ref={skyWrapRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            willChange: "transform",
          }}
        >
          <ShaderEffect src={optimized(skyImage, 1280)} style={styles.sky} />
        </div>
      )}
      <div style={styles.overlay} />
      {foregroundImage && (
        <img ref={houseRef} aria-hidden="true" alt="" src={foregroundImage} style={styles.house} />
      )}

      {isMobile ? (
        /* ── MOBILE: normal flex-column flow, nothing overlaps ── */
        <>
          <div style={styles.mobileContent}>
            {headlineEl}
            {copyEl}
          </div>
          <div style={styles.statBarMobile}>{statsEl}</div>
        </>
      ) : (
        /* ── DESKTOP: layered absolute positioning ── */
        <>
          <div style={styles.headlineLayerDesktop}>{headlineEl}</div>
          <div style={styles.copyLayerDesktop}>{copyEl}</div>
          <div style={styles.statBarDesktop}>{statsEl}</div>
        </>
      )}
    </section>
  );
};
