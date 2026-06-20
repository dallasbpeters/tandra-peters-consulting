import { fontFamily as manrope } from "@remotion/google-fonts/Manrope";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { BadgeRow } from "./components/BadgeRow";
import { FadeWrapper } from "./components/FadeWrapper";
import Logo from "./components/Logo";
import type { ParsedRoofScene } from "./composition/roofSceneSchema";

// ─── local animation primitives ───────────────────────────────────────────────

const SlideUp: React.FC<{ children: React.ReactNode; startFrame?: number }> = ({
  children,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 130, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const translateY = interpolate(progress, [0, 1], [56, 0]);
  const opacity = interpolate(progress, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ transform: `translateY(${translateY}px)`, opacity }}>
      {children}
    </div>
  );
};

const FadeIn: React.FC<{ children: React.ReactNode; startFrame?: number }> = ({
  children,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 30, stiffness: 80 },
    from: 0,
    to: 1,
  });
  return <div style={{ opacity }}>{children}</div>;
};

const ExpandLine: React.FC<{
  startFrame?: number;
  color?: string;
  maxWidth?: number;
  height?: number;
}> = ({
  startFrame = 0,
  color = "var(--color-accent)",
  maxWidth = 200,
  height = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 100 },
    from: 0,
    to: 1,
  });
  const width = interpolate(progress, [0, 1], [0, maxWidth]);
  return <div style={{ width, height, background: color, borderRadius: 2 }} />;
};

// ─── RoofCTA ─────────────────────────────────────────────────────────────────

const H_PAD = 72;
const preStyle: React.CSSProperties = { whiteSpace: "pre-line" };

interface Props {
  badges: ParsedRoofScene["badges"];
  cta: ParsedRoofScene["cta"];
  durationInFrames: number;
}

export const RoofCTA: React.FC<Props> = ({ cta, badges, durationInFrames }) => {
  const safeDuration =
    Number.isFinite(durationInFrames) && durationInFrames > 0
      ? durationInFrames
      : 180;
  return (
    <>
      {/* Solid background — always opaque, covers the 3D canvas immediately */}
      <AbsoluteFill style={{ background: "var(--color-paper-dark)" }} />

      {/* Content fades in then out */}
      <FadeWrapper durationInFrames={safeDuration} fadeOutFrames={25}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: `0 ${H_PAD}px`,
          }}
        >
          <div style={{ width: "100%" }}>
            <SlideUp startFrame={0}>
              <div
                style={{
                  fontFamily: manrope,
                  fontWeight: 600,
                  fontSize: 62,
                  lineHeight: 1.25,
                  color: "var(--color-everglade)",
                  ...preStyle,
                }}
              >
                {cta.trust}
              </div>
            </SlideUp>
            <div style={{ marginTop: 12, marginBottom: 44 }}>
              <ExpandLine
                color="var(--color-purple)"
                height={16}
                maxWidth={80}
                startFrame={30}
              />
            </div>
            <SlideUp startFrame={35}>
              <div
                style={{
                  fontFamily: manrope,
                  fontWeight: 900,
                  fontSize: 178,
                  lineHeight: 0.9,
                  color: "var(--color-white)",
                  letterSpacing: "-0.03em",
                  ...preStyle,
                }}
              >
                {cta.callout}
              </div>
            </SlideUp>
            <FadeIn startFrame={80}>
              <div
                style={{
                  marginTop: 60,
                  fontFamily: manrope,
                  fontWeight: 700,
                  fontSize: 36,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-everglade)",
                  ...preStyle,
                }}
              >
                {cta.byline}
              </div>
            </FadeIn>
            <FadeIn startFrame={75}>
              <div
                style={{
                  marginBlock: 48,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 8,
                    background: "var(--color-accent)",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: manrope,
                    fontWeight: 800,
                    fontSize: 52,
                    color: "var(--color-accent)",
                    letterSpacing: "0.04em",
                    ...preStyle,
                  }}
                >
                  {cta.badge}
                </div>
              </div>
              <div style={{ marginBottom: 36 }}>
                <BadgeRow badgeHeight={80} config={badges} />
              </div>
              <Logo height={200} invert={false} width={200} />
            </FadeIn>
          </div>
        </AbsoluteFill>
      </FadeWrapper>
    </>
  );
};
