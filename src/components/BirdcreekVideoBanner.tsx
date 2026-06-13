import { Xmark, Play } from "iconoir-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Shader, ChromaFlow, ImageTexture, Pixelate, SolidColor } from "shaders/react";

import { useIsMobile } from "../hooks/isMobile";
import { mix, theme } from "../theme";

export default function ShaderEffect({ style }: { style: React.CSSProperties }) {
  return (
    <Shader style={style} colorSpace="srgb">
      <ChromaFlow
        id="idmostv5d9xi2rmvn45"
        baseColor="#ffffff"
        downColor="#ffffff"
        intensity={0.8}
        leftColor="#ffffff"
        momentum={32}
        radius={1.5}
        rightColor="#ffffff"
        upColor="#ffffff"
        visible={false}
      />

      <SolidColor blendMode="multiply" color="#204d31" maskSource="idmostv5d9xi2rmvn45" />

      <ImageTexture blendMode="multiply" url="/poster.jpeg" visible={true} />

      <Pixelate
        scale={{
          type: "map",

          curve: -1,

          source: "idmostv5d9xi2rmvn45",

          channel: "alpha",

          inputMax: 1,

          inputMin: 0,

          outputMax: 1000,

          outputMin: 64,
        }}
      />

      <ImageTexture maskSource="idmostv5d9xi2rmvn45" url="/poster.jpeg" visible={true} />

      <ChromaFlow
        baseColor="#ffffff"
        downColor="#ffffff"
        intensity={1.5}
        leftColor="#ffffff"
        momentum={32}
        radius={4}
        rightColor="#ffffff"
        upColor="#ffffff"
        visible={false}
      />
    </Shader>
  );
}

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
    transition: "opacity 0.3s ease",
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

  const shaderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 1,
  };

  return (
    <div
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      <ShaderEffect style={shaderStyle} />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={imageContainerStyle}
      >
        <motion.button
          style={buttonStyle}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={() => setIsOpen(true)}
        >
          <Play />
        </motion.button>
        <img
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          alt="Watch the video"
          style={imageStyle}
          src="/poster.jpeg"
          onClick={() => setIsOpen(true)}
          className="open-btn"
        />
        <div style={contentStyle}>
          <h2 style={titleStyle}>Birdcreek Roofing - 10 Years of Helping Texas Homeowners</h2>
        </div>
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
