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

const defaultBandColors = [
  "var(--color-secondary-950)",
  "var(--color-secondary)",
  "var(--color-secondary-700)",
  "var(--color-primary-700)",
  "var(--color-primary)",
  "var(--color-primary-alt)",
  "var(--color-primary-300)",
  "var(--color-secondary-300)",
];

export default function Band(props) {
  const {
    colors = defaultBandColors,
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

  const bands = [
    { opacity: 0.88 },
    { opacity: 0.72 },
    { opacity: 0.56 },
    { opacity: 0.38 },
    { opacity: 0.18 },
    { opacity: 0.06 },
  ];

  const height = useTransform(
    scrollYProgress,
    [scrollStart, scrollEnd],
    reverse ? [minHeight, maxHeight] : [maxHeight, minHeight],
    { ease: (t) => t * t * (3 - 2 * t) }
  );

  const offsetSpring = useSpring(0, { damping: 15, stiffness: 30 });
  useMotionValueEvent(offsetSpring, "change", setMouseOffset);

  function onMouseMove(event) {
    if (!rectRef.current) {
      rectRef.current = event.currentTarget.getBoundingClientRect();
    }

    const x =
      ((event.clientX - rectRef.current.left) / rectRef.current.width) * 100;
    offsetSpring.set((x - 50) * 0.5);
  }

  function onMouseLeave() {
    offsetSpring.set(0);
  }

  const palette = colors.length ? colors : defaultBandColors;
  const numStops = palette.length;
  const lastBandIndex = bands.length - 1;
  /** Subpixel animated heights leave hairline gaps; overlap + base fill hides them. */
  const bandOverlapStyle = (index) => ({
    backfaceVisibility: "hidden",
    marginBottom: index === lastBandIndex ? -1 : 0,
    marginTop: index > 0 ? -1 : 0,
    transform: "translateZ(0)",
  });

  if (numStops < 2) {
    const gradientBg = numStops === 1 ? palette[0] : "transparent";

    return (
      <div
        className={className}
        ref={ref}
        style={{
          background: numStops === 1 ? palette[0] : undefined,
          position: "relative",
          transform: rotate ? "rotate(180deg)" : undefined,
          width: "100%",
          ...style,
        }}
      >
        {bands.map((band, index) => (
          <motion.div
            key={band.opacity}
            style={{
              background: gradientBg,
              height,
              position: "relative",
              width: "100%",
              ...bandOverlapStyle(index),
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
  }

  const step = 100 / (numStops - 1);
  const autoOffset = autoAnimate ? Math.sin(time * speed) * amplitude : 0;

  const stopPositions = palette.map((_, index) =>
    Math.max(0, Math.min(100, index * step + mouseOffset + autoOffset))
  );

  const customProperties = stopPositions.reduce(
    (accumulator, position, index) => {
      accumulator[`--stop${index}`] = `${position}%`;
      return accumulator;
    },
    {}
  );

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
      ref={ref}
      style={{
        background: palette[0],
        position: "relative",
        transform: rotate ? "rotate(180deg)" : undefined,
        width: "100%",
        ...style,
      }}
    >
      {bands.map((band, index) => (
        <motion.div
          key={band.opacity}
          style={{
            background: gradientBg,
            height,
            position: "relative",
            width: "100%",
            ...customProperties,
            transition: transitionValue,
            ...bandOverlapStyle(index),
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
}
