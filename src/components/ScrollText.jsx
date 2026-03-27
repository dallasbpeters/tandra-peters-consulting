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
import * as IconoirIcons from "iconoir-react";
import { useLayoutEffect, useRef, useState } from "react";
import TexasFlag from "./TexasFlag";
import { theme } from "../theme";

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (!ref.current) return;
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

function renderOptionalIcon(iconName, textColor, fontSize) {
  if (!iconName || typeof iconName !== "string") return null;

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
        width={Math.round(iconSize * 1.5)}
        height={iconSize}
        style={{ marginRight: 10, flexShrink: 0 }}
      />
    );
  }

  const IconComponent = IconoirIcons[normalized];
  if (!IconComponent) return null;

  return (
    <IconComponent
      color={textColor}
      width={iconSize}
      height={iconSize}
      style={{ marginRight: 10 }}
    />
  );
}

function renderTexasFlag(textColor, fontSize) {
  return <TexasFlag color={textColor} width={fontSize} height={fontSize} />;
}

function VelocityText({
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
}) {
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
    { clamp: false },
  );
  const x = useTransform(baseX, (value) => {
    if (copyWidth === 0) return `${startPosition}px`;
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
          flexShrink: 0,
          fontSize: fontSize || "24px",
          color: resolvedTextColor,
          fontWeight: "bold",
          letterSpacing: "-0.05em",
          whiteSpace: "pre",
          ...style,
          ...(showIcon ? { display: "inline-flex", alignItems: "center" } : {}),
        }}
      >
        {children}
        {showIcon
          ? renderOptionalIcon(icon, resolvedTextColor, fontSize)
          : null}
        {showFlag ? renderTexasFlag(resolvedTextColor, fontSize) : null}
      </span>,
    );
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
      <motion.div
        style={{
          x,
          display: "flex",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {spans}
      </motion.div>
    </div>
  );
}

export default function ScrollVelocity(props) {
  const {
    texts = [
      { text: "Texas Solar and Roofing Pros" },
      { text: "Texas Solar and Roofing Pros" },
    ],
    showIcon = false,
    velocity = 100,
    direction = "left",
    startPosition = 0,
    damping = 50,
    stiffness = 400,
    numCopies = 6,
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
    <div
      style={{
        width: "100%",
        height: 80,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.everglade,
        color: theme.colors.white,
        ...style,
      }}
    >
      {texts.map((item, index) => {
        const textContent = typeof item === "string" ? item : item?.text;
        const itemIcon = showFlag
          ? "TexasFlag"
          : typeof item === "string"
            ? undefined
            : item?.icon;
        const rowMultiplier = index % 2 !== 0 ? -1 : 1;
        const finalVelocity = velocity * directionMultiplier * rowMultiplier;

        return (
          <VelocityText
            key={index}
            baseVelocity={finalVelocity}
            startPosition={startPosition}
            damping={damping}
            stiffness={stiffness}
            numCopies={numCopies}
            velocityMapping={velocityMapping}
            fontSize={fontSize}
            textColor={textColor}
            showIcon={showIcon}
            icon={itemIcon}
          >
            {textContent || ""}&nbsp;
          </VelocityText>
        );
      })}
    </div>
  );
}
