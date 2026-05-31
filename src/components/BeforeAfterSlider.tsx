"use client";

import type { PortableTextBlock } from "@portabletext/types";

import { motion, AnimatePresence, Variants } from "motion/react";
import { useState, useRef, useCallback, type CSSProperties } from "react";

import { useIsMobile } from "../hooks/isMobile";
import { RichText } from "../portableText/RichText";
import { theme } from "../theme";

interface ImagePair {
  id?: string;
  title?: string;
  beforeImage?: string;
  afterImage?: string;
  description?: string;
}

interface BeforeAfterSliderProps {
  imagePairs: ImagePair[];
  eyebrow?: string;
  title?: string;
  description?: PortableTextBlock[] | string;
}

const colors = {
  background: "#0b0d14",
  foreground: "#fafafa",
  muted: "#1c1f29",
  mutedForeground: "#a3a3a3",
  border: "#363a45",
  primary: "oklch(0.7281 0.146 283.49)",
  white: "#ffffff",
};

const styles: Record<string, CSSProperties> = {
  section: {
    padding: "4rem 1.5rem",
    display: "grid",
    placeContent: "stretch",
  },
  header: {
    maxWidth: "1000px",
    margin: "0 auto 2rem",
    display: "grid",
    gap: "0.75rem",
  },
  eyebrow: {
    fontFamily: theme.fonts.headline,
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: theme.palette.accent["600"],
    margin: 0,
  },
  heading: {
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: 400,
    lineHeight: 1.15,
    color: theme.colors.everglade,
    margin: 0,
  },
  description: {
    fontSize: "1rem",
    lineHeight: 1.65,
    color: theme.colors.everglade,
    opacity: 0.8,
    margin: 0,
  },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginInline: "auto",
    maxWidth: "1000px",
    position: "relative",
    gap: "1rem",
  },
  sliderContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 10",
    cursor: "ew-resize",
    overflow: "hidden",
    borderRadius: "1rem",
    cornerShape: "super-ellipse(50%)",
    backgroundColor: colors.muted,
    userSelect: "none",
  },
  imageLayer: {
    position: "absolute",
    inset: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    pointerEvents: "none",
  },
  labelBase: {
    position: "absolute",
    top: "1rem",
    borderRadius: "0.375rem",
    backgroundColor: "rgba(11, 13, 20, 0.85)",
    backdropFilter: "blur(4px)",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: colors.foreground,
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 10,
    width: "2px",
    backgroundColor: colors.white,
    boxShadow: "0 0 8px rgba(0,0,0,0.4)",
  },
  handleKnob: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "3rem",
    width: "3rem",
    borderRadius: "9999px",
    borderWidth: "4px",
    borderStyle: "double",
    borderColor: theme.colors.evergladeMuted,
    backgroundColor: theme.colors.everglade,
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
  },
  gallery: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    placeContent: "center",
    width: "100%",
    gap: "1rem",
  },
  thumbButtonBase: {
    position: "relative",
    aspectRatio: "4 / 3",
    overflow: "hidden",
    borderRadius: "0.5rem",
    cursor: "pointer",
    padding: 0,
    transition: "border-color 0.2s ease",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  thumbOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background: "linear-gradient(to top, rgba(11, 13, 20, 0.85), transparent 60%)",
  },
  thumbLabel: {
    position: "absolute",
    bottom: "0.5rem",
    left: "0.5rem",
    right: "0.5rem",
    textAlign: "left",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: colors.foreground,
    zIndex: 2,
  },
};

const thumbButtonVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function BeforeAfterSlider({
  imagePairs,
  eyebrow,
  title,
  description,
}: BeforeAfterSliderProps) {
  const isMobile = useIsMobile();
  const [selectedPair, setSelectedPair] = useState(imagePairs[0]);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const handleClick = (e: React.MouseEvent) => handleMove(e.clientX);

  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section style={styles.section}>
      {hasHeader ? (
        <motion.header
          style={styles.header}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {eyebrow ? <p style={styles.eyebrow}>{eyebrow}</p> : null}
          {title ? <h2 style={styles.heading}>{title}</h2> : null}
          {description ? (
            <RichText value={description} paragraphStyle={styles.description} />
          ) : null}
        </motion.header>
      ) : null}
      <div style={styles.wrapper}>
        <div
          ref={containerRef}
          style={styles.sliderContainer}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onClick={handleClick}
        >
          {/* After Image (Background) */}
          <div style={styles.imageLayer}>
            <img
              src={selectedPair.afterImage || "/placeholder.svg"}
              alt={`${selectedPair.title} - After`}
              style={styles.image}
              draggable={false}
            />
            <div style={{ ...styles.labelBase, right: "1rem" }}>After</div>
          </div>

          {/* Before Image (Clipped) */}
          <div
            style={{
              ...styles.imageLayer,
              overflow: "hidden",
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            <img
              src={selectedPair.beforeImage || "/placeholder.svg"}
              alt={`${selectedPair.title} - Before`}
              style={styles.image}
              draggable={false}
            />
            <div style={{ ...styles.labelBase, left: "1rem" }}>Before</div>
          </div>

          {/* Slider Handle */}
          <div style={{ ...styles.handle, left: `${sliderPosition}%` }}>
            <motion.div
              style={styles.handleKnob}
              initial={{ scale: 1, borderColor: theme.colors.evergladeMuted, x: "-50%" }}
              animate={{ scale: 1, borderColor: theme.colors.evergladeMuted, x: "-50%" }}
              whileHover={{ scale: 1.05, borderColor: "#9f78e6" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.foreground}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 6l-4 6 4 6" />
                <path d="M16 6l4 6-4 6" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        <div style={styles.gallery} className="ba-gallery">
          <AnimatePresence>
            {imagePairs.map((pair) => {
              const isSelected = selectedPair.id === pair.id;
              return (
                <motion.button
                  variants={thumbButtonVariants}
                  initial={false}
                  animate="visible"
                  exit="exit"
                  whileHover={{ scale: 1.05, borderColor: "#9f78e6" }}
                  className="ba-thumb-button"
                  key={pair.id}
                  onClick={() => {
                    setSelectedPair(pair);
                    setSliderPosition(50);
                  }}
                  style={{
                    ...styles.thumbButtonBase,
                    blockSize: isMobile ? "75px" : "100px",
                    boxShadow: isSelected ? `0 0 0 4px ${colors.primary}` : "none",
                  }}
                >
                  <img
                    src={pair.afterImage || "/placeholder.svg"}
                    alt=""
                    style={styles.thumbImage}
                    draggable={false}
                  />
                  <div className="ba-thumb-overlay" style={styles.thumbOverlay} />
                  <span style={styles.thumbLabel}>{pair.title}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
