import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import React, { useMemo, useRef } from "react";
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
        colorA="#f8f4b1"
        colorB="#f9f8e7"
        colorC="#fbf8ea"
        colorD="#eef3ac"
        colorE="#eef3ac"
        positionA={{ x: 0.24, y: 0.08 }}
        positionB={{ x: 0.81, y: 0.19 }}
        positionC={{ x: 0.68, y: 0.64 }}
        positionD={{ x: 0.35, y: 1 }}
        positionE={{ x: 0.09, y: 0.22 }}
        smoothness={2.1}
      />
    </Shader>
  );
}

export const About: React.FC<AboutProps> = ({ body }) => {
  const isMobile = useIsMobile();
  const isTablet = useIsMobile(1724);
  const sectionRef = useRef<HTMLElement>(null);
  const richBody = useMemo(() => asRichTextValue(body, DEFAULT_ABOUT_PARAGRAPHS), [body]);

  /* Scroll-scrub: words fade in document order; each line's gradient sweep is
     scheduled to start with that line's first word and last through its words. */
  useGSAP(
    () => {
      const trigger = sectionRef.current?.querySelector(".about-body-text");
      if (!trigger) return;

      const split = SplitText.create(".about-body-text p", {
        type: "lines,words",
        linesClass: "about-split-line",
        wordsClass: "about-split-word",
      });

      const wordStagger = 0.04;

      // Warm wash — matches ShaderEffect palette so the sweep reads on scroll
      const lineGradient = "linear-gradient(to right, #f8f4b1 0%, rgba(248, 244, 177, 0) 88%)";

      gsap.set(split.lines, {
        backgroundImage: lineGradient,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0% 50%",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger,
          start: "top 75%",
          end: "bottom 60%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // fromTo keeps start/end values on the tween so scrub reverses cleanly
      tl.fromTo(
        split.words,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          duration: wordStagger,
          stagger: { each: wordStagger, from: "start" },
          immediateRender: false,
        },
        0,
      );

      // Anchor each line's gradient to its own words — not a global line index —
      // so paragraph 2's wash cannot run ahead of paragraph 2's word reveal.
      split.lines.forEach((line) => {
        const wordsInLine = [...line.querySelectorAll<HTMLElement>(".about-split-word")];
        if (!wordsInLine.length) return;

        const firstWordIndex = split.words.indexOf(wordsInLine[0]);
        if (firstWordIndex < 0) return;

        const lineStart = firstWordIndex * wordStagger;
        const lineDuration = wordsInLine.length * wordStagger;

        tl.fromTo(
          line,
          { backgroundSize: "0% 100%" },
          {
            backgroundSize: "100% 100%",
            ease: "none",
            duration: lineDuration,
            immediateRender: false,
          },
          lineStart,
        );
      });

      ScrollTrigger.refresh();

      return () => split.revert();
    },
    { scope: sectionRef, dependencies: [body] },
  );

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    overflow: "hidden",
    position: "relative",
    padding: isMobile ? `0` : `${theme.spacing.sectionHero} ${theme.spacing.lg}`,
  };

  const shaderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    height: "100%",
    zIndex: 0,
  };

  const paragraphWrapperStyle: React.CSSProperties = {
    padding: theme.spacing.xxxxl,
  };
  const tandraImgStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: -100,
    width: 600,
    zIndex: 3,
    display: isTablet ? "none" : "block",
  };

  const pStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    lineHeight: 1.6,
    fontSize: "clamp(1.3rem, 4vw, 1.7rem)",
    fontWeight: 500,
    paddingInlineStart: theme.spacing.md,
    marginBottom: theme.spacing.xxxxl,
    zIndex: 10,
    mixBlendMode: "exclusion",
  };

  return (
    <section
      ref={sectionRef}
      id="about-tandra"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="about-heading"
    >
      <img style={tandraImgStyle} id="about-tandra-img" src="./tandra.webp" alt="Tandra Peters" />
      <div
        className={`${layoutClass.containerWideAboutGrid} lg-grid`}
        style={paragraphWrapperStyle}
      >
        <style>{`
          .lg-grid { grid-template-columns: 1fr !important; }
          .lg-col  { grid-column: 1 !important; z-index: 10; }
          .md-block { display: block !important; }
          .about-split-line {
            display: block;
            width: fit-content;
            max-width: 100%;
          }
        `}</style>

        <div className="lg-col">
          {/* Text body — GSAP targets every <p> inside .about-body-text */}
          <div className="about-body-text">
            <p style={{ ...pStyle, fontWeight: 700 }}>Hi, I&apos;m Tandra.</p>
            <RichText value={richBody} paragraphStyle={pStyle} />
          </div>
        </div>
      </div>

      <ShaderEffect style={shaderStyle} />
    </section>
  );
};
