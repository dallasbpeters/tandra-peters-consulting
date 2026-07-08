// oxlint-disable func-style
"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { theme } from "../theme";
import TexasFlag from "./texas-flag";

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (!ref.current) {
        return;
      }
      setWidth(ref.current.offsetWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [ref]);

  return width;
}

function wrap(min, max, value) {
  const range = max - min;
  const mod = (((value - min) % range) + range) % range;
  return mod + min;
}

function renderOptionalIcon(iconName, fontSize) {
  if (!iconName || typeof iconName !== "string") {
    return null;
  }

  const iconSize =
    typeof fontSize === "number" ? fontSize : Number.parseFloat(fontSize) || 18;
  const normalized = iconName.trim();
  const isTexasFlag = [
    "TexasFlag",
    "texasFlag",
    "texas-flag",
    "tx-flag",
  ].includes(normalized);

  if (isTexasFlag) {
    return (
      <TexasFlag
        height={iconSize}
        style={{ flexShrink: 0, marginRight: 10 }}
        width={Math.round(iconSize * 1.5)}
      />
    );
  }

  return null;
}

function renderTexasFlag(textColor, fontSize) {
  return <TexasFlag color={textColor} height={fontSize} width={fontSize} />;
}

function VelocityText(props) {
  const {
    children,
    baseVelocity,
    startPosition,
    damping,
    stiffness,
    numCopies,
    showIcon,
    showFlag,
    icon,
    velocityMapping,
    fontSize,
    textColor,
    style,
  } = props || {};
  const copyRef = useRef(null);
  const copyWidth = useElementWidth(copyRef);
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping.input,
    velocityMapping.output,
    { clamp: false }
  );
  const x = useTransform(baseX, (value) => {
    if (copyWidth === 0) {
      return `${startPosition}px`;
    }
    const wrapped = wrap(-copyWidth, 0, value);
    return `${wrapped + startPosition}px`;
  });

  const baseDirection = baseVelocity >= 0 ? 1 : -1;
  const scrollDirectionRef = useRef(baseDirection);

  useAnimationFrame((_, delta) => {
    const velocityValue = velocityFactor.get();

    if (velocityValue < 0) {
      scrollDirectionRef.current = -baseDirection;
    } else if (velocityValue > 0) {
      scrollDirectionRef.current = baseDirection;
    } else {
      scrollDirectionRef.current = baseDirection;
    }

    const moveBy =
      scrollDirectionRef.current * Math.abs(baseVelocity) * (delta / 1000);
    const additional =
      scrollDirectionRef.current * Math.abs(moveBy) * Math.abs(velocityValue);
    baseX.set(baseX.get() + moveBy + additional);
  });

  const resolvedTextColor =
    typeof textColor === "string"
      ? textColor
      : textColor?.hex || textColor?.color?.hex || "currentColor";

  const spans = [];
  for (let index = 0; index < numCopies; index += 1) {
    spans.push(
      <span
        key={index}
        ref={index === 0 ? copyRef : null}
        style={{
          color: resolvedTextColor,
          flexShrink: 0,
          fontSize: fontSize || "24px",
          fontWeight: "bold",
          letterSpacing: "0.05em",
          overflow: "hidden",
          whiteSpace: "nowrap",
          ...style,
          ...(showIcon ? { alignItems: "center", display: "inline-flex" } : {}),
        }}
      >
        {children}
        {showIcon
          ? renderOptionalIcon(icon, resolvedTextColor, fontSize)
          : null}
        {showFlag ? renderTexasFlag(resolvedTextColor, fontSize) : null}
      </span>
    );
  }

  return (
    <div
      style={{
        overflow: "hidden",
        overflowX: "clip",
        position: "relative",
        width: "100%",
      }}
    >
      <motion.div
        style={{
          display: "flex",
          textAlign: "center",
          whiteSpace: "nowrap",
          x,
        }}
      >
        {spans}
      </motion.div>
    </div>
  );
}

export default function ScrollVelocity(props) {
  const {
    texts = [{ text: "Texas Solar and Roofing Pros" }],
    showIcon = false,
    velocity = 100,
    direction = "left",
    startPosition = 0,
    damping = 50,
    stiffness = 400,
    numCopies = 3,
    velocityInputMin = 0,
    velocityInputMax = 1000,
    velocityOutputMin = 0,
    velocityOutputMax = 5,
    fontSize,
    textColor = "currentColor",
    showFlag = false,
    style = {},
  } = props || {};

  const velocityMapping = {
    input: [velocityInputMin, velocityInputMax],
    output: [velocityOutputMin, velocityOutputMax],
  };
  const directionMultiplier = direction === "left" ? 1 : -1;

  return (
    <section
      aria-label="Service Areas"
      data-sanity-stega="false"
      role="marquee"
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.everglade,
        color: theme.colors.white,
        display: "flex",
        height: 80,
        justifyContent: "center",
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      {texts.map((item, index) => {
        const textContent = typeof item === "string" ? item : item?.text;
        const itemIconFromItem =
          typeof item === "string" ? undefined : item?.icon;
        const itemIcon = showFlag ? "TexasFlag" : itemIconFromItem;
        const rowMultiplier = index % 2 === 0 ? 1 : -1;
        const finalVelocity = velocity * directionMultiplier * rowMultiplier;

        return (
          <VelocityText
            baseVelocity={finalVelocity}
            damping={damping}
            fontSize={fontSize}
            icon={itemIcon}
            key={
              typeof item === "string" ? item : (item?.text ?? String(index))
            }
            numCopies={numCopies}
            showIcon={showIcon}
            startPosition={startPosition}
            stiffness={stiffness}
            textColor={textColor}
            velocityMapping={velocityMapping}
          >
            {textContent || ""}&nbsp;
          </VelocityText>
        );
      })}
    </section>
  );
}
