import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import type React from "react";
import type { CSSProperties } from "react";
import { useRef } from "react";
// Plugins registered once in main.tsx — do not re-register here.
import { ChromaFlow, Dither, ImageTexture, Shader } from "shaders/react";

import { useIsMobile } from "../../hooks/is-mobile";
import { RichText } from "../../portableText/rich-text";
import { isSanityCdnUrl, sanityImageUrl } from "../../sanity/image-url";
import { theme } from "../../theme";
import type { HeroProps } from "../../types";
import { DEFAULT_HERO_EYEBROW } from "./hero-constants";

const STATS = [
  { label: "Best Roofer Award", value: "7×" },
  { label: "Google Rating", value: "★ 4.7" },
  { label: "Projects Completed", value: "500+" },
  { label: "Serving Austin", value: "12yrs" },
];

const optimized = (url: string, w: number) =>
  isSanityCdnUrl(url) ? sanityImageUrl(url, { fit: "crop", q: 78, w }) : url;

function ShaderEffect({ src, style }: { src: string; style: CSSProperties }) {
  return (
    <Shader className="sky" style={style}>
      <ChromaFlow
        baseColor="#ffffff"
        downColor="#ffffff"
        id="idmostv5d9xi2rmvn45"
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
        colorA="#2e73b3"
        colorB="#c3d5e3"
        id="heroPillDither"
        pattern="bayer8"
        pixelSize={2}
        threshold={{
          channel: "alpha",

          inputMax: 1,

          inputMin: 0,

          outputMax: 1,

          outputMin: 0,

          source: "idmostv5d9xi2rmvn45",

          type: "map",
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
  badgeText = DEFAULT_HERO_EYEBROW,
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
          end: "bottom top",
          invalidateOnRefresh: true,
          scrub: 1,
          start: "top top",
          trigger: sectionRef.current,
        };

        if (skyWrapRef.current) {
          gsap.to(skyWrapRef.current, {
            scrollTrigger: trigger,
            yPercent: -35,
          });
        }
        if (houseRef.current) {
          gsap.to(houseRef.current, {
            ease: "none",
            scrollTrigger: trigger,
            yPercent: -20,
          });
        }
      });
    },
    { scope: sectionRef }
  );

  const styles: Record<string, CSSProperties> = {
    copyLayerDesktop: {
      bottom: "clamp(15%, 10vw, 35%)",
      display: "flex",
      justifyContent: "center",
      left: "10vw",
      padding: theme.spacing.xxxxl,
      pointerEvents: "none",
      position: "absolute",
      right: "10vw",
      zIndex: 15,
    },
    copyText: {
      color: "rgba(244,244,241,0.82)",
      fontSize: "clamp(1.375rem, 2.3vw, 1.625rem)",
      fontWeight: 400,
      lineHeight: 1.35,
      margin: 0,
      maxWidth: "56rem",
      textAlign: "center",
    },
    eyebrow: {
      color: theme.colors.accentLight,
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.2em",
      textAlign: "center",
      textTransform: "uppercase",
    },
    h1: {
      color: "oklch(100% 0 0)",
      fontFamily: theme.fonts.headline,
      fontSize: isMobile
        ? "clamp(3rem, 12vw, 5rem)"
        : "clamp(4rem, 10vw, 12rem)",
      fontWeight: 800,
      letterSpacing: "-0.04em",
      lineHeight: 0.9,
      margin: `0 0 ${theme.spacing.sm}`,
      maxWidth: "14ch",
      textTransform: "uppercase",
    },
    h1Accent: {
      color: theme.colors.heroAccent,
      fontFamily: theme.fonts.headline,
      fontSize: "1em",
      letterSpacing: "-0.025em",
      marginInlineStart: theme.spacing.lg,
      mixBlendMode: "multiply",
    },

    /* ── DESKTOP: absolute content layers ── */
    headlineLayerDesktop: {
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.lg,
      inset: "auto 0 50% 0",
      padding: `clamp(${theme.spacing.xxxxxxxxl}, 14vh, ${theme.spacing.navClearance}) ${theme.spacing.xxxxl} 0`,
      pointerEvents: "none",
      position: "absolute",
      textAlign: "center",
      zIndex: 5,
    },
    house: {
      bottom: isMobile ? "-10%" : "min(-15vw, -15%)",
      display: "block",
      filter: "contrast(1.2) brightness(0.8)",
      height: "auto",
      left: 0,
      minWidth: 1500,
      pointerEvents: "none",
      position: "absolute",
      width: "100%",
      willChange: "transform",
      zIndex: 10,
    },

    /* ── MOBILE: flex-column in-flow content ── */
    mobileContent: {
      alignItems: "center",
      display: "flex",
      flex: 1,
      flexDirection: "column",
      gap: theme.spacing.xxl,
      padding: `${theme.spacing.navClearance} ${theme.spacing.xxl} ${theme.spacing.xxxxl}`, // top clears the mobile nav bar
      position: "relative",
      textAlign: "center",
      zIndex: 15,
    },
    overlay: {
      background:
        "linear-gradient(to bottom, oklch(18.97% 0.008 107.13 / 0.45) 0%, oklch(18.97% 0.008 107.13 / 0.15) 40%, oklch(18.97% 0.008 107.13 / 0.55) 100%)",
      inset: 0,
      position: "absolute",
      zIndex: 2,
    },
    /* Section is flex-column on mobile so content stacks in flow */
    section: {
      background: theme.colors.black,
      borderRadius: isMobile ? "0" : theme.radius.large,
      boxSizing: "border-box",
      display: isMobile ? "flex" : "block",
      flexDirection: isMobile ? "column" : undefined,
      margin: isMobile ? 0 : theme.spacing.lg,
      minHeight: isMobile ? "auto" : "98vh",
      overflow: "hidden",
      position: "relative",
      width: isMobile ? "100%" : `calc(100% - 2 * ${theme.spacing.lg})`,
    },

    /* ── Image layers — always absolute (background) ── */
    sky: {
      display: "block",
      height: "130%",
      objectFit: "cover",
      objectPosition: "center",
      width: "100%",
    },
    statBarDesktop: {
      backdropFilter: "blur(12px)",
      background: `${theme.colors.everglade}e0`,
      borderTop: "1px solid oklch(100% 0 0 / 0.09)",
      bottom: 0,
      display: "flex",
      flexWrap: "wrap",
      gap: `${theme.spacing.xxxxl} ${theme.spacing.section}`,
      justifyContent: "center",
      left: 0,
      padding: `${theme.spacing.xl} ${theme.spacing.xxxxl}`,
      position: "absolute",
      right: 0,
      zIndex: 25,
    },
    statBarMobile: {
      backdropFilter: "blur(12px)",
      background: `${theme.colors.everglade}e0`,
      borderBlock: "1px solid oklch(100% 0 0 / 0.08)",
      display: "grid",
      gap: `${theme.spacing.lg} ${theme.spacing.xxxxl}`,
      gridTemplateColumns: "repeat(2, 1fr)",
      marginTop: "auto",
      padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
      position: "relative",
      zIndex: 25,
    },
    statLabel: {
      color: theme.colors.white,
      fontSize: "0.625rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      marginTop: theme.spacing.xs,
      textTransform: "uppercase",
    },

    statValue: {
      color: theme.colors.white,
      fontSize: isMobile ? "1.125rem" : "1.775rem",
      fontWeight: 800,
      letterSpacing: "-0.03em",
      lineHeight: 1,
    },
  };

  const headlineEl = (
    <>
      {badgeText && <span style={styles.eyebrow}>{badgeText}</span>}
      <h1 style={styles.h1}>
        {titleLine1}
        <span style={styles.h1Accent}>{titleLine2}</span>
      </h1>
    </>
  );

  const copyEl = subtitle ? (
    <div style={styles.copyText}>
      <RichText
        paragraphStyle={{
          color: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          textAlign: "center",
        }}
        value={subtitle}
      />
    </div>
  ) : (
    <p style={styles.copyText}>
      Our goal is to help Texas homeowners navigate the roof replacement
      process—making it easier and less stressful from start to finish.
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
            inset: 0,
            position: "absolute",
            willChange: "transform",
            zIndex: 1,
          }}
        >
          <ShaderEffect src={optimized(skyImage, 1280)} style={styles.sky} />
        </div>
      )}
      <div style={styles.overlay} />
      {foregroundImage && (
        // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
        <img
          alt=""
          aria-hidden="true"
          ref={houseRef}
          src={foregroundImage}
          style={styles.house}
        />
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
