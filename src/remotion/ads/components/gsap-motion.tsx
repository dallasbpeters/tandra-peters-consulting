import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

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
  return (
    <div
      style={{
        background: color,
        borderRadius: 2,
        height,
        width: interpolate(progress, [0, 1], [0, maxWidth]),
      }}
    />
  );
};
const BC_BIRD_PATH =
  "M135.86,23.72c-.85-.87-1.91-2-2-3-1.11-8.87-15.75-14.46-23.34-11.28-5.26,2.2-9,5.9-12.33,10.31a17.16,17.16,0,0,1-3,3.11c-13.33,10.55-26.81,20.92-40,31.64-7.34,6-13.1,13.81-21.68,18.36a59.38,59.38,0,0,0-7.51,5,25.22,25.22,0,0,0-3.14,3.3c1.55.31,3.12,1,4.65.88a73.7,73.7,0,0,0,26.66-6.68c12-5.39,24.35-10.37,34.21-19.58.13-.11.42-.06.63-.08l.56.84c-5.11,4-10,8.33-15.37,11.8-12.71,8.16-26.95,12.19-41.78,14.4a11.67,11.67,0,0,0-4.3,1.42c-2.8,1.72-5.38,3.82-8.16,5.59-4.46,2.82-9,5.5-13.81,8.42l3.63.45c-1.39,4.09-2.69,7.89-4.07,11.94,5.22-4.48,10-8.94,15.21-13,6.67-5.18,13.46-10.39,22.69-9.82a14.47,14.47,0,0,0,3.48-.17c9.07-1.6,18.12-3.28,27.2-4.85a9.5,9.5,0,0,1,3.37.32c3,.62,6,1.5,9,1.93A10.07,10.07,0,0,1,94,89.7c.64,1-.61,3.22-1,4.89-.06.26-.08.53-.17,1.27,3.11-3.34,6-6.45,11.17-4.44-1.34-2.77-3.37-2.46-5.24-2.32a6.53,6.53,0,0,1-6.64-3.54c.71-1.16,1.66-2.1,1.84-3.16.4-2.4,1.93-3.13,4-3.91a31.44,31.44,0,0,0,7.93-4.17C116.48,66,120.72,54,124,41.6c1.24-4.65,6.11-9.35,11-9.35h8.62l.34-.67C141.22,29,138.49,26.4,135.86,23.72Zm-14.78-.44a3.36,3.36,0,1,1,3.35-3.35A3.37,3.37,0,0,1,121.08,23.28Z";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function LogoAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // All timing in frames at 30 fps. Scale proportionally via fps if needed.
  const scale = fps / 30;
  const f = frame / scale;

  // ── Curtain: wipes upward (scaleY 1→0) frames 0–20
  const curtainScale = interpolate(f, [0, 10], [1, 0], clamp);

  // ── Logo group: fades in as curtain lifts, frames 12–22
  const logoOpacity = interpolate(f, [12, 22], [0, 1], clamp);
  // ── Logo group: fades in as curtain lifts, frames 12–22
  const logoFillOpacity = interpolate(f, [20, 32], [0, 1], clamp);

  // ── Bird draw: evolvePath 0→1, frames 18–60
  const birdProgress = interpolate(f, [18, 60], [0, 1], clamp);
  const evolution = evolvePath(birdProgress, BC_BIRD_PATH);

  // ── Company name: slides up + fades in, frames 48–72
  const nameOpacity = interpolate(f, [48, 72], [0, 1], clamp);
  const nameY = interpolate(f, [48, 52], [28, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: "var(--color-parchment, #f5f0e8)",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Everglade curtain — wipes upward */}
      <div
        style={{
          backgroundColor: "var(--color-everglade, #2d4a3e)",
          inset: 0,
          position: "absolute",
          transform: `scaleY(${curtainScale})`,
          transformOrigin: "0% 100%",
          zIndex: 10,
        }}
      />

      {/* Logo group */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          opacity: logoOpacity,
          position: "relative",
        }}
      >
        <svg
          aria-hidden="true"
          height={159}
          style={{ display: "block", overflow: "visible" }}
          viewBox="0 0 147.75 117.21"
          width={200}
        >
          <path
            d={BC_BIRD_PATH}
            fill="none"
            stroke="var(--color-everglade-light, #2d4a3e)"
            strokeDasharray={evolution.strokeDasharray}
            strokeDashoffset={evolution.strokeDashoffset}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
          <path
            d={BC_BIRD_PATH}
            fill="var(--color-everglade-light, #2d4a3e)"
            style={{
              opacity: logoFillOpacity,
              position: "absolute",
            }}
          />
        </svg>

        {/* Company name */}
        <div
          style={{
            opacity: nameOpacity,
            textAlign: "center",
            transform: `translateY(${nameY}px)`,
          }}
        >
          <p
            style={{
              color: "var(--color-everglade, #2d4a3e)",
              fontFamily: "Rift, sans-serif",
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "0.0em",
              lineHeight: 1,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Birdcreek Roofing
          </p>
        </div>
        <ExpandLine
          color="var(--color-accent-light)"
          height={6}
          maxWidth={320}
          startFrame={80}
        />
      </div>
    </AbsoluteFill>
  );
}

export default LogoAnimation;
