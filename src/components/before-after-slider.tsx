"use client";

import type { PortableTextBlock } from "@portabletext/types";
import type { Variants } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { useCallback, useRef, useState } from "react";

import { useIsMobile } from "../hooks/is-mobile";
import { RichText } from "../portableText/rich-text";
import { mix, theme } from "../theme";

interface ImagePair {
  afterImage?: string;
  beforeImage?: string;
  description?: string;
  id?: string;
  title?: string;
}

interface BeforeAfterSliderProps {
  description?: PortableTextBlock[] | string;
  eyebrow?: string;
  imagePairs: ImagePair[];
  title?: string;
}

const styles: Record<string, CSSProperties> = {
  cardHeader: {
    backgroundColor: theme.colors.black,
    border: `1px solid ${mix(theme.colors.paper, 10)}`,
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 15,
  },
  description: {
    color: theme.colors.white,
    fontSize: "1rem",
    lineHeight: 1.65,
    margin: 0,
    opacity: 0.8,
  },
  eyebrow: {
    color: theme.palette.accent["600"],
    fontFamily: theme.fonts.headline,
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.18em",
    margin: 0,
    textTransform: "uppercase",
  },
  gallery: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing.lg,
    justifyContent: "center",
    left: "50%",
    placeContent: "center",
    width: "100%",
    zIndex: 10,
  },
  handle: {
    backgroundColor: theme.colors.paper,
    bottom: 0,
    boxShadow: "0 0 8px rgba(0,0,0,0.4)",
    position: "absolute",
    top: 0,
    width: "2px",
    zIndex: 10,
  },
  handleKnob: {
    alignItems: "center",
    backgroundColor: theme.colors.everglade,
    borderColor: theme.colors.evergladeMuted,
    borderRadius: theme.radius.pill,
    borderStyle: "double",
    borderWidth: "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    display: "flex",
    height: "3rem",
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "3rem",
  },
  header: {
    display: "grid",
    gap: theme.spacing.md,
    justifySelf: "start",
    margin: `0 auto ${theme.spacing.xxxxl}`,
    maxWidth: "1000px",
    width: "100%",
  },
  heading: {
    color: theme.colors.white,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: 400,
    lineHeight: 1.15,
    margin: 0,
  },
  image: {
    display: "block",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    width: "100%",
  },
  imageLayer: {
    inset: 0,
    position: "absolute",
  },
  labelBase: {
    backdropFilter: "blur(4px)",
    backgroundColor: "rgba(11, 13, 20, 0.85)",
    borderRadius: theme.radius.medium,
    bottom: "1rem",
    color: theme.colors.paper,
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: `${theme.spacing.tight} ${theme.spacing.md}`,
    position: "absolute",
  },
  section: {
    backgroundColor: mix(theme.colors.black, 96),
    display: "grid",
    padding: `${theme.spacing.section} ${theme.spacing.xxl}`,
    placeContent: "stretch",
  },
  sliderContainer: {
    aspectRatio: "16 / 10",
    backgroundColor: theme.colors.paperDark,
    borderRadius: theme.radius.large,
    cornerShape: "super-ellipse(50%)",
    cursor: "ew-resize",
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
    width: "100%",
  },
  thumbButtonBase: {
    aspectRatio: "4 / 3",
    borderRadius: theme.radius.medium,
    cursor: "pointer",
    overflow: "hidden",
    padding: 0,
    position: "relative",
    transition: "border-color 0.2s ease",
  },
  thumbImage: {
    display: "block",
    height: "100%",
    objectFit: "cover",
    width: "100%",
  },
  thumbLabel: {
    bottom: "0.5rem",
    color: theme.colors.paper,
    fontSize: "0.875rem",
    fontWeight: 500,
    left: "0.5rem",
    position: "absolute",
    right: "0.5rem",
    textAlign: "left",
    zIndex: 2,
  },
  thumbOverlay: {
    background:
      "linear-gradient(to top, rgba(11, 13, 20, 0.85), transparent 60%)",
    inset: 0,
    position: "absolute",
    zIndex: 1,
  },
  windowControl: {
    backgroundColor: theme.colors.paper,
    borderRadius: "50%",
    height: "10px",
    width: "10px",
  },
  windowControls: {
    alignItems: "center",
    display: "flex",
    gap: theme.spacing.md,
    justifyContent: "start",
    padding: theme.spacing.md,
  },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.lg,
    marginInline: "auto",
    maxWidth: "1300px",
    position: "relative",
    width: "100%",
  },
};

const thumbButtonVariants: Variants = {
  exit: { opacity: 0, y: -10 },
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
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
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      return;
    }
    handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX);
  const handleClick = (e: React.MouseEvent) => handleMove(e.clientX);

  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section style={styles.section}>
      {hasHeader ? (
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          style={styles.header}
          transition={{ duration: 0.4, ease: "easeOut" }}
          viewport={{ amount: 0.4, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {eyebrow ? <p style={styles.eyebrow}>{eyebrow}</p> : null}
          {title ? <h2 style={styles.heading}>{title}</h2> : null}
          {description ? (
            <RichText paragraphStyle={styles.description} value={description} />
          ) : null}
        </motion.header>
      ) : null}
      <div style={styles.wrapper}>
        <div style={styles.cardHeader}>
          <div style={styles.windowControls}>
            <span style={styles.windowControl} />
            <span style={styles.windowControl} />
            <span style={styles.windowControl} />
          </div>
        </div>
        <div
          aria-label="Before and after comparison slider"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={sliderPosition}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              setSliderPosition((p) => Math.max(0, p - 5));
            } else if (e.key === "ArrowRight") {
              setSliderPosition((p) => Math.min(100, p + 5));
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          ref={containerRef}
          role="slider"
          style={styles.sliderContainer}
          tabIndex={0}
        >
          {/* After Image (Background) */}
          <div style={styles.imageLayer}>
            {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by slider CSS */}
            <img
              alt={`${selectedPair.title} - After`}
              draggable={false}
              src={selectedPair.afterImage || "/placeholder.svg"}
              style={styles.image}
            />
            <div style={{ ...styles.labelBase, right: "1rem" }}>After</div>
          </div>

          {/* Before Image (Clipped) */}
          <div
            style={{
              ...styles.imageLayer,
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              overflow: "hidden",
            }}
          >
            {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by slider CSS */}
            <img
              alt={`${selectedPair.title} - Before`}
              draggable={false}
              src={selectedPair.beforeImage || "/placeholder.svg"}
              style={styles.image}
            />
            <div style={{ ...styles.labelBase, left: "1rem" }}>Before</div>
          </div>

          {/* Slider Handle */}
          <div style={{ ...styles.handle, left: `${sliderPosition}%` }}>
            <motion.div
              animate={{
                borderColor: theme.colors.evergladeMuted,
                scale: 1,
                x: "-50%",
              }}
              initial={{
                borderColor: theme.colors.evergladeMuted,
                scale: 1,
                x: "-50%",
              }}
              style={styles.handleKnob}
              whileHover={{ borderColor: "#9f78e6", scale: 1.05 }}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="24"
                stroke={theme.colors.paper}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
              >
                <path d="M8 6l-4 6 4 6" />
                <path d="M16 6l4 6-4 6" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        <div className="ba-gallery" style={styles.gallery}>
          <AnimatePresence>
            {imagePairs.map((pair) => {
              const isSelected = selectedPair.id === pair.id;
              return (
                <motion.button
                  animate="visible"
                  className="ba-thumb-button"
                  exit="exit"
                  initial={false}
                  key={pair.id}
                  onClick={() => {
                    setSelectedPair(pair);
                    setSliderPosition(50);
                  }}
                  style={{
                    ...styles.thumbButtonBase,
                    blockSize: isMobile ? "75px" : "100px",
                    boxShadow: isSelected
                      ? `0 0 0 4px ${theme.colors.accent}`
                      : "none",
                  }}
                  variants={thumbButtonVariants}
                  whileHover={{ borderColor: "#9f78e6", scale: 1.05 }}
                >
                  {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by slider CSS */}
                  <img
                    alt=""
                    draggable={false}
                    src={pair.afterImage || "/placeholder.svg"}
                    style={styles.thumbImage}
                  />
                  <div
                    className="ba-thumb-overlay"
                    style={styles.thumbOverlay}
                  />
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
