import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import { motion } from "motion/react";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";

import { useIsMobile } from "../hooks/is-mobile";
import { RichText } from "../portableText/rich-text";
import { asRichTextValue } from "../portableText/value";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { AboutProps } from "../types";

// Plugins registered once in main.tsx — do not re-register here.

const DEFAULT_ABOUT_PARAGRAPHS = [
  "Tandra Peters is an Austin, Texas roofing consultant who translates complex roof science into decisions homeowners can trust. She focuses on what matters for durability, warranty coverage, and long-term value—not quick sales pitches.",
  "As a Birdcreek Roofing consultant, her recommendations sit inside the same company that performs the work—so there is a straight line from advice to professional installation and project management. Her approach is personal and practical, helping homeowners understand what matters now, what can wait, and what will protect their home for the long haul.",
];

const ABOUT_MOBILE_BREAKPOINT = 800;
const ABOUT_STACKED_BREAKPOINT = 1224;

const cssUrl = (url: string) => `url("${url.replaceAll('"', '\\"')}")`;

export const About: React.FC<AboutProps> = ({
  badgeText,
  badgeSubtext,
  body,
  imageSrc,
  title,
}) => {
  const isMobile = useIsMobile(ABOUT_MOBILE_BREAKPOINT);
  const isStacked = useIsMobile(ABOUT_STACKED_BREAKPOINT);
  const sectionRef = useRef<HTMLElement>(null);
  const richBody = useMemo(
    () => asRichTextValue(body, DEFAULT_ABOUT_PARAGRAPHS),
    [body]
  );
  /* Scroll-scrub: per-line word fade + gradient clip stay paired so scrub reverses cleanly. */
  useGSAP(
    () => {
      const trigger = sectionRef.current?.querySelector(".about-body-text");
      if (!trigger) {
        return;
      }

      const split = SplitText.create(".about-body-copy p", {
        // SplitText defaults add aria-label on <p>, which axe flags as prohibited.
        aria: "none",

        linesClass: "about-split-line",
        type: "lines",
      });

      // Warm wash — matches ShaderEffect palette so the sweep reads on scroll

      gsap.set(split.lines, {
        clipPath: "inset(0 100% 0 0)",
      });

      const tl = gsap.timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          end: "bottom 70%",
          invalidateOnRefresh: true,
          scrub: true,
          start: "top 85%",
          trigger,
        },
      });

      // Pair each line's words + clip-path at the same timeline slot so reverse
      // scroll cannot leave a visible gradient strip after words fade out.
      for (const line of split.lines) {
        tl.fromTo(
          line,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
          }
        );
      }

      const refreshAfterFonts = () => {
        ScrollTrigger.refresh();
      };

      if (document.fonts?.ready) {
        document.fonts.ready.then(refreshAfterFonts);
      } else {
        refreshAfterFonts();
      }

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        split.revert();
      };
    },
    { dependencies: [badgeSubtext, badgeText, body], scope: sectionRef }
  );

  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    overflow: "hidden",
    padding: isMobile ? 0 : `${theme.spacing.xl}`,
    position: "relative",
  };

  const paragraphWrapperStyle: React.CSSProperties = {
    padding: isMobile ? theme.spacing.lg : theme.spacing.xxxxl,
  };

  const tandraPhoto = cssUrl(imageSrc ?? "/tandra.webp");
  const stackedPhotoBackdrop = `linear-gradient(45deg, ${theme.colors.black}, ${theme.colors.paper})`;

  const unstackedBackgroundSize = isMobile ? "contain" : "cover";

  const imagewrapperStyle: React.CSSProperties = {
    backgroundImage: isStacked
      ? `${tandraPhoto}, ${stackedPhotoBackdrop}`
      : tandraPhoto,
    backgroundPosition: isStacked ? "60% 0, center" : "60% 0",
    backgroundRepeat: "no-repeat",

    // First layer = photo (top); second = gradient fill behind it in the pill.
    backgroundSize: isStacked ? "contain" : unstackedBackgroundSize,
    borderRadius: isStacked ? theme.radius.pill : 0,
    height: isStacked ? 200 : "100%",
    overflow: "clip",
    position: "relative",
    width: isStacked ? 200 : 400,
    zIndex: 10,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderBlockEnd: `8px solid ${theme.colors.heroAccent}`,
    borderRadius: theme.radius.large,
    boxShadow: theme.shadow.md,
    color: theme.colors.white,
    contain: "paint",
    padding: isStacked ? theme.spacing.xxxxl : 0,
  };

  const bodyTextStyle: React.CSSProperties = {
    padding: isStacked ? 0 : theme.spacing.xxxxl,
  };

  const eyebrowStyle: React.CSSProperties = {
    color: theme.colors.heroAccent,
    fontFamily: theme.fonts.headline,
    fontSize: isStacked ? "0.78rem" : "0.84rem",
    fontWeight: 800,
    letterSpacing: 0,
    margin: `0 0 ${theme.spacing.sm}`,
    textTransform: "uppercase",
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.white,
    fontFamily: theme.fonts.headline,
    fontSize: isStacked ? "2.5rem" : "3.75rem",
    fontWeight: 800,
    letterSpacing: 0,
    lineHeight: 0.95,
    margin: `0 0 ${theme.spacing.lg}`,
  };

  const pStyle: React.CSSProperties = {
    color: "inherit",
    fontSize: "clamp(1.1rem, 4vw, 1.3rem)",
    fontWeight: 500,
    lineHeight: 1.6,
    zIndex: 12,
  };

  const headingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, transition: { duration: 0.6 }, y: 0 },
  };

  const badgeParts = [badgeText, badgeSubtext].filter(Boolean) as string[];
  const eyebrow = badgeParts.length
    ? badgeParts.map((part, i) => (
        <span key={part}>
          {part}
          {i < badgeParts.length - 1 ? <span> · </span> : null}
        </span>
      ))
    : null;

  return (
    <section
      aria-labelledby="about-heading"
      className={isMobile ? "content-section" : layoutClass.sectionPadded}
      id="about-tandra"
      ref={sectionRef}
      style={sectionStyle}
    >
      <div
        className={`${layoutClass.containerWideAboutGrid} lg-grid`}
        style={paragraphWrapperStyle}
      >
        <div className="about-card about-bio-card" style={cardStyle}>
          <div aria-hidden="true" style={imagewrapperStyle} />
          {/* Text body — GSAP targets all text inside .about-body-text */}
          <div className="about-body-text" style={bodyTextStyle}>
            {eyebrow ? <p style={eyebrowStyle}>{eyebrow}</p> : null}
            <motion.h2
              id="about-heading"
              initial="hidden"
              style={titleStyle}
              variants={headingVariants}
              viewport={{ amount: 0.3 }}
              whileInView="visible"
            >
              {title ?? "Hi, I'm Tandra."}
            </motion.h2>
            <div className="about-body-copy">
              <RichText paragraphStyle={pStyle} value={richBody} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
