import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import React, { useEffect, useMemo, useRef } from "react";
import { Shader, MultiPointGradient } from "shaders/react";

import { useIsMobile } from "../hooks/isMobile";
import { RichText } from "../portableText/RichText";
import { asRichTextValue } from "../portableText/value";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { AboutProps } from "../types";

// Plugins registered once in main.tsx — do not re-register here.

const DEFAULT_ABOUT_PARAGRAPHS = [
  "Tandra Peters is an Austin, Texas roofing consultant who translates complex roof science into decisions homeowners can trust. She focuses on what matters for durability, warranty coverage, and long-term value—not quick sales pitches.",
  "As a Birdcreek Roofing consultant, her recommendations sit inside the same company that performs the work—so there is a straight line from advice to professional installation and project management. Her approach is personal and practical, helping homeowners understand what matters now, what can wait, and what will protect their home for the long haul.",
];

function ShaderEffect({ style }: { style: React.CSSProperties }) {
  return (
    <Shader style={style}>
      <MultiPointGradient
        colorA="#f5f6e9"
        colorB="#f9f8e7"
        colorC="#fbf8ea"
        colorD="#fdfcf2"
        colorE="#eefbef"
        positionA={{ x: 0.24, y: 0.08 }}
        positionB={{ x: 0.81, y: 0.19 }}
        positionC={{ x: 0.68, y: 0.64 }}
        positionD={{ x: 0.35, y: 1 }}
        positionE={{ x: 0.29, y: 0.22 }}
        smoothness={2.1}
      />
    </Shader>
  );
}

const ABOUT_MOBILE_BREAKPOINT = 800;
const ABOUT_STACKED_BREAKPOINT = 1224;

export const About: React.FC<AboutProps> = ({ body }) => {
  const isMobile = useIsMobile(ABOUT_MOBILE_BREAKPOINT);
  const isStacked = useIsMobile(ABOUT_STACKED_BREAKPOINT);
  const sectionRef = useRef<HTMLElement>(null);
  const richBody = useMemo(() => asRichTextValue(body, DEFAULT_ABOUT_PARAGRAPHS), [body]);
  /* Scroll-scrub: per-line word fade + gradient clip stay paired so scrub reverses cleanly. */
  useGSAP(
    () => {
      const trigger = sectionRef.current?.querySelector(".about-body-text");
      if (!trigger) return;

      const split = SplitText.create(".about-body-text p", {
        type: "lines,words",
        linesClass: "about-split-line",
        wordsClass: "about-split-word",
        // SplitText defaults add aria-label on <p>, which axe flags as prohibited.
        aria: "none",
      });

      const wordStagger = 0.04;

      // Warm wash — matches ShaderEffect palette so the sweep reads on scroll

      gsap.set(split.words, { opacity: 0 });
      gsap.set(split.lines, {
        clipPath: "inset(0 100% 0 0)",
      });

      const tl = gsap.timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger,
          start: "top 75%",
          end: "bottom 60%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // Pair each line's words + clip-path at the same timeline slot so reverse
      // scroll cannot leave a visible gradient strip after words fade out.
      split.lines.forEach((line) => {
        const wordsInLine = [...line.querySelectorAll<HTMLElement>(".about-split-word")];
        if (!wordsInLine.length) return;

        const firstWordIndex = split.words.indexOf(wordsInLine[0]);
        if (firstWordIndex < 0) return;

        const lineStart = firstWordIndex * wordStagger;
        const lineDuration = wordsInLine.length * wordStagger;

        tl.fromTo(
          wordsInLine,
          { opacity: 0 },
          {
            opacity: 1,
            duration: wordStagger,
            stagger: { each: wordStagger, from: "start" },
          },
          lineStart,
        );

        tl.fromTo(
          line,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: lineDuration,
          },
          lineStart,
        );
      });

      const refreshAfterFonts = () => {
        ScrollTrigger.refresh();
      };

      if (document.fonts?.ready) {
        void document.fonts.ready.then(refreshAfterFonts);
      } else {
        refreshAfterFonts();
      }

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        split.revert();
      };
    },
    { scope: sectionRef, dependencies: [body] },
  );

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [isMobile, isStacked]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    overflow: "hidden",
    position: "relative",
    padding: isMobile ? 0 : `${theme.spacing.sectionHero} ${theme.spacing.lg}`,
  };

  const shaderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    height: "100%",
    zIndex: 0,
  };

  const paragraphWrapperStyle: React.CSSProperties = {
    padding: isMobile ? theme.spacing.lg : theme.spacing.xxxxl,
  };

  const tandraPhoto = "url(/tandra.webp)";
  const stackedPhotoBackdrop = `linear-gradient(45deg, ${theme.colors.black}, ${theme.colors.paper})`;

  const imagewrapperStyle: React.CSSProperties = {
    position: "relative",
    overflow: "clip",
    height: isStacked ? 200 : "100%",
    width: isStacked ? 200 : 400,
    borderRadius: isStacked ? theme.radius.pill : 0,
    zIndex: 10,
    backgroundImage: isStacked ? `${tandraPhoto}, ${stackedPhotoBackdrop}` : tandraPhoto,
    // First layer = photo (top); second = gradient fill behind it in the pill.
    backgroundSize: isStacked ? "contain, cover" : isMobile ? "contain" : "cover",
    backgroundPosition: isStacked ? "60% 0, center" : "60% 0",
    backgroundRepeat: "no-repeat",
  };

  const cardStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isStacked ? "1fr" : ".5fr 1fr",
    gridTemplateRows: isStacked ? "1fr auto" : "1fr",
    backgroundColor: theme.colors.paper,
    padding: isStacked ? theme.spacing.xxxxl : 0,
    borderRadius: theme.radius.large,
    boxShadow: theme.shadow.md,
    gap: isStacked ? theme.spacing.lg : 0,
    contain: "paint",
    borderBlockEnd: `8px solid ${theme.colors.heroAccent}`,
  };

  const bodyTextStyle: React.CSSProperties = {
    padding: isStacked ? 0 : theme.spacing.xxxxl,
  };

  const pStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    lineHeight: 1.6,
    fontSize: "clamp(1.3rem, 4vw, 1.7rem)",
    fontWeight: 500,
    zIndex: 12,
  };

  return (
    <section
      ref={sectionRef}
      id="about-tandra"
      className={isMobile ? "content-section" : layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="about-heading"
    >
      <div
        className={`${layoutClass.containerWideAboutGrid} lg-grid`}
        style={paragraphWrapperStyle}
      >
        <div className="about-card" style={cardStyle}>
          <div style={imagewrapperStyle} />
          {/* Text body — GSAP targets every <p> inside .about-body-text */}
          <div className="about-body-text" style={bodyTextStyle}>
            <p style={{ ...pStyle, fontWeight: 700 }}>Hi, I&apos;m Tandra.</p>
            <RichText value={richBody} paragraphStyle={pStyle} />
          </div>
        </div>
      </div>

      <ShaderEffect style={shaderStyle} />
    </section>
  );
};
