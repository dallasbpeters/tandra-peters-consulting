import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { Suspense, useLayoutEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";

// Suppress THREE.Clock deprecation warning emitted by @react-three/fiber internals.
// Remove once R3F ships a version that uses THREE.Timer instead.
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("THREE.Clock") &&
    args[0].includes("deprecated")
  ) {
    return;
  }
  _warn(...args);
};

import { useGLTF } from "@react-three/drei";
import { fontFamily, loadFont } from "@remotion/google-fonts/InstrumentSerif";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { CHAPTERS } from "./chapters";
import Logo from "./components/logo";
import type {
  CameraConfig,
  ParsedRoofScene,
  RoofSceneProps,
} from "./composition/roof-scene-schema";
import { roofSceneSchema } from "./composition/roof-scene-schema";
import { RoofCTA } from "./roof-cta";
import { Model } from "./roof-model";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400"],
});

// ─── spherical → cartesian ───────────────────────────────────────────────────
//
//  azimuthal : 0 = front (+Z), 90 = right (+X), -90 = left (-X)  [degrees]
//  polar     : 0 = directly above, 90 = side-on, 180 = below      [degrees]
//  radius    : distance from target                                 [world units]

const sphericalToCartesian = (
  cam: CameraConfig
): { pos: Vector3; target: Vector3 } => {
  const az = (cam.azimuthal * Math.PI) / 180;
  const po = (cam.polar * Math.PI) / 180;
  const target = new Vector3(cam.targetX, cam.targetY, cam.targetZ);
  const pos = new Vector3(
    target.x + cam.radius * Math.sin(po) * Math.sin(az),
    target.y + cam.radius * Math.cos(po),
    target.z + cam.radius * Math.sin(po) * Math.cos(az)
  );
  return { pos, target };
};

// Interpolate two CameraConfigs linearly (spring drives the t value)
const lerpCam = (
  a: CameraConfig,
  b: CameraConfig,
  t: number
): CameraConfig => ({
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

interface ChapterState {
  activeIdx: number;
  blendedCam: CameraConfig;
  chapterFrame: number;
}

const computeCameraState = (
  frame: number,
  fps: number,
  introFrames: number,
  chapters: ParsedRoofScene["chapters"],
  springStiffness: number,
  springDamping: number
): ChapterState | null => {
  const activeChs = chapters.filter((c) => !c.skip);
  if (activeChs.length === 0) {
    return null;
  }

  const compositionFrame = Math.max(0, frame - introFrames);
  let accumulated = 0;
  let idx = 0;
  let chapterFrame = 0;

  for (let i = 0; i < activeChs.length; i++) {
    const ch = activeChs[i];
    if (!ch) {
      break;
    }
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
    config: { damping: springDamping, mass: 1, stiffness: springStiffness },
    fps,
    frame: chapterFrame,
  });

  const fromCam = activeChs[Math.max(0, idx - 1)]?.camera;
  const toCam = activeChs[idx]?.camera;
  if (!(fromCam && toCam)) {
    return null;
  }

  return {
    activeIdx: idx,
    blendedCam: idx === 0 ? toCam : lerpCam(fromCam, toCam, progress),
    chapterFrame,
  };
};

// ─── project 3D world position → 2D screen coords ───────────────────────────
// Creates a throwaway PerspectiveCamera (deterministic, OK in Remotion rendering)
// to project a world-space point to pixel coordinates.

interface ScreenPoint {
  visible: boolean;
  x: number;
  y: number;
}

const projectToScreen = (
  worldPos: { x: number; y: number; z: number },
  cam: CameraConfig,
  fovDeg: number,
  width: number,
  height: number
): ScreenPoint => {
  const { pos, target } = sphericalToCartesian(cam);
  const aspect = width / height;
  const tempCam = new PerspectiveCamera(fovDeg, aspect, 0.1, 300);
  tempCam.position.copy(pos);
  tempCam.lookAt(target);
  tempCam.updateMatrixWorld();
  tempCam.updateProjectionMatrix();

  const vec = new Vector3(worldPos.x, worldPos.y, worldPos.z);
  vec.project(tempCam);

  return {
    visible: vec.z < 1 && vec.z > -1,
    x: (vec.x * 0.5 + 0.5) * width,
    y: (vec.y * -0.5 + 0.5) * height,
  };
};

// ─── camera rig ──────────────────────────────────────────────────────────────

interface CameraRigProps {
  chapters: ParsedRoofScene["chapters"];
  fps: number;
  frame: number;
  introFrames: number;
  springDamping: number;
  springStiffness: number;
}

const CameraRig: React.FC<CameraRigProps> = (props) => {
  const { camera, invalidate } = useThree();
  const ref = useRef(props);
  ref.current = props;

  const applyCamera = (state: ChapterState) => {
    const { pos, target } = sphericalToCartesian(state.blendedCam);
    camera.position.copy(pos);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
  };

  // Apply camera state from the latest ref values.
  const applyCurrent = () => {
    const {
      frame,
      fps,
      introFrames,
      chapters,
      springStiffness,
      springDamping,
    } = ref.current;
    const state = computeCameraState(
      frame,
      fps,
      introFrames,
      chapters,
      springStiffness,
      springDamping
    );
    if (state) {
      applyCamera(state);
    }
  };

  // Run on every render (catches prop changes while paused —
  // useFrame only fires on frame advances in @remotion/three).
  useLayoutEffect(() => {
    applyCurrent();
  });

  // Frame-by-frame updates during playback / scrubbing.
  useFrame(() => {
    applyCurrent();
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

  const opacity = interpolate(
    globalFrame,
    [introFrames, introFrames + 18],
    [0, 1],
    {
      extrapolateRight: "clamp",
    }
  );

  const t1 = (globalFrame % PULSE) / PULSE;
  const ring1Scale = interpolate(t1, [0, 1], [1, 2.4]);
  const ring1Opacity = interpolate(t1, [0, 0.55, 1], [0.75, 0, 0]);

  const t2 = ((globalFrame + Math.round(PULSE / 2)) % PULSE) / PULSE;
  const ring2Scale = interpolate(t2, [0, 1], [1, 2.4]);
  const ring2Opacity = interpolate(t2, [0, 0.55, 1], [0.75, 0, 0]);

  if (!screen.visible) {
    return null;
  }

  return (
    <div
      style={{
        height: 0,
        left: screen.x,
        opacity,
        pointerEvents: "none",
        position: "absolute",
        top: screen.y,
        width: 0,
      }}
    >
      <div
        style={{
          border: "2px solid #9c99ff",
          borderRadius: "50%",
          height: DOT,
          opacity: ring1Opacity,
          position: "absolute",
          transform: `translate(-50%,-50%) scale(${ring1Scale})`,
          width: DOT,
        }}
      />
      <div
        style={{
          border: "2px solid #9c99ff",
          borderRadius: "50%",
          height: DOT,
          opacity: ring2Opacity,
          position: "absolute",
          transform: `translate(-50%,-50%) scale(${ring2Scale})`,
          width: DOT,
        }}
      />
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#9c99ff",
          borderRadius: "50%",
          boxShadow: "0 0 18px 4px rgba(156,153,255,0.45)",
          display: "flex",
          height: DOT,
          justifyContent: "center",
          position: "absolute",
          transform: "translate(-50%,-50%)",
          width: DOT,
        }}
      >
        <span
          style={{
            color: "#000000",
            fontFamily: "Manrope, sans-serif",
            fontSize: 42,
            fontWeight: 800,
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

interface ResolvedCallout {
  body: string;
  num: string;
  title: string;
  watchFor: string;
}

/**
 * Merge editable callout copy (props) over the static CHAPTERS fallback.
 * Empty/missing prop strings fall back to the hardcoded chapter copy.
 */
const resolveCallout = (
  globalIdx: number,
  cfg: ParsedRoofScene["chapters"][number] | undefined
): ResolvedCallout => {
  const base = CHAPTERS[globalIdx];
  const override = cfg?.callout;
  const pick = (a: string | undefined, b: string | undefined): string =>
    a && a.trim().length > 0 ? a : (b ?? "");
  return {
    body: pick(override?.body, base?.callout.body),
    num: pick(override?.num, base?.num),
    title: pick(override?.title, base?.callout.title),
    watchFor: pick(override?.watchFor, base?.callout.watchFor),
  };
};

const Callout: React.FC<{ callout: ResolvedCallout }> = ({ callout }) => {
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
          backgroundColor: "rgb( from var(--color-black) r g b / 0.92)",
          maxWidth: 700,
          opacity,
          padding: "32px 48px",
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            color: "var(--color-purple-dark",
            fontFamily: "Manrope, sans-serif",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.22em",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          {callout.num}
        </div>

        <h2
          style={{
            color: "#ffffff",
            fontFamily,
            fontSize: 62,
            fontWeight: 400,
            lineHeight: 1.05,
            margin: "0 0 12px",
          }}
        >
          {callout.title}
        </h2>

        <p
          style={{
            color: "var(--color-paper-dark)",
            fontFamily: "Manrope, sans-serif",
            fontSize: 32,
            lineHeight: 1.65,
            margin: "0 0 16px",
          }}
        >
          {callout.body}
        </p>

        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span
            style={{
              color: "var(--color-purple-dark)",
              flexShrink: 0,
              fontFamily: "Manrope, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.18em",
              paddingTop: 3,
              textTransform: "uppercase",
            }}
          >
            Watch for
          </span>
          <p
            style={{
              color: "#d0d0c4",
              fontFamily: "Manrope, sans-serif",
              fontSize: 30,
              fontStyle: "italic",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {callout.watchFor}
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
    if (!ch) {
      break;
    }
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
        left: 68,
        opacity,
        pointerEvents: "none",
        position: "absolute",
        top: "6%",
      }}
    >
      <div
        style={{
          color: "#69a758",
          fontFamily: "Manrope, sans-serif",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.24em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        Roof Anatomy
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {activeChs.map((ch, i) => (
          <div
            key={ch.callout?.num ?? i}
            style={{
              backgroundColor:
                i <= activeIdx ? "var(--color-purple-dark)" : "#2a4437",
              borderRadius: 2,
              height: 8,
              width: i === activeIdx ? 38 : 12,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── main composition ─────────────────────────────────────────────────────────

const fallbackProps = roofSceneSchema.parse({});
let stableProps = fallbackProps;

export const RoofScene: React.FC<RoofSceneProps> = (rawProps) => {
  const parsed = roofSceneSchema.safeParse(rawProps);
  if (parsed.success) {
    stableProps = parsed.data;
  }
  const props = stableProps;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const introFrames = Math.round(props.introSecs * fps);

  // Build Sequence layout for active chapters
  interface Seq {
    chapterIdx: number;
    duration: number;
    from: number;
  }
  const sequences: Seq[] = [];
  let cursor = introFrames;
  CHAPTERS.forEach((_, globalIdx) => {
    const chCfg = props.chapters[globalIdx];
    if (!chCfg || chCfg.skip) {
      return;
    }
    const dur = Math.round(chCfg.durationSecs * fps);
    sequences.push({ chapterIdx: globalIdx, duration: dur, from: cursor });
    cursor += dur;
  });
  const ctaFrom = cursor;
  const ctaDuration = Math.round(
    (Number.isFinite(props.cta?.durationSecs) ? props.cta.durationSecs : 6) *
      fps
  );

  // Fade the veil out over ~500 ms (15 frames) at the end of the intro period
  const FADE_FRAMES = Math.round(0.5 * fps);
  const fadeStart = Math.max(0, introFrames - FADE_FRAMES);
  const introFade = interpolate(
    frame,
    [fadeStart, Math.max(introFrames, fadeStart + 1)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Compute current camera state for hotspot projection (same math as CameraRig)
  const camState = computeCameraState(
    frame,
    fps,
    introFrames,
    props.chapters,
    props.springStiffness,
    props.springDamping
  );

  // Active chapter only — find global index and project its hotspot
  const activeEntries: {
    globalIdx: number;
    cfg: ParsedRoofScene["chapters"][number];
  }[] = [];
  props.chapters.forEach((cfg, globalIdx) => {
    if (!cfg.skip) {
      activeEntries.push({ cfg, globalIdx });
    }
  });
  const activeEntry = camState ? activeEntries[camState.activeIdx] : null;
  const activeHotspotScreen =
    camState && activeEntry
      ? projectToScreen(
          activeEntry.cfg.hotspot,
          camState.blendedCam,
          props.fov,
          width,
          height
        )
      : null;
  const activeCallout = activeEntry
    ? resolveCallout(activeEntry.globalIdx, activeEntry.cfg)
    : null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#061d14",
        borderBlockEnd: "20px solid var(--color-purple-dark)",
      }}
    >
      {/* ── 3-D canvas ──────────────────────────────────────── */}
      <ThreeCanvas
        camera={{ far: 300, fov: props.fov, near: 0.1 }}
        dpr={[1, 2]}
        height={height}
        shadows="percentage"
        style={{ height, width }}
        width={width}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight
            castShadow
            intensity={5.5}
            position={[12, 80, 50]}
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight
            color="#9acfe0"
            intensity={1.6}
            position={[-30, 8, 8]}
          />
          <pointLight color="#f3a61e" intensity={0.3} position={[0, -3, 10]} />

          <CameraRig
            chapters={props.chapters}
            fps={fps}
            frame={frame}
            introFrames={introFrames}
            springDamping={props.springDamping}
            springStiffness={props.springStiffness}
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
          height={150}
          style={{
            filter: "invert(1)",
            left: 68,
            position: "absolute",
            top: "6%",
          }}
          width={150}
        />
        <div style={{ bottom: "6%", left: 68, position: "absolute" }}>
          <div
            style={{
              color: "var(--color-white)",
              fontFamily: "Manrope, sans-serif",
              fontSize: 128,
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: 10,
            }}
          >
            Seven things I check on every roof.
          </div>
        </div>
      </AbsoluteFill>
      {/* ── pulsing hotspot dot (active chapter only) ────────── */}
      {activeHotspotScreen && activeCallout && frame > introFrames && (
        <HotspotDot
          globalFrame={frame}
          introFrames={introFrames}
          isActive
          num={activeCallout.num}
          screen={activeHotspotScreen}
        />
      )}
      {/* ── progress dots ────────────────────────────────────── */}
      {props.showProgress && (
        <ProgressHeader
          chapters={props.chapters}
          frame={frame}
          introFrames={introFrames}
        />
      )}
      {/* ── callout cards (one Sequence per active chapter) ──── */}
      {props.showCallouts &&
        sequences.map(({ from, duration, chapterIdx }) => (
          <Sequence durationInFrames={duration} from={from} key={chapterIdx}>
            <Callout
              callout={resolveCallout(chapterIdx, props.chapters[chapterIdx])}
            />
          </Sequence>
        ))}
      {/* ── CTA ──────────────────────────────────────────────── */}
      <Sequence durationInFrames={ctaDuration} from={ctaFrom} layout="none">
        <RoofCTA
          badges={props.badges}
          cta={props.cta}
          durationInFrames={ctaDuration}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

useGLTF.preload(staticFile("roof.glb"));
