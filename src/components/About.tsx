import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import SplitText from "gsap/SplitText";
import { motion } from "motion/react";
import React, { useRef } from "react";
import { Shader, FilmGrain, MultiPointGradient } from "shaders/react";

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
        colorA="#e6f5ef"
        colorB="#e6f5ef"
        colorC="#f5eebf"
        colorD="#e6f5ef"
        colorE="#5dc26c"
        positionA={{ x: 0.24, y: 0.08 }}
        positionB={{ x: 0.81, y: 0.19 }}
        positionC={{ x: 0.68, y: 0.64 }}
        positionD={{ x: 0.35, y: 1 }}
        positionE={{ x: 0.09, y: 0.22 }}
        smoothness={2.1}
      />
      <FilmGrain bias={6.5} strength={0.725} />
    </Shader>
  );
}

export const About: React.FC<AboutProps> = ({ body }) => {
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const richBody = asRichTextValue(body, DEFAULT_ABOUT_PARAGRAPHS);

  /* Scroll-scrub line reveal — SplitText breaks each <p> into rendered lines,
     then each line scrubs from opacity 0.2 → 1 as it enters the reading zone. */
  useGSAP(
    () => {
      // One split across all paragraphs — words stay in document order
      // so paragraph 1 always finishes before paragraph 2 starts.
      const split = SplitText.create(".about-body-text p", {
        type: "words",
        wordsClass: "about-split-word",
      });

      gsap.set(split.words, { opacity: 0 });

      // Single ScrollTrigger for the whole block, one staggered timeline.
      // scrub maps timeline progress to scroll, and because words are ordered
      // paragraph-1 → paragraph-2, the second paragraph only reveals after
      // the first is done regardless of viewport size.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".about-body-text",
          start: "top 75%",
          end: "bottom 40%",
          scrub: 1,
        },
      });

      tl.to(split.words, {
        opacity: 1,
        ease: "none",
        stagger: { each: 0.04, from: "start" },
      });
    },
    { scope: sectionRef },
  );

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    overflow: "hidden",
    position: "relative",
    padding: isMobile ? "2rem 1rem" : "8rem 1rem",
  };

  const shaderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    height: "100%",
    zIndex: 0,
  };

  const certificationsStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(60px, auto))",
    gap: "2rem",
    placeItems: "start",
    zIndex: 5,
  };

  const certificationImageStyle: React.CSSProperties = {
    width: "auto",
    height: "4rem",
    zIndex: 5,
  };

  const pStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    lineHeight: 1.6,
    fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
    marginBottom: "2rem",
    zIndex: 10,
  };

  return (
    <section
      ref={sectionRef}
      id="about-tandra"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="about-heading"
    >
      <div className={`${layoutClass.containerWideAboutGrid} lg-grid`}>
        <style>{`
          .lg-grid { grid-template-columns: 1fr !important; }
          .lg-col  { grid-column: 1 !important; z-index: 10; }
          .md-block { display: block !important; }
        `}</style>

        <div className="lg-col">
          {/* Text body — GSAP targets every <p> inside .about-body-text */}
          <div className="about-body-text">
            <RichText value={richBody} paragraphStyle={pStyle} />
          </div>

          {/* Certifications — keep the motion entrance, separate from text reveal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            style={certificationsStyle}
          >
            <img
              style={certificationImageStyle}
              height="4rem"
              width="auto"
              src="/roofing-soloar-alliance.png"
              alt="Roofing Solar Alliance"
            />
            <img
              style={certificationImageStyle}
              height="4rem"
              width="auto"
              src="/roof-pro.png"
              alt="Roof Pro"
            />
            <img
              style={certificationImageStyle}
              height="4rem"
              width="auto"
              src="/tamko-pro.png"
              alt="Tamko Pro"
            />
            <img
              style={certificationImageStyle}
              height="4rem"
              width="auto"
              src="/gaf-master-elite.png"
              alt="GAF Master Elite"
            />
          </motion.div>
        </div>
      </div>

      <ShaderEffect style={shaderStyle} />
    </section>
  );
};
