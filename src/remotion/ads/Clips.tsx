import "./ads.vars.css";
import { loadFont as loadFont2 } from "@remotion/fonts";
import {
  loadFont,
  fontFamily as manrope,
} from "@remotion/google-fonts/Manrope";
import { LightLeak } from "@remotion/light-leaks";
import { preloadImage } from "@remotion/preload";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { adsFile, toSrc } from "./adsFile";
import { BadgeRow } from "./components/BadgeRow";
import BirdAnimation from "./components/Bird";
import { FadeWrapper } from "./components/FadeWrapper";
import LogoAnimation from "./components/GsapMotion";
import Logo from "./components/Logo";
import { ProfilePhoto } from "./components/ProfilePhoto";
import RoundedTextBox from "./components/TextBox";
import type { SceneConfig } from "./composition/customSchema";
import type { RoofValueProps } from "./composition/roofValueSchema";
import type { StormSpotProps } from "./composition/stormSpotSchema";

/**
 * Ad composition assets live under `public/ads/` in this repo (kept isolated
 * from the TandraIntro / site assets at the public root). `roof.glb` is the one
 * exception — it is shared at the public root and resolved with a bare
 * `staticFile("roof.glb")` in RoofScene/RoofModel.
 */

loadFont("normal", {
  weights: ["300", "600", "700", "800"],
  subsets: ["latin"],
});

loadFont2({
  family: "HandelsonTwo",
  url: adsFile("fonts/HandelsonTwo.otf"),
  weight: "400",
  style: "normal",
});

loadFont2({
  family: "Rift",
  url: adsFile("fonts/RiftDemi.otf"),
  weight: "600",
  style: "normal",
});

loadFont2({
  family: "Rift",
  url: adsFile("fonts/RiftBold.otf"),
  weight: "700",
  style: "normal",
});

// Use fontFamily: "Rift" in styles, weight "600" (Demi) or "700" (Bold)
// Use fontFamily: "HandelsonTwo" for script/italic text

// ── Constants ──────────────────────────────────────────────────────────────────

const handelson = "HandelsonTwo";

const H_PAD = 72;
const preStyle: React.CSSProperties = { whiteSpace: "pre-line" };

const BenefitIcons = [
  "home-04-stroke-sharp.svg",
  "material-and-texture-stroke-sharp.svg",
  "task-01-stroke-sharp.svg",
];

// ─────────────────────────────────────────────────────────────────────────────
// SCENE-LEVEL TRANSITION WRAPPERS
// Each wraps a full scene with an entrance and exit animation.
// useVideoConfig().durationInFrames gives the Sequence's length, so
// exit timing is self-contained — no extra props needed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clip-path wipe: reveals scene left→right on enter,
 * sweeps away left→right on exit.
 */
const WipeWrap: React.FC<{
  children: React.ReactNode;
  exitFrames?: number;
}> = ({ children, exitFrames = 18 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 42, stiffness: 280 },
    from: 0,
    to: 1,
  });

  const rightInset = interpolate(enterProgress, [0, 1], [100, 0]);
  const exitStart = durationInFrames - exitFrames;
  const isExiting = exitFrames > 0 && frame >= exitStart;
  const leftInset = isExiting
    ? interpolate(frame, [exitStart, durationInFrames], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const clipPath = isExiting
    ? `inset(0 0 0 ${leftInset}%)`
    : `inset(0 ${rightInset}% 0 0)`;

  return <AbsoluteFill style={{ clipPath }}>{children}</AbsoluteFill>;
};

/**
 * Scale punch: scene springs in from 0.92 scale, exits with opacity fade.
 */
const PunchWrap: React.FC<{
  children: React.ReactNode;
  exitFrames?: number;
}> = ({ children, exitFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 260, mass: 0.5 },
    from: 0.92,
    to: 1,
  });
  const x = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 150, mass: 0.25 },
    from: 500,
    to: 0,
  });

  const opacity = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 200 },
    from: 0,
    to: 1,
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale}) translateX(${x}px)`,
        opacity: Math.min(opacity, exitOpacity),
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Slide: scene glides in from the right (120 px), exits with opacity fade.
 */
const SlideWrap: React.FC<{
  children: React.ReactNode;
  exitFrames?: number;
}> = ({ children, exitFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 26, stiffness: 180 },
    from: 0,
    to: 1,
  });

  const translateX = interpolate(enterProgress, [0, 1], [120, 0]);
  const opacity = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 160 },
    from: 0,
    to: 1,
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${translateX}px)`,
        opacity: Math.min(opacity, exitOpacity),
        backgroundColor: "var(--color-everglade)",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Shutter: clip-path reveals scene bottom→top, exits with opacity fade.
 */
const ShutterWrap: React.FC<{
  children: React.ReactNode;
  exitFrames?: number;
}> = ({ children, exitFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 36, stiffness: 270 },
    from: 0,
    to: 1,
  });

  const bottomInset = interpolate(enterProgress, [0, 1], [100, 0]);
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{ clipPath: `inset(0 0 ${bottomInset}% 0)`, opacity: exitOpacity }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT ANIMATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Clip-path text reveal: wipes content left→right. */
const TextWipe: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
}> = ({ children, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 34, stiffness: 210 },
    from: 0,
    to: 1,
  });

  const rightInset = interpolate(progress, [0, 1], [100, 0]);

  return (
    <div
      style={{
        clipPath: `inset(-8% ${rightInset}% -8% 0)`,
        overflow: "visible",
      }}
    >
      {children}
    </div>
  );
};

/** Spring scale punch for individual elements. */
const PunchIn: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  style?: React.CSSProperties;
}> = ({ children, startFrame = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 300, mass: 0.4 },
    from: 0.75,
    to: 1,
  });

  const opacity = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 200 },
    from: 0,
    to: 1,
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: "left center",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Slides up from below with spring easing. */
const SlideUp: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  style?: React.CSSProperties;
}> = ({ children, startFrame = 0, style }) => {
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
    <div
      style={{ transform: `translateY(${translateY}px)`, opacity, ...style }}
    >
      {children}
    </div>
  );
};

/** Simple opacity fade-in. */
const FadeIn: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  style?: React.CSSProperties;
}> = ({ children, startFrame = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 30, stiffness: 80 },
    from: 0,
    to: 1,
  });

  return <div style={{ opacity, ...style }}>{children}</div>;
};

/** Horizontal line that expands from 0 to maxWidth. */
export const ExpandLine: React.FC<{
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

  return (
    <div
      style={{
        width: interpolate(progress, [0, 1], [0, maxWidth]),
        height,
        background: color,
        borderRadius: 2,
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BACKGROUNDS
// ─────────────────────────────────────────────────────────────────────────────

const EvergladeBg: React.FC = () => (
  <AbsoluteFill
    style={{
      zIndex: 0,
      background:
        "radial-gradient(ellipse at 30% 40%, var(--color-everglade-light) 0%, var(--color-everglade) 60%)",
    }}
  />
);
const OverlayBg: React.FC = () => (
  <AbsoluteFill
    style={{
      zIndex: 2,
      background:
        "radial-gradient(ellipse at 0% 00%, color-mix(in srgb, var(--color-black) 90%, transparent) 0%, color-mix(in srgb, var(--color-black) 50%, transparent) 100%)",
    }}
  />
);
const ImageBg: React.FC<{ image?: string }> = ({ image }) => {
  const src = image ? toSrc(image) : null;
  // delayRender blocks this scene's frames until the image is loaded.
  const [handle] = useState(() =>
    src ? delayRender(`ImageBg: ${src}`) : null
  );

  useEffect(() => {
    if (!src || handle === null) {
      return;
    }
    // hint the browser preload cache
    const cleanupHint = preloadImage(src);
    // also block rendering via a real Image load event
    const img = new Image();
    img.onload = () => continueRender(handle);
    img.onerror = () => continueRender(handle); // don't block forever
    img.src = src;
    return () => {
      cleanupHint();
      img.src = "";
    };
  }, [src, handle]);

  if (!src) {
    return null;
  }
  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
        }}
      />
    </AbsoluteFill>
  );
};

const PaperBg: React.FC = () => (
  <AbsoluteFill style={{ background: "var(--color-paper)" }} />
);

const PurpleBg: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 60% 30%, #b8b6ff 0%, var(--color-hero-accent) 100%)",
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 — Hook (0–180 f / 6 s)
// Entrance: clip-path wipe left→right. Paper background, everglade type.
// Headline lines reveal word-by-word with TextWipe.
// ─────────────────────────────────────────────────────────────────────────────

type HookProps = RoofValueProps["hook"];

const SceneHook: React.FC<HookProps> = ({ eyebrow, headline, sub, image }) => (
  <WipeWrap>
    <ImageBg image={image} />
    <OverlayBg />
    <AbsoluteFill
      style={{
        zIndex: 3,
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px 160px`,
        borderBlockEnd: "25px solid var(--color-purple-dark)",
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <span
            style={{
              fontFamily: manrope,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--color-hero-accent)",
              display: "block",
              marginBottom: 28,
            }}
          >
            {eyebrow}
          </span>
        </SlideUp>
        <ExpandLine
          color="var(--color-white)"
          height={5}
          maxWidth={160}
          startFrame={8}
        />
        <div style={{ marginTop: 36, marginBottom: 48 }}>
          {headline.split("\n").map((line, i) => (
            <TextWipe key={line} startFrame={20 + i * 10}>
              <div
                style={{
                  fontFamily: manrope,
                  fontSize: 112,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--color-white)",
                }}
              >
                {line}
              </div>
            </TextWipe>
          ))}
        </div>
        <FadeIn startFrame={65}>
          <p
            style={{
              fontFamily: manrope,
              fontSize: 80,
              fontWeight: 700,
              lineHeight: 1.25,
              color: "var(--color-paper-dark)",
              margin: 0,
              ...preStyle,
            }}
          >
            {sub}
          </p>
        </FadeIn>
      </div>
    </AbsoluteFill>
  </WipeWrap>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 — Benefits (180–360 f / 6 s)
// Entrance: scale punch from 0.92. Everglade background.
// Three benefit lines stagger-slide up with colored accent dots.
// ─────────────────────────────────────────────────────────────────────────────

type BenefitsProps = RoofValueProps["benefits"];

const SceneBenefits: React.FC<BenefitsProps> = ({
  lead,
  item1,
  item2,
  item3,
}) => {
  const items = [item1, item2, item3];
  const dotColors = [
    "var(--color-danger)",
    "var(--color-accent)",
    "var(--color-everglade-muted)",
  ];

  return (
    <PunchWrap>
      <EvergladeBg />
      <NoiseBackground />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: `0 ${H_PAD}px`,
        }}
      >
        <div style={{ width: "100%" }}>
          <PunchIn startFrame={0}>
            <span
              style={{
                fontFamily: manrope,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--color-white)",
                display: "block",
                marginBottom: 32,
              }}
            >
              {lead}
            </span>
          </PunchIn>
          <ExpandLine
            color="var(--color-purple)"
            height={4}
            maxWidth={220}
            startFrame={10}
          />
          <div style={{ marginTop: 56 }}>
            {items.map((item, i) => (
              <SlideUp key={item} startFrame={25 + i * 32}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 28,
                    marginBottom: 28,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      flexShrink: 0,
                      backgroundColor: dotColors[i],
                      WebkitMaskImage: `url(${adsFile(BenefitIcons[i])})`,
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskImage: `url(${adsFile(BenefitIcons[i])})`,
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: manrope,
                      fontSize: 82,
                      fontWeight: 700,
                      lineHeight: 1.05,
                      color: "var(--color-white)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </PunchWrap>
  );
};

type HelpingTexasHomeownersProps = Extract<SceneConfig, { type: "helping" }>;

const SceneHelpingTexasHomeowners: React.FC<HelpingTexasHomeownersProps> = ({
  line1,
  line2,
  line3,
  style,
  hueshift,
  shiftDuration,
}) => (
  <PunchWrap>
    <EvergladeBg />
    <LightLeak
      durationInFrames={shiftDuration}
      hueShift={hueshift}
      seed={style}
      style={{ opacity: 0.4 }}
    />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%", zIndex: 1 }}>
        <PunchIn startFrame={0}>
          <ExpandLine
            color="var(--color-accent-light)"
            height={5}
            maxWidth={920}
            startFrame={0}
          />
          <div
            style={{
              fontFamily: manrope,
              fontSize: 240,
              fontWeight: 800,
              lineHeight: 0.8,
              letterSpacing: "-0.02em",
              color: "var(--color-white)",
              whiteSpace: "pre-line",
              textAlign: "center",
              marginBlockStart: 50,
            }}
          >
            {line1}
          </div>
          <div
            style={{
              fontFamily: manrope,
              fontSize: 316,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--color-white)",
              marginBottom: 32,
              whiteSpace: "pre-line",
              textAlign: "center",
            }}
          >
            {line2}
          </div>
          <ExpandLine
            color="var(--color-accent-light)"
            height={5}
            maxWidth={920}
            startFrame={10}
          />
        </PunchIn>
        {line3 && (
          <FadeIn startFrame={24}>
            <span
              style={{
                fontFamily: manrope,
                fontSize: 130,
                fontWeight: 800,
                lineHeight: 1.3,
                color: "var(--color-purple-dark)",
                margin: 0,
                display: "block",
                textAlign: "center",
              }}
            >
              {line3}
            </span>

            <ExpandLine
              color="var(--color-accent-light)"
              height={5}
              maxWidth={920}
              startFrame={20}
            />
          </FadeIn>
        )}
      </div>
      <BirdAnimation />
    </AbsoluteFill>
  </PunchWrap>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 — Simple (360–540 f / 6 s)
// Punchy single-headline scene with optional pill subtext.
// ─────────────────────────────────────────────────────────────────────────────

interface SimpleProps {
  body?: string;
  headline: string;
  image?: string;
  pill?: string;
  showPill: boolean;
}

const SceneSimple: React.FC<SimpleProps> = ({
  headline,
  showPill,
  pill,
  image,
  body,
}) => (
  <PunchWrap>
    <ImageBg image={image} />
    <OverlayBg />
    <AbsoluteFill
      style={{
        zIndex: 3,
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${H_PAD}px`,
        borderBlockEnd: "25px solid var(--color-accent)",
      }}
    >
      <PunchIn startFrame={15}>
        <h1
          style={{
            fontFamily: "Rift",
            fontWeight: 700,
            fontSize: 88,
            color: "var(--color-white)",
            display: "block",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          {headline}
        </h1>
      </PunchIn>
      <PunchIn startFrame={30}>
        <p
          style={{
            fontFamily: manrope,
            fontWeight: 500,
            fontSize: 38,
            color: "var(--color-white)",
            display: "block",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          {body}
        </p>
      </PunchIn>
      {showPill && pill && (
        <FadeIn startFrame={42}>
          <div style={{ marginTop: 30 }}>
            <span
              style={{
                fontFamily: manrope,
                fontWeight: 800,
                fontSize: 58,
                lineHeight: 1.05,
                color: "var(--color-everglade)",
                backgroundColor: "var(--color-accent)",
                padding: "10px 20px",
                borderRadius: 4,
              }}
            >
              {pill}
            </span>
          </div>
        </FadeIn>
      )}
      <SlideUp startFrame={60}>
        <div style={{ marginTop: 400 }}>
          <Logo height={150} invert={true} width={150} />
        </div>
      </SlideUp>
    </AbsoluteFill>
  </PunchWrap>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — Intro (540–750 f / 7 s)
// Entrance: slide in from right. Purple background.
// Profile photo scales in; name reveals with TextWipe.
// ─────────────────────────────────────────────────────────────────────────────

type IntroProps = RoofValueProps["intro"];

const SceneIntro: React.FC<IntroProps> = ({
  name,
  tagline,
  detail,
  showProfilePhoto,
  profilePhoto,
}) => (
  <SlideWrap>
    <PurpleBg />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%" }}>
        {showProfilePhoto && (
          <PunchIn startFrame={0}>
            <div style={{ marginBottom: 44 }}>
              <ProfilePhoto
                height={profilePhoto.height}
                src={profilePhoto.src}
                width={profilePhoto.width}
              />
            </div>
          </PunchIn>
        )}
        <TextWipe startFrame={showProfilePhoto ? 18 : 0}>
          <div
            style={{
              fontFamily: manrope,
              fontSize: 90,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--color-white)",
              marginBottom: 36,
            }}
          >
            {name}
          </div>
        </TextWipe>
        <FadeIn startFrame={42}>
          <p
            style={{
              fontFamily: manrope,
              fontSize: 80,
              fontWeight: 600,
              lineHeight: 1.4,
              color: "var(--color-everglade)",
              margin: "0 0 32px",
              ...preStyle,
            }}
          >
            {tagline}
          </p>
        </FadeIn>
        <SlideUp startFrame={78}>
          <ExpandLine
            color="var(--color-danger)"
            height={16}
            maxWidth={140}
            startFrame={0}
          />
          <p
            style={{
              fontFamily: manrope,
              fontSize: 60,
              fontWeight: 600,
              lineHeight: 1.4,
              color: "var(--color-everglade)",
              margin: "20px 0 0",
              letterSpacing: "0.02em",
              ...preStyle,
            }}
          >
            {detail}
          </p>
        </SlideUp>
        <SlideUp startFrame={115}>
          <div style={{ marginTop: 52 }}>
            <Logo height={150} style={{ filter: "invert(1)" }} width={150} />
          </div>
        </SlideUp>
      </div>
    </AbsoluteFill>
  </SlideWrap>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — Trust (570–720 f / 5 s)
// Entrance: shutter wipe bottom→top. Paper background.
// Two large lines punch in at staggered frames.
// ─────────────────────────────────────────────────────────────────────────────

interface LogoAnimationProps {
  text?: string;
}

const SceneLogoAnimation: React.FC<LogoAnimationProps> = () => (
  <AbsoluteFill>
    <PaperBg />
    <LogoAnimation />
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — Trust (570–720 f / 5 s)
// Entrance: shutter wipe bottom→top. Paper background.
// Two large lines punch in at staggered frames.
// ─────────────────────────────────────────────────────────────────────────────

type TrustProps = RoofValueProps["trust"];

const SceneTrust: React.FC<TrustProps> = ({
  line1,
  line2,
  hueShift,
  style,
}) => (
  <ShutterWrap>
    <PaperBg />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <LightLeak durationInFrames={40} hueShift={hueShift} seed={style} />
      <div style={{ width: "100%" }}>
        <PunchIn startFrame={12}>
          <div
            style={{
              fontFamily: manrope,
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "var(--color-everglade)",
              marginBottom: 12,
            }}
          >
            {line1}
          </div>
        </PunchIn>
        <PunchIn startFrame={44}>
          <div
            style={{
              fontFamily: manrope,
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "var(--color-everglade-light)",
            }}
          >
            {line2}
          </div>
        </PunchIn>
        <ExpandLine
          color="var(--color-hero-accent)"
          height={6}
          maxWidth={320}
          startFrame={80}
        />
      </div>
    </AbsoluteFill>
  </ShutterWrap>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5 — CTA (720–900 f / 6 s)
// Entrance: clip-path wipe. Everglade background. No exit (last scene).
// ─────────────────────────────────────────────────────────────────────────────

type CtaProps = RoofValueProps["cta"] & { badges: RoofValueProps["badges"] };

const SceneCTA: React.FC<CtaProps> = ({
  setup,
  punch,
  action,
  badge,
  byline,
  badges,
}) => (
  <WipeWrap exitFrames={0}>
    <EvergladeBg />
    <NoiseBackground />
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px 160px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <FadeIn startFrame={10}>
          <span
            style={{
              fontFamily: manrope,
              fontSize: 50,
              fontWeight: 300,
              color: "var(--color-accent-light)",
              display: "block",
              marginBottom: 20,
              letterSpacing: "0.01em",
            }}
          >
            {setup}
          </span>
        </FadeIn>
        <div style={{ marginBottom: 52 }}>
          {punch.split("\n").map((line, i) => (
            <TextWipe key={line} startFrame={28 + i * 12}>
              <div
                style={{
                  fontFamily: manrope,
                  fontSize: 110,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  letterSpacing: "-0.02em",
                  color: "var(--color-white)",
                }}
              >
                {line}
              </div>
            </TextWipe>
          ))}
        </div>
        <SlideUp startFrame={70}>
          <p
            style={{
              fontFamily: manrope,
              fontSize: 38,
              fontWeight: 300,
              lineHeight: 1.4,
              color: "var(--color-text-on-brand)",
              margin: "0 0 44px",
            }}
          >
            {action}
          </p>
        </SlideUp>
        <FadeIn startFrame={98}>
          <div
            style={{
              display: "inline-block",
              background: "var(--color-accent)",
              color: "var(--color-white)",
              borderRadius: 9999,
              padding: "16px 40px",
              fontFamily: manrope,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 56,
            }}
          >
            {badge}
          </div>
        </FadeIn>
        <FadeIn startFrame={110}>
          <div style={{ marginBottom: 36 }}>
            <BadgeRow badgeHeight={80} config={badges} />
          </div>
        </FadeIn>
        <SlideUp startFrame={120}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Logo height={120} invert={true} width={120} />
            <span
              style={{
                fontFamily: manrope,
                fontSize: 40,
                fontWeight: 600,
                color: "var(--color-white)",
              }}
            >
              {byline}
            </span>
          </div>
        </SlideUp>
      </div>
    </AbsoluteFill>
  </WipeWrap>
);

// ── Constants ─────────────────────────────────────────────────────────────────

// ── SlideUp ───────────────────────────────────────────────────────────────────

const NoiseBackground: React.FC = () => (
  <svg
    aria-hidden="true"
    height="100%"
    style={{ position: "absolute", inset: 0, zIndex: 10 }}
    width="100%"
  >
    <filter id="noise-filter">
      <feTurbulence
        baseFrequency="1.34"
        numOctaves={4}
        stitchTiles="stitch"
        type="fractalNoise"
      />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR slope={0.52} type="linear" />
        <feFuncG slope={0.52} type="linear" />
        <feFuncB slope={0.52} type="linear" />
        <feFuncA slope={0.34} type="linear" />
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR intercept={-0.4} slope={1.8} type="linear" />
        <feFuncG intercept={-0.4} slope={1.8} type="linear" />
        <feFuncB intercept={-0.4} slope={1.8} type="linear" />
      </feComponentTransfer>
    </filter>
    <rect filter="url(#noise-filter)" height="100%" width="100%" />
  </svg>
);

// ── Shared background ─────────────────────────────────────────────────────────

const EvergladeBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 25% 35%, var(--color-everglade-light) 0%, var(--color-everglade) 65%)",
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// STORM-SPOT SCENES (Ss prefix)
// These are distinct from the RoofValue scenes above.
// ─────────────────────────────────────────────────────────────────────────────

type SsImpactProps = StormSpotProps["impact"];
type SsUrgencyProps = StormSpotProps["urgency"];
type SsValueProps = StormSpotProps["value"];

type SsIntroProps = StormSpotProps["intro"] & {
  showProfilePhoto: StormSpotProps["showProfilePhoto"];
  profilePhoto: StormSpotProps["profilePhoto"];
  seed?: number;
};

type SsCtaProps = StormSpotProps["cta"] & { badges: StormSpotProps["badges"] };

const SsSceneImpact: React.FC<SsImpactProps> = ({
  eyebrow,
  headline,
  subline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineWidth = spring({
    frame: frame - 38,
    fps,
    config: { damping: 18, stiffness: 80, mass: 1.2 },
    from: 0,
    to: 280,
  });

  return (
    <FadeWrapper durationInFrames={150} fadeOutFrames={20}>
      <EvergladeBackground />
      <NoiseBackground />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: `0 ${H_PAD}px`,
        }}
      >
        <div style={{ width: "100%" }}>
          <SlideUp startFrame={0}>
            <div
              style={{
                fontFamily: manrope,
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-danger)",
                marginBottom: 36,
                ...preStyle,
              }}
            >
              {eyebrow}
            </div>
          </SlideUp>
          <SlideUp startFrame={8}>
            <div
              style={{
                fontFamily: manrope,
                fontWeight: 900,
                fontSize: 210,
                lineHeight: 0.88,
                color: "var(--color-white)",
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                ...preStyle,
              }}
            >
              {headline}
            </div>
          </SlideUp>
          <div style={{ marginTop: 36, marginBottom: 36 }}>
            <div
              style={{
                width: lineWidth,
                height: 6,
                background: "var(--color-hero-accent)",
                borderRadius: 3,
              }}
            />
          </div>
          <SlideUp startFrame={45}>
            <div
              style={{
                fontFamily: manrope,
                fontWeight: 800,
                fontSize: 130,
                lineHeight: 1,
                color: "var(--color-hero-accent)",
                letterSpacing: "-0.02em",
                ...preStyle,
              }}
            >
              {subline}
            </div>
          </SlideUp>
        </div>
      </AbsoluteFill>
    </FadeWrapper>
  );
};

const SsSceneUrgency: React.FC<SsUrgencyProps> = ({ setup, punch }) => (
  <FadeWrapper durationInFrames={150} fadeOutFrames={20}>
    <EvergladeBackground />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <OffthreadVideo
            muted={true}
            playbackRate={1}
            src={adsFile("House.mp4")}
            style={{
              width: 600,
              height: 600,
              objectFit: "contain",
              marginBlockEnd: 40,
              borderRadius: 16,
            }}
            trimAfter={600}
            trimBefore={120}
            volume={1}
          />
          <div
            style={{
              fontFamily: manrope,
              fontWeight: 700,
              fontSize: 90,
              lineHeight: 1.25,
              color: "var(--color-paper-dark)",
              ...preStyle,
            }}
          >
            {setup}
          </div>
        </SlideUp>
        <SlideUp startFrame={35}>
          <div
            style={{
              fontFamily: manrope,
              fontWeight: 900,
              fontSize: 90,
              lineHeight: 0.92,
              color: "var(--color-accent)",
              letterSpacing: "-0.02em",
              marginTop: 28,
              ...preStyle,
            }}
          >
            {punch}
          </div>
        </SlideUp>
      </div>
    </AbsoluteFill>
  </FadeWrapper>
);

const SsSceneIntro: React.FC<SsIntroProps> = ({
  hueShift,
  label,
  nameBlock,
  tagline,
  showProfilePhoto,
  profilePhoto,
  seed = 5,
}) => (
  <FadeWrapper durationInFrames={210} fadeOutFrames={20}>
    <AbsoluteFill style={{ background: "var(--color-hero-accent)" }} />
    <LightLeak durationInFrames={40} hueShift={hueShift} seed={seed} />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <div
            style={{
              fontFamily: manrope,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--color-white)",
              marginBottom: 40,
              ...preStyle,
            }}
          >
            {label}
          </div>
        </SlideUp>
        {showProfilePhoto && (
          <SlideUp startFrame={18}>
            <ProfilePhoto
              height={profilePhoto.height}
              src={profilePhoto.src}
              width={profilePhoto.width}
            />
          </SlideUp>
        )}
        <SlideUp startFrame={18}>
          <div
            style={{
              fontFamily: manrope,
              fontWeight: 900,
              fontSize: 112,
              lineHeight: 0.86,
              color: "var(--color-white)",
              letterSpacing: "-0.03em",
              ...preStyle,
            }}
          >
            {nameBlock}
          </div>
        </SlideUp>
        <div style={{ marginTop: 48 }}>
          <ExpandLine
            color="var(--color-danger)"
            height={6}
            maxWidth={120}
            startFrame={55}
          />
        </div>
        <FadeIn startFrame={70}>
          <div
            style={{
              fontFamily: manrope,
              fontWeight: 700,
              fontSize: 92,
              lineHeight: 1.2,
              color: "var(--color-everglade)",
              marginTop: 32,
              ...preStyle,
            }}
          >
            {tagline}
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  </FadeWrapper>
);

const SsSceneValue: React.FC<SsValueProps> = ({ setup, punch }) => (
  <FadeWrapper durationInFrames={180} fadeOutFrames={20}>
    <EvergladeBackground />
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <RoundedTextBox
            borderRadius={16}
            horizontalPadding={20}
            maxLines={4}
            text={`${setup}\n${punch}`}
            textAlign="left"
          />
        </SlideUp>
      </div>
    </AbsoluteFill>
  </FadeWrapper>
);

const SsSceneCTA: React.FC<SsCtaProps> = ({
  trust,
  callout,
  byline,
  badge,
  badges,
}) => (
  <FadeWrapper durationInFrames={180} fadeOutFrames={25}>
    <AbsoluteFill style={{ background: "var(--color-paper-dark)" }} />
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
            {trust}
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
            {callout}
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
            {byline}
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
              {badge}
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
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — TandraStormSpot (870 f = 29 s @ 30 fps)
// ─────────────────────────────────────────────────────────────────────────────

export const TandraStormSpot: React.FC<StormSpotProps> = ({
  impact,
  urgency,
  intro,
  value,
  cta,
  badges,
  showProfilePhoto,
  profilePhoto,
}) => {
  const src =
    showProfilePhoto && profilePhoto?.src ? toSrc(profilePhoto.src) : null;
  const [handle] = useState(() =>
    src ? delayRender("TandraStormSpot: profile photo") : null
  );

  useEffect(() => {
    if (!src || handle === null) {
      return;
    }
    const img = new Image();
    img.onload = () => continueRender(handle);
    img.onerror = () => continueRender(handle);
    img.src = src;
    return () => {
      img.src = "";
    };
  }, [src, handle]);

  return (
    <AbsoluteFill style={{ background: "var(--color-everglade)" }}>
      <Sequence durationInFrames={150}>
        <SsSceneImpact {...impact} />
      </Sequence>
      <Sequence durationInFrames={150} from={150}>
        <SsSceneUrgency {...urgency} />
      </Sequence>
      <Sequence durationInFrames={210} from={300}>
        <SsSceneIntro
          {...intro}
          profilePhoto={profilePhoto}
          showProfilePhoto={showProfilePhoto}
        />
      </Sequence>
      <Sequence durationInFrames={180} from={510}>
        <SsSceneValue {...value} />
      </Sequence>
      <Sequence durationInFrames={180} from={690}>
        <SsSceneCTA {...cta} badges={badges} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — TandraRoofValue (1260 f = 42 s @ 30 fps)
// Hook 0–180 · Simple 180–360 · Benefits 360–540 · Intro 540–750 ·
// Trust 750–900 · CTA 900–1080 · LogoAnimation 1080–1260
// ─────────────────────────────────────────────────────────────────────────────

export const TandraRoofValue: React.FC<RoofValueProps> = ({
  hook,
  simple,
  benefits,
  intro,
  trust,
  cta,
  badges,
}) => {
  const [handle] = useState(() => delayRender("TandraRoofValue: scene images"));

  useEffect(() => {
    const srcs = [
      hook.image,
      simple.image,
      intro.showProfilePhoto ? intro.profilePhoto?.src : null,
    ]
      .filter(Boolean)
      .map((s) => toSrc(s as string));

    if (srcs.length === 0) {
      continueRender(handle);
      return;
    }

    let remaining = srcs.length;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        continueRender(handle);
      }
    };
    const imgs = srcs.map((src) => {
      const img = new Image();
      img.onload = tick;
      img.onerror = tick;
      img.src = src;
      return img;
    });
    return () => {
      for (const img of imgs) {
        img.src = "";
      }
    };
  }, [
    intro.showProfilePhoto,
    hook.image,
    simple.image,
    intro.profilePhoto?.src,
    handle,
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: "var(--color-everglade)" }}>
      <Sequence durationInFrames={180}>
        <SceneHook {...hook} />
      </Sequence>
      <Sequence durationInFrames={180} from={180}>
        <SceneSimple {...simple} />
      </Sequence>
      <Sequence durationInFrames={180} from={360}>
        <SceneBenefits {...benefits} />
      </Sequence>
      <Sequence durationInFrames={210} from={540}>
        <SceneIntro {...intro} />
      </Sequence>
      <Sequence durationInFrames={150} from={750}>
        <SceneTrust {...trust} />
      </Sequence>
      <Sequence durationInFrames={180} from={900}>
        <SceneCTA {...cta} badges={badges} />
      </Sequence>
      <Sequence durationInFrames={180} from={1080}>
        <SceneLogoAnimation />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE — Storm Hook
// "STORM DAMAGE? / I Can Help." — photo bg, pill CTA, phone, teal bottom bar
// ─────────────────────────────────────────────────────────────────────────────

type StormHookProps = Extract<SceneConfig, { type: "storm-hook" }>;

const SceneStormHook: React.FC<StormHookProps> = ({
  image,
  headline,
  tagline,
  pill,
  phone,
  bottomBar,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineScale = spring({
    frame,
    fps,
    from: 0.88,
    to: 1,
    durationInFrames: 20,
  });
  const taglineOpacity = interpolate(frame, [18, 32], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [18, 36], [30, 0], {
    extrapolateRight: "clamp",
  });
  const pillOpacity = interpolate(frame, [30, 44], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneScale = spring({
    frame: Math.max(0, frame - 44),
    fps,
    from: 0.8,
    to: 1,
    durationInFrames: 20,
  });
  const barOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <PunchWrap>
      <ImageBg image={image} />
      {/* Dark gradient overlay — heavier at top, lighter at bottom */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 60%, rgba(0,0,0,0.55) 100%)",
          zIndex: 1,
        }}
      />
      {/* Main content */}
      <AbsoluteFill
        style={{
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 220,
          paddingBottom: 0,
        }}
      >
        {/* STORM DAMAGE? */}
        <div
          style={{
            transform: `scale(${headlineScale})`,
            fontFamily: "Rift",
            fontWeight: 700,
            fontSize: 165,
            lineHeight: 1,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: "var(--color-danger)",
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {headline}
        </div>

        {/* I Can Help. */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: handelson,
            fontWeight: 400,
            fontSize: 148,
            lineHeight: 1.1,
            color: "var(--color-white)",
            textAlign: "center",
            marginTop: -10,
            textShadow: "0 4px 20px rgba(0,0,0,0.45)",
          }}
        >
          {tagline}
        </div>

        {/* FREE INSPECTION pill */}
        <div
          style={{
            opacity: pillOpacity,
            marginTop: 44,
            backgroundColor: "var(--color-purple-dark)",
            borderRadius: 20,
            paddingTop: 22,
            paddingBottom: 22,
            paddingLeft: 64,
            paddingRight: 64,
            boxShadow:
              "2px 2px 0px 2px color-mix(in srgb, var(--color-everglade) 60%, transparent), 4px 4px 0px 4px color-mix(in srgb, var(--color-purple) 10%, transparent)",
          }}
        >
          <span
            style={{
              fontFamily: manrope,
              fontWeight: 800,
              fontSize: 52,
              letterSpacing: "0.08em",
              color: "var(--color-everglade)",
              textTransform: "uppercase",
            }}
          >
            {pill}
          </span>
        </div>

        {/* Phone number */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            fontFamily: "Rift",
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "var(--color-white)",
            textAlign: "center",
            marginTop: 36,
            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {phone}
        </div>
      </AbsoluteFill>

      {/* Bottom teal bar */}
      <AbsoluteFill
        style={{
          zIndex: 3,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            opacity: barOpacity,
            width: "100%",
            backgroundColor: "var(--color-everglade)",
            paddingTop: 28,
            paddingBottom: 28,
            paddingLeft: 40,
            paddingRight: 40,
            display: "flex",
            alignItems: "center",
            position: "absolute",
            insetBlockEnd: 0,
            gap: 24,
          }}
        >
          {/* Circle arrow icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "var(--color-purple-dark)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="42"
              viewBox="0 0 24 24"
              width="42"
            >
              <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke="black"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: manrope,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "0.08em",
              color: "var(--color-white)",
              textTransform: "uppercase",
            }}
          >
            {bottomBar}
          </span>
        </div>
      </AbsoluteFill>
    </PunchWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE — Storm Brand
// "STORM DAMAGE? / I've got you covered" — brand bottom bar with logo
// ─────────────────────────────────────────────────────────────────────────────

type StormBrandProps = Extract<SceneConfig, { type: "storm-brand" }>;

const SceneStormBrand: React.FC<StormBrandProps> = ({
  image,
  headline,
  tagline,
  phone,
  name,
  company,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headlineX = interpolate(frame, [0, 18], [-60, 0], {
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [20, 40], [28, 0], {
    extrapolateRight: "clamp",
  });
  const barScale = spring({
    frame: Math.max(0, frame - 40),
    fps,
    from: 0.95,
    to: 1,
    durationInFrames: 18,
  });
  const barOpacity = interpolate(frame, [40, 58], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <PunchWrap>
      <ImageBg image={image} />
      {/* Subtle dark overlay — lighter than storm-hook to let photo breathe */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.72) 100%)",
          zIndex: 1,
        }}
      />

      {/* STORM DAMAGE? — left-aligned upper area */}
      <AbsoluteFill
        style={{
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: `300px ${H_PAD}px 0`,
        }}
      >
        <div
          style={{
            opacity: headlineOpacity,
            transform: `translateX(${headlineX}px)`,
            fontFamily: "Rift",
            fontWeight: 700,
            fontSize: 190,
            lineHeight: 0.95,
            textTransform: "uppercase",
            color: "var(--color-white)",
            textShadow: "0 4px 32px rgba(0,0,0,0.5)",
          }}
        >
          {headline.split("\n").map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        {/* I've got you covered */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: handelson,
            fontWeight: 400,
            fontSize: 130,
            lineHeight: 1.1,
            color: "var(--color-danger)",
            marginTop: 8,
            textShadow: "0 3px 16px rgba(0,0,0,0.4)",
          }}
        >
          {tagline}
        </div>
      </AbsoluteFill>

      {/* Bottom brand bar */}
      <AbsoluteFill
        style={{
          zIndex: 3,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            opacity: barOpacity,
            transform: `scaleY(${barScale})`,
            transformOrigin: "bottom",
            width: "100%",
            backgroundColor: "#072326",
            paddingTop: 36,
            paddingBottom: 36,
            paddingLeft: H_PAD,
            paddingRight: H_PAD,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "absolute",
            insetBlockEnd: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Rift",
                fontWeight: 600,
                fontSize: 72,
                letterSpacing: "0.01em",
                color: "var(--color-accent-light)",
                lineHeight: 1,
              }}
            >
              {phone}
            </div>
            <span
              style={{
                gridRow: 2,
                gridColumn: 1,
                fontFamily: manrope,
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: "0.06em",
                color: "var(--color-white)",
                textTransform: "uppercase",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: 48,
                color: "var(--color-accent-light)",
                margin: "0 12px",
              }}
            >
              |
            </span>
            <span
              style={{
                fontWeight: 500,
                fontSize: 36,
                textTransform: "captialize",
                color: "var(--color-everglade-muted)",
              }}
            >
              {company}
            </span>
          </div>
          {/* Right: Bird Creek logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Img
              src={adsFile("BC_Bird_White.svg")}
              style={{ width: 88, height: 88, objectFit: "contain" }}
            />
            <div
              style={{
                fontFamily: "Rift",
                fontWeight: 600,
                fontSize: 38,
                lineHeight: 0.7,
                letterSpacing: "0.12em",
                color: "var(--color-white)",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              BIRDCREEK
            </div>
            <div
              style={{
                fontFamily: manrope,
                fontWeight: 600,
                fontSize: 18,
                letterSpacing: "0.5em",
                color: "var(--color-white)",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              ROOFING
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </PunchWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Named exports — consumed by CustomComposition and Root
// ─────────────────────────────────────────────────────────────────────────────

export {
  SceneBenefits as RvSceneBenefits,
  SceneCTA as RvSceneCTA,
  SceneHelpingTexasHomeowners as RvSceneHelpingTexasHomeowners,
  SceneHook as RvSceneHook,
  SceneIntro as RvSceneIntro,
  SceneLogoAnimation as RvSceneLogoAnimation,
  SceneSimple as RvSceneSimple,
  SceneStormBrand,
  SceneStormHook,
  SceneTrust as RvSceneTrust,
  SsSceneCTA,
  SsSceneImpact,
  SsSceneIntro,
  SsSceneUrgency,
  SsSceneValue,
};
