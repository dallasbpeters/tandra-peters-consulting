import type { Variants } from "motion/react";

import { Xmark, Play } from "iconoir-react";
import { motion, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";

import { useIsMobile } from "../hooks/isMobile";
import { mix, theme } from "../theme";

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "grid",
  placeContent: "center",
  placeItems: "stretch",
  padding: `${theme.spacing.xxxxl}`,
  background: theme.colors.everglade,
  gap: theme.spacing.xxxxl,
};

export const BirdcreekVideoBanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const embedUrl = `https://player.vimeo.com/video/834503838?h=f049c62156`;
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile(1100);
  // Drive the entrance with useInView (not whileInView): on first render inView is
  // false so `initial` paints, then the observer flips it true on the next tick and
  // Motion actually tweens — reliable even when the banner is in view on load
  // (whileInView can snap straight to the end state before `initial` paints).
  const bannerRef = useRef<HTMLDivElement>(null);
  const dialogBackdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: theme.spacing.xxxxl,
    display: "grid",
    placeContent: "stretch",
    placeItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? theme.typography.size100 : theme.typography.size100,
    fontWeight: 700,
    color: theme.colors.white,
    textAlign: "center",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    cursor: "pointer",
    maxWidth: isMobile ? "none" : 800,
    borderRadius: theme.radius.medium,
    cornerShape: "super-ellipse(50%)",
    transition: "box-shadow 0.3s ease",
    zIndex: 2,
    boxShadow: isHovered
      ? `0 0 0 2px ${theme.colors.heroAccent}`
      : `0 0 0 1px ${theme.colors.accent}`,
  };

  const modalContentStyle: React.CSSProperties = {
    position: "relative",
    height: "auto",
    aspectRatio: "16/7",
    display: "grid",
    placeContent: "center",
  };

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "grid",
    placeContent: "center",
    placeItems: "center",
  };

  const buttonStyle: React.CSSProperties = {
    position: "absolute",
    top: 30,
    right: 30,
    zIndex: 1000,
    border: "none",
    backgroundColor: isHovered ? theme.colors.heroAccent : theme.colors.white,
    color: theme.colors.everglade,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    display: "grid",
    placeItems: "center",
    blockSize: 44,
    inlineSize: 44,
    justifySelf: "center",
  };

  const iframeStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    minWidth: "90vw",
    aspectRatio: "20/9",
    borderRadius: theme.radius.large,
  };
  const contentStyle: React.CSSProperties = {
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: "none",
    display: "grid",
    placeContent: "center",
    backgroundColor: mix(theme.colors.black, 70),
    padding: theme.spacing.md,
    borderRadius: `0 0 ${theme.radius.medium} ${theme.radius.medium}`,
  };

  const cardVariants: Variants = {
    offscreen: {
      scale: 0.5,
      opacity: 0,
      originY: "100%",
    },
    onscreen: {
      originY: "100%",
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        bounce: 0,
        duration: 0.8,
      },
    },
  };

  return (
    <div
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      <motion.div
        ref={bannerRef}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ amount: 0.8 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={imageContainerStyle}
      >
        <motion.button style={buttonStyle} variants={cardVariants} onClick={() => setIsOpen(true)}>
          <Play />
        </motion.button>
        <motion.img
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          variants={cardVariants}
          alt="Watch the video"
          style={imageStyle}
          src="/poster.jpeg"
          onClick={() => setIsOpen(true)}
          className="open-btn"
        />
        <motion.div style={contentStyle} variants={cardVariants}>
          <motion.h2 style={titleStyle}>
            Birdcreek Roofing - 10 Years of Helping Texas Homeowners
          </motion.h2>
        </motion.div>
      </motion.div>

      {/* Modal Overlay */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="video-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={dialogBackdrop}
            onClick={() => setIsOpen(false)}
          >
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                style={{ ...buttonStyle, top: -24, right: 0 }}
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                <Xmark />
              </button>

              {/* Aspect Ratio Responsive Wrapper */}
              <iframe
                title="vimeo-player"
                src={embedUrl}
                style={iframeStyle}
                height="640"
                width="360"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
