import { Xmark, Play } from "iconoir-react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useIsMobile } from "../hooks/isMobile";
import { theme } from "../theme";

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: `${theme.spacing.xxxxl}`,
  display: "grid",
  placeContent: "center",
  placeItems: "center",
  background: theme.colors.everglade,
  gap: theme.spacing.xxxxl,
};

const contentStyle: React.CSSProperties = {
  width: "min(95vw, 1200px)",
  maxWidth: 1200,
  zIndex: 10,
  position: "absolute",
  bottom: "20%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  display: "grid",
  placeContent: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: theme.typography.size400,
  fontWeight: 700,
  color: theme.colors.white,
  textAlign: "center",
};

export const BirdcreekVideoBanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const embedUrl = `https://player.vimeo.com/video/834503838?h=f049c62156`;
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const isInView = useInView(ref);
  const dialogBackdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: theme.spacing.xxxxl,
    display: "grid",
    placeContent: "center",
    placeItems: "center",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    cursor: "pointer",
    maxWidth: isMobile ? "none" : 600,
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
    aspectRatio: "16/9",
    display: "grid",
    placeContent: "center",
  };

  const buttonStyle: React.CSSProperties = {
    zIndex: 1000,
    background: "none",
    border: "none",
    backgroundColor: isHovered ? theme.colors.heroAccent : theme.colors.everglade,
    color: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.medium,
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
    minWidth: isMobile ? 380 : "760px",
    aspectRatio: "20/9",
    borderRadius: theme.radius.large,
  };
  useEffect(() => {
    console.log("Element is in view: ", isInView);
  }, [isInView]);

  return (
    <div
      ref={ref}
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      <div style={contentStyle}>
        <motion.button
          style={buttonStyle}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={() => setIsOpen(true)}
        >
          <Play />
        </motion.button>
        <h2 style={titleStyle}>Birdcreek Roofing - 10 Years of Helping Texas Homeowners</h2>
      </div>

      <img
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        alt="Watch the video"
        style={imageStyle}
        src="/scott-wade.jpg"
        onClick={() => setIsOpen(true)}
        className="open-btn"
      />

      {/* Modal Overlay */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="video-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={dialogBackdrop}
            onClick={() => setIsOpen(false)}
          >
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                style={{ ...buttonStyle, justifySelf: "end" }}
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
