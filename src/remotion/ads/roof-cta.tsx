import { fontFamily as manrope } from "@remotion/google-fonts/Manrope";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { BadgeRow } from "./components/badge-row";
import { FadeWrapper } from "./components/fade-wrapper";
import Logo from "./components/logo";
import type { ParsedRoofScene } from "./composition/roof-scene-schema";

// ─── local animation primitives ───────────────────────────────────────────────

const SlideUp: React.FC<{ children: React.ReactNode; startFrame?: number }> = ({
  children,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    config: { damping: 22, mass: 0.7, stiffness: 130 },
    fps,
    frame: frame - startFrame,
    from: 0,
    to: 1,
  });
  const translateY = interpolate(progress, [0, 1], [56, 0]);
  const opacity = interpolate(progress, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
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
    config: { damping: 30, stiffness: 80 },
    fps,
    frame: frame - startFrame,
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
    config: { damping: 20, stiffness: 100 },
    fps,
    frame: frame - startFrame,
    from: 0,
    to: 1,
  });
  const width = interpolate(progress, [0, 1], [0, maxWidth]);
  return <div style={{ background: color, borderRadius: 2, height, width }} />;
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
            alignItems: "center",
            justifyContent: "center",
            padding: `0 ${H_PAD}px`,
          }}
        >
          <div style={{ width: "100%" }}>
            <SlideUp startFrame={0}>
              <div
                style={{
                  color: "var(--color-everglade)",
                  fontFamily: manrope,
                  fontSize: 62,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  ...preStyle,
                }}
              >
                {cta.trust}
              </div>
            </SlideUp>
            <div style={{ marginBottom: 44, marginTop: 12 }}>
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
                  color: "var(--color-white)",
                  fontFamily: manrope,
                  fontSize: 178,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.9,
                  ...preStyle,
                }}
              >
                {cta.callout}
              </div>
            </SlideUp>
            <FadeIn startFrame={80}>
              <div
                style={{
                  color: "var(--color-everglade)",
                  fontFamily: manrope,
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  marginTop: 60,
                  textTransform: "uppercase",
                  ...preStyle,
                }}
              >
                {cta.byline}
              </div>
            </FadeIn>
            <FadeIn startFrame={75}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 16,
                  marginBlock: 48,
                }}
              >
                <div
                  style={{
                    background: "var(--color-accent)",
                    borderRadius: 2,
                    flexShrink: 0,
                    height: 8,
                    width: 40,
                  }}
                />
                <div
                  style={{
                    color: "var(--color-accent)",
                    fontFamily: manrope,
                    fontSize: 52,
                    fontWeight: 800,
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
