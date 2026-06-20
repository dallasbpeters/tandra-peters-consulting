"use client";

import type { PortableTextBlock } from "@portabletext/types";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { type CSSProperties, useCallback, useRef, useState } from "react";

import { useIsMobile } from "../hooks/isMobile";
import { RichText } from "../portableText/RichText";
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
  section: {
    padding: `${theme.spacing.section} ${theme.spacing.xxl}`,
    display: "grid",
    placeContent: "stretch",
    backgroundColor: mix(theme.colors.black, 96),
  },
  header: {
    maxWidth: "1000px",
    margin: `0 auto ${theme.spacing.xxxxl}`,
    display: "grid",
    gap: theme.spacing.md,
    justifySelf: "start",
    width: "100%",
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
    color: theme.colors.white,
    margin: 0,
  },
  description: {
    fontSize: "1rem",
    lineHeight: 1.65,
    color: theme.colors.white,
    opacity: 0.8,
    margin: 0,
  },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginInline: "auto",
    maxWidth: "1300px",
    position: "relative",
    gap: theme.spacing.lg,
  },
  sliderContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 10",
    cursor: "ew-resize",
    overflow: "hidden",
    borderRadius: theme.radius.large,
    cornerShape: "super-ellipse(50%)",
    backgroundColor: theme.colors.paperDark,
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
    bottom: "1rem",
    borderRadius: theme.radius.medium,
    backgroundColor: "rgba(11, 13, 20, 0.85)",
    backdropFilter: "blur(4px)",
    padding: `${theme.spacing.tight} ${theme.spacing.md}`,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: theme.colors.paper,
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 10,
    width: "2px",
    backgroundColor: theme.colors.paper,
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
    borderRadius: theme.radius.pill,
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
    gap: theme.spacing.lg,
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
  },
  thumbButtonBase: {
    position: "relative",
    aspectRatio: "4 / 3",
    overflow: "hidden",
    borderRadius: theme.radius.medium,
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
    background:
      "linear-gradient(to top, rgba(11, 13, 20, 0.85), transparent 60%)",
  },
  thumbLabel: {
    position: "absolute",
    bottom: "0.5rem",
    left: "0.5rem",
    right: "0.5rem",
    textAlign: "left",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: theme.colors.paper,
    zIndex: 2,
  },
  cardHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    backgroundColor: theme.colors.black,
    border: `1px solid ${mix(theme.colors.paper, 10)}`,
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
  },
  windowControls: {
    display: "flex",
    justifyContent: "start",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  windowControl: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: theme.colors.paper,
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
          viewport={{ once: true, amount: 0.4 }}
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
              overflow: "hidden",
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
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
                scale: 1,
                borderColor: theme.colors.evergladeMuted,
                x: "-50%",
              }}
              initial={{
                scale: 1,
                borderColor: theme.colors.evergladeMuted,
                x: "-50%",
              }}
              style={styles.handleKnob}
              whileHover={{ scale: 1.05, borderColor: "#9f78e6" }}
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
                  whileHover={{ scale: 1.05, borderColor: "#9f78e6" }}
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
