"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// --- PRIVATE UTILITIES ---

const DEFAULT_BAND_COLORS = [
  "var(--color-secondary-950)",
  "var(--color-secondary)",
  "var(--color-secondary-700)",
  "var(--color-primary-700)",
  "var(--color-primary)",
  "var(--color-primary-alt)",
  "var(--color-primary-300)",
  "var(--color-secondary-300)",
];

const BANDS = [
  { opacity: 0.88 },
  { opacity: 0.72 },
  { opacity: 0.56 },
  { opacity: 0.38 },
  { opacity: 0.18 },
  { opacity: 0.06 },
];

const getBandOverlapStyle = (index, lastBandIndex) => ({
  backfaceVisibility: "hidden",
  marginBottom: index === lastBandIndex ? 0 : -1,
});

// --- SUB-COMPONENTS ---

const SingleColorBands = ({
  palette,
  numStops,
  tint,
  height,
  rotate,
  className,
  style,
  innerRef,
}) => {
  const gradientBg = numStops === 1 ? palette : "transparent";
  const lastBandIndex = BANDS.length - 1;

  return (
    <div
      className={className}
      ref={innerRef}
      style={{
        background: numStops === 1 ? palette : undefined,
        position: "relative",
        transform: rotate ? "rotate(180deg)" : undefined,
        width: "100%",
        ...style,
      }}
    >
      {BANDS.map((band, index) => (
        <motion.div
          key={band.opacity}
          style={{
            background: gradientBg,
            height,
            position: "relative",
            width: "100%",
            ...getBandOverlapStyle(index, lastBandIndex),
          }}
        >
          <span
            style={{
              background: tint,
              display: "block",
              inset: 0,
              opacity: band.opacity,
              position: "absolute",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

const MultiColorBands = ({
  palette,
  numStops,
  tint,
  height,
  rotate,
  className,
  style,
  innerRef,
  onMouseMove,
  onMouseLeave,
  time,
  speed,
  amplitude,
  mouseOffset,
}) => {
  const lastBandIndex = BANDS.length - 1;
  const step = 100 / (numStops - 1);
  const autoOffset = Math.sin(time * speed) * amplitude;

  const stopPositions = palette.map((_, index) =>
    Math.max(0, Math.min(100, index * step + mouseOffset + autoOffset))
  );

  // Replaced Array.reduce with a traditional for loop
  const customProperties = {};
  for (let i = 0; i < stopPositions.length; i++) {
    customProperties[`--stop${i}`] = `${stopPositions[i]}%`;
  }

  const transitionValue = stopPositions
    .map((_, index) => `--stop${index} 1s ease-out`)
    .join(", ");

  const gradientBg = `linear-gradient(90deg, ${palette.map((color, index) => `${color} var(--stop${index})`).join(", ")})`;

  return (
    <div
      aria-hidden="true"
      className={className}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      ref={innerRef}
      style={{
        background: palette,
        position: "relative",
        transform: rotate ? "rotate(180deg)" : undefined,
        width: "100%",
        ...style,
      }}
    >
      {BANDS.map((band, index) => (
        <motion.div
          key={band.opacity}
          style={{
            background: gradientBg,
            height,
            position: "relative",
            width: "100%",
            ...customProperties,
            transition: transitionValue,
            ...getBandOverlapStyle(index, lastBandIndex),
          }}
        >
          <span
            style={{
              background: tint,
              display: "block",
              inset: 0,
              opacity: band.opacity,
              position: "absolute",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

// --- MAIN PUBLIC EXPORT ---

const Band = (props) => {
  const {
    colors = DEFAULT_BAND_COLORS,
    tint = "var(--color-secondary-950)",
    minHeight = 2,
    maxHeight = 24,
    rotate = false,
    scrollStart = 0,
    scrollEnd = 0.8,
    reverse = false,
    autoAnimate = false,
    speed = 1,
    amplitude = 10,
    className = "",
    style = {},
  } = props || {};

  const ref = useRef(null);
  const rectRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [time, setTime] = useState(0);
  const [mouseOffset, setMouseOffset] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useAnimationFrame((ms) => {
    if (autoAnimate) {
      setTime(ms / 1000);
    }
  });

  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
    target: isMounted ? ref : undefined,
  });

  const height = useTransform(
    scrollYProgress,
    [scrollStart, scrollEnd],
    reverse ? [minHeight, maxHeight] : [maxHeight, minHeight],
    { ease: (t) => t * t * (3 - 2 * t) }
  );

  const offsetSpring = useSpring(0, { damping: 15, stiffness: 30 });
  useMotionValueEvent(offsetSpring, "change", setMouseOffset);

  const onMouseMove = (event) => {
    if (!rectRef.current) {
      rectRef.current = event.currentTarget.getBoundingClientRect();
    }
    const x =
      ((event.clientX - rectRef.current.left) / rectRef.current.width) * 100;
    offsetSpring.set((x - 50) * 0.5);
  };

  const onMouseLeave = () => {
    offsetSpring.set(0);
  };

  const palette = colors.length ? colors : DEFAULT_BAND_COLORS;
  const numStops = palette.length;

  if (numStops < 2) {
    return (
      <SingleColorBands
        className={className}
        height={height}
        innerRef={ref}
        numStops={numStops}
        palette={palette}
        rotate={rotate}
        style={style}
        tint={tint}
      />
    );
  }

  return (
    <MultiColorBands
      amplitude={amplitude}
      className={className}
      height={height}
      innerRef={ref}
      mouseOffset={mouseOffset}
      numStops={numStops}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      palette={palette}
      rotate={rotate}
      speed={speed}
      style={style}
      time={time}
      tint={tint}
    />
  );
};

export default Band;
