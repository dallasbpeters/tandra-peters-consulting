import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { Suspense, useLayoutEffect, useRef } from "react";
import * as THREE from "three";

// Suppress THREE.Clock deprecation warning emitted by @react-three/fiber internals.
// Remove once R3F ships a version that uses THREE.Timer instead.
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("THREE.Clock") &&
    args[0].includes("deprecated")
  )
    return;
  _warn(...args);
};
import { useGLTF } from "@react-three/drei";
import { loadFont, fontFamily } from "@remotion/google-fonts/InstrumentSerif";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { CameraConfig, ParsedRoofScene, RoofSceneProps } from "./composition/roofSceneSchema";
import type { Chapter } from "./types";

import { CHAPTERS } from "./chapters";
import Logo from "./components/Logo";
import { RoofCTA } from "./RoofCTA";
import { Model } from "./RoofModel";

loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

// ─── spherical → cartesian ───────────────────────────────────────────────────
//
//  azimuthal : 0 = front (+Z), 90 = right (+X), -90 = left (-X)  [degrees]
//  polar     : 0 = directly above, 90 = side-on, 180 = below      [degrees]
//  radius    : distance from target                                 [world units]

const sphericalToCartesian = (cam: CameraConfig): { pos: THREE.Vector3; target: THREE.Vector3 } => {
  const az = (cam.azimuthal * Math.PI) / 180;
  const po = (cam.polar * Math.PI) / 180;
  const target = new THREE.Vector3(cam.targetX, cam.targetY, cam.targetZ);
  const pos = new THREE.Vector3(
    target.x + cam.radius * Math.sin(po) * Math.sin(az),
    target.y + cam.radius * Math.cos(po),
    target.z + cam.radius * Math.sin(po) * Math.cos(az),
  );
  return { pos, target };
};

// Interpolate two CameraConfigs linearly (spring drives the t value)
const lerpCam = (a: CameraConfig, b: CameraConfig, t: number): CameraConfig => ({
  azimuthal: a.azimuthal + (b.azimuthal - a.azimuthal) * t,
  polar: a.polar + (b.polar - a.polar) * t,
  radius: a.radius + (b.radius - a.radius) * t,
  targetX: a.targetX + (b.targetX - a.targetX) * t,
  targetY: a.targetY + (b.targetY - a.targetY) * t,
  targetZ: a.targetZ + (b.targetZ - a.targetZ) * t,
});

// ─── shared camera-state computation ─────────────────────────────────────────
// Returns the spring-blended camera config for a given frame.
// Used by both CameraRig (inside canvas) and hotspot projection (DOM layer).

type ChapterState = {
  blendedCam: CameraConfig;
  activeIdx: number;
  chapterFrame: number;
};

const computeCameraState = (
  frame: number,
  fps: number,
  introFrames: number,
  chapters: ParsedRoofScene["chapters"],
  springStiffness: number,
  springDamping: number,
): ChapterState | null => {
  const activeChs = chapters.filter((c) => !c.skip);
  if (activeChs.length === 0) return null;

  const compositionFrame = Math.max(0, frame - introFrames);
  let accumulated = 0;
  let idx = 0;
  let chapterFrame = 0;

  for (let i = 0; i < activeChs.length; i++) {
    const ch = activeChs[i];
    if (!ch) break;
    const dur = Math.round(ch.durationSecs * fps);
    if (compositionFrame < accumulated + dur) {
      idx = i;
      chapterFrame = compositionFrame - accumulated;
      break;
    }
    accumulated += dur;
    idx = Math.min(i + 1, activeChs.length - 1);
    chapterFrame = 0;
  }

  const progress = spring({
    frame: chapterFrame,
    fps,
    config: { damping: springDamping, stiffness: springStiffness, mass: 1 },
  });

  const fromCam = activeChs[Math.max(0, idx - 1)]?.camera;
  const toCam = activeChs[idx]?.camera;
  if (!fromCam || !toCam) return null;

  return {
    blendedCam: idx === 0 ? toCam : lerpCam(fromCam, toCam, progress),
    activeIdx: idx,
    chapterFrame,
  };
};

// ─── project 3D world position → 2D screen coords ───────────────────────────
// Creates a throwaway PerspectiveCamera (deterministic, OK in Remotion rendering)
// to project a world-space point to pixel coordinates.

type ScreenPoint = { x: number; y: number; visible: boolean };

const projectToScreen = (
  worldPos: { x: number; y: number; z: number },
  cam: CameraConfig,
  fovDeg: number,
  width: number,
  height: number,
): ScreenPoint => {
  const { pos, target } = sphericalToCartesian(cam);
  const aspect = width / height;
  const tempCam = new THREE.PerspectiveCamera(fovDeg, aspect, 0.1, 300);
  tempCam.position.copy(pos);
  tempCam.lookAt(target);
  tempCam.updateMatrixWorld();
  tempCam.updateProjectionMatrix();

  const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
  vec.project(tempCam);

  return {
    x: (vec.x * 0.5 + 0.5) * width,
    y: (vec.y * -0.5 + 0.5) * height,
    visible: vec.z < 1 && vec.z > -1,
  };
};

// ─── camera rig ──────────────────────────────────────────────────────────────

type CameraRigProps = {
  frame: number;
  fps: number;
  introFrames: number;
  chapters: ParsedRoofScene["chapters"];
  springStiffness: number;
  springDamping: number;
};

const CameraRig: React.FC<CameraRigProps> = (props) => {
  const { camera } = useThree();
  const ref = useRef(props);
  ref.current = props;

  const applyCamera = (state: ChapterState) => {
    const { pos, target } = sphericalToCartesian(state.blendedCam);
    camera.position.copy(pos);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };

  // Set camera immediately on mount (before first frame renders).
  useLayoutEffect(() => {
    if (props.chapters.length === 0) return;
    const first = computeCameraState(
      0,
      props.fps,
      props.introFrames,
      props.chapters,
      props.springStiffness,
      props.springDamping,
    );
    if (first) applyCamera(first);
  }, []);

  useFrame(() => {
    const { frame, fps, introFrames, chapters, springStiffness, springDamping } = ref.current;
    const state = computeCameraState(
      frame,
      fps,
      introFrames,
      chapters,
      springStiffness,
      springDamping,
    );
    if (!state) return;
    applyCamera(state);
  });

  return null;
};

// ─── pulsing hotspot dot (DOM overlay) ───────────────────────────────────────
// Driven entirely by useCurrentFrame so it renders correctly in both Studio
// preview and headless render (no CSS @keyframes which run on wall-clock time).

const PULSE = 50; // frames per pulse cycle

const HotspotDot: React.FC<{
  screen: ScreenPoint;
  num: string;
  globalFrame: number;
  introFrames: number;
  isActive?: boolean;
}> = ({ screen, num, globalFrame, introFrames }) => {
  const DOT = 62;

  const opacity = interpolate(globalFrame, [introFrames, introFrames + 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  const t1 = (globalFrame % PULSE) / PULSE;
  const ring1Scale = interpolate(t1, [0, 1], [1, 2.4]);
  const ring1Opacity = interpolate(t1, [0, 0.55, 1], [0.75, 0, 0]);

  const t2 = ((globalFrame + Math.round(PULSE / 2)) % PULSE) / PULSE;
  const ring2Scale = interpolate(t2, [0, 1], [1, 2.4]);
  const ring2Opacity = interpolate(t2, [0, 0.55, 1], [0.75, 0, 0]);

  if (!screen.visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: screen.x,
        top: screen.y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: DOT,
          height: DOT,
          borderRadius: "50%",
          border: "2px solid #9c99ff",
          transform: `translate(-50%,-50%) scale(${ring1Scale})`,
          opacity: ring1Opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: DOT,
          height: DOT,
          borderRadius: "50%",
          border: "2px solid #9c99ff",
          transform: `translate(-50%,-50%) scale(${ring2Scale})`,
          opacity: ring2Opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: DOT,
          height: DOT,
          borderRadius: "50%",
          backgroundColor: "#9c99ff",
          transform: "translate(-50%,-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 18px 4px rgba(156,153,255,0.45)",
        }}
      >
        <span
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 42,
            fontWeight: 800,
            color: "#000000",
            letterSpacing: "-0.01em",
          }}
        >
          {num.replace(".", "")}
        </span>
      </div>
    </div>
  );
};

// ─── callout card ─────────────────────────────────────────────────────────────

const Callout: React.FC<{ chapter: Chapter }> = ({ chapter }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 8], [36, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 40px 40px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          backgroundColor: "rgb( from var(--color-black) r g b / 0.92)",
          padding: "32px 48px",
          maxWidth: 700,
        }}
      >
        <div
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--color-purple-dark",
            marginBottom: 8,
          }}
        >
          {chapter.num}
        </div>

        <h2
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 62,
            color: "#ffffff",
            margin: "0 0 12px",
            lineHeight: 1.05,
          }}
        >
          {chapter.callout.title}
        </h2>

        <p
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 32,
            lineHeight: 1.65,
            color: "var(--color-paper-dark)",
            margin: "0 0 16px",
          }}
        >
          {chapter.callout.body}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <span
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-purple-dark)",
              flexShrink: 0,
              paddingTop: 3,
            }}
          >
            Watch for
          </span>
          <p
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 30,
              lineHeight: 1.55,
              color: "#d0d0c4",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {chapter.callout.watchFor}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── progress dots ────────────────────────────────────────────────────────────

const ProgressHeader: React.FC<{
  frame: number;
  introFrames: number;
  chapters: ParsedRoofScene["chapters"];
}> = ({ frame, introFrames, chapters }) => {
  const opacity = interpolate(frame, [introFrames, introFrames + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeChs = (chapters ?? []).filter((c) => !c.skip);
  const compositionFrame = Math.max(0, frame - introFrames);
  let accumulated = 0;
  let activeIdx = 0;
  for (let i = 0; i < activeChs.length; i++) {
    const ch = activeChs[i];
    if (!ch) break;
    const dur = Math.round(ch.durationSecs * 30);
    if (compositionFrame < accumulated + dur) {
      activeIdx = i;
      break;
    }
    accumulated += dur;
    activeIdx = i;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "6%",
        left: 68,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "#69a758",
          marginBottom: 10,
        }}
      >
        Roof Anatomy
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {activeChs.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIdx ? 38 : 12,
              height: 8,
              borderRadius: 2,
              backgroundColor: i <= activeIdx ? "var(--color-purple-dark)" : "#2a4437",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── main composition ─────────────────────────────────────────────────────────

export const RoofScene: React.FC<RoofSceneProps> = (rawProps) => {
  const props = roofSceneSchema.parse(rawProps);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const introFrames = Math.round(props.introSecs * fps);

  // Build Sequence layout for active chapters
  type Seq = { from: number; duration: number; chapterIdx: number };
  const sequences: Seq[] = [];
  let cursor = introFrames;
  CHAPTERS.forEach((_, globalIdx) => {
    const chCfg = props.chapters[globalIdx];
    if (!chCfg || chCfg.skip) return;
    const dur = Math.round(chCfg.durationSecs * fps);
    sequences.push({ from: cursor, duration: dur, chapterIdx: globalIdx });
    cursor += dur;
  });
  const ctaFrom = cursor;
  const ctaDuration = Math.round(
    (Number.isFinite(props.cta?.durationSecs) ? props.cta.durationSecs : 6) * fps,
  );

  // Fade the veil out over ~500 ms (15 frames) at the end of the intro period
  const FADE_FRAMES = Math.round(0.5 * fps);
  const fadeStart = Math.max(0, introFrames - FADE_FRAMES);
  const introFade = interpolate(frame, [fadeStart, Math.max(introFrames, fadeStart + 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Compute current camera state for hotspot projection (same math as CameraRig)
  const camState = computeCameraState(
    frame,
    fps,
    introFrames,
    props.chapters,
    props.springStiffness,
    props.springDamping,
  );

  // Active chapter only — find global index and project its hotspot
  const activeEntries: {
    globalIdx: number;
    cfg: ParsedRoofScene["chapters"][number];
  }[] = [];
  props.chapters.forEach((cfg, globalIdx) => {
    if (!cfg.skip) activeEntries.push({ globalIdx, cfg });
  });
  const activeEntry = camState ? activeEntries[camState.activeIdx] : null;
  const activeHotspotScreen =
    camState && activeEntry
      ? projectToScreen(activeEntry.cfg.hotspot, camState.blendedCam, props.fov, width, height)
      : null;
  const activeChapter = activeEntry ? (CHAPTERS[activeEntry.globalIdx] ?? null) : null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#061d14",
        borderBlockEnd: "20px solid var(--color-purple-dark)",
      }}
    >
      {/* ── 3-D canvas ──────────────────────────────────────── */}
      <ThreeCanvas
        shadows="percentage"
        width={width}
        height={height}
        style={{ width, height }}
        dpr={[1, 2]}
        camera={{ fov: props.fov, near: 0.1, far: 300 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight
            position={[12, 80, 50]}
            intensity={5.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-30, 8, 8]} intensity={1.6} color="#9acfe0" />
          <pointLight position={[0, -3, 10]} intensity={0.3} color="#f3a61e" />

          <CameraRig
            frame={frame}
            fps={fps}
            introFrames={introFrames}
            chapters={props.chapters}
            springStiffness={props.springStiffness}
            springDamping={props.springDamping}
          />

          <Model />
        </Suspense>
      </ThreeCanvas>
      {/* ── intro veil ───────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          backgroundColor: "#061d14",
          opacity: 1 - introFade,
          pointerEvents: introFade >= 1 ? "none" : "auto",
        }}
      >
        <Logo
          width={150}
          height={150}
          style={{
            position: "absolute",
            top: "6%",
            left: 68,
            filter: "invert(1)",
          }}
        />
        <div style={{ position: "absolute", bottom: "6%", left: 68 }}>
          <div
            style={{
              fontFamily: "Manrope, sans-serif",
              lineHeight: 1,
              fontSize: 128,
              fontWeight: 800,
              color: "var(--color-white)",
              marginBottom: 10,
            }}
          >
            Seven things I check on every roof.
          </div>
        </div>
      </AbsoluteFill>
      {/* ── pulsing hotspot dot (active chapter only) ────────── */}
      {activeHotspotScreen && activeChapter && frame > introFrames && (
        <HotspotDot
          screen={activeHotspotScreen}
          num={activeChapter.num}
          globalFrame={frame}
          introFrames={introFrames}
          isActive
        />
      )}
      {/* ── progress dots ────────────────────────────────────── */}
      {props.showProgress && (
        <ProgressHeader frame={frame} introFrames={introFrames} chapters={props.chapters} />
      )}
      {/* ── callout cards (one Sequence per active chapter) ──── */}
      {props.showCallouts &&
        sequences.map(({ from, duration, chapterIdx }) => (
          <Sequence key={chapterIdx} from={from} durationInFrames={duration}>
            <Callout chapter={CHAPTERS[chapterIdx]} />
          </Sequence>
        ))}
      {/* ── CTA ──────────────────────────────────────────────── */}
      <Sequence from={ctaFrom} durationInFrames={ctaDuration} layout="none">
        <RoofCTA cta={props.cta} badges={props.badges} durationInFrames={ctaDuration} />
      </Sequence>
    </AbsoluteFill>
  );
};

useGLTF.preload(staticFile("roof.glb"));
