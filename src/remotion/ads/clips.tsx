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

import { adsFile, toSrc } from "./ads-file";
import { BadgeRow } from "./components/badge-row";
import BirdAnimation from "./components/bird";
import { FadeWrapper } from "./components/fade-wrapper";
import LogoAnimation from "./components/gsap-motion";
import Logo from "./components/logo";
import { ProfilePhoto } from "./components/profile-photo";
import RoundedTextBox from "./components/text-box";
import type { SceneConfig } from "./composition/custom-schema";
import type { RoofValueProps } from "./composition/roof-value-schema";
import type { StormSpotProps } from "./composition/storm-spot-schema";

/**
 * Ad composition assets live under `public/ads/` in this repo (kept isolated
 * from the TandraIntro / site assets at the public root). `roof.glb` is the one
 * exception — it is shared at the public root and resolved with a bare
 * `staticFile("roof.glb")` in RoofScene/roof-model.
 */

loadFont("normal", {
  subsets: ["latin"],
  weights: ["300", "600", "700", "800"],
});

loadFont2({
  family: "HandelsonTwo",
  style: "normal",
  url: adsFile("fonts/HandelsonTwo.otf"),
  weight: "400",
});

loadFont2({
  family: "Rift",
  style: "normal",
  url: adsFile("fonts/RiftDemi.otf"),
  weight: "600",
});

loadFont2({
  family: "Rift",
  style: "normal",
  url: adsFile("fonts/RiftBold.otf"),
  weight: "700",
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
    config: { damping: 42, stiffness: 280 },
    fps,
    frame,
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
    config: { damping: 16, mass: 0.5, stiffness: 260 },
    fps,
    frame,
    from: 0.92,
    to: 1,
  });
  const x = spring({
    config: { damping: 16, mass: 0.25, stiffness: 150 },
    fps,
    frame,
    from: 500,
    to: 0,
  });

  const opacity = spring({
    config: { damping: 22, stiffness: 200 },
    fps,
    frame,
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
        opacity: Math.min(opacity, exitOpacity),
        transform: `scale(${scale}) translateX(${x}px)`,
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
    config: { damping: 26, stiffness: 180 },
    fps,
    frame,
    from: 0,
    to: 1,
  });

  const translateX = interpolate(enterProgress, [0, 1], [120, 0]);
  const opacity = spring({
    config: { damping: 22, stiffness: 160 },
    fps,
    frame,
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
        backgroundColor: "var(--color-everglade)",
        opacity: Math.min(opacity, exitOpacity),
        transform: `translateX(${translateX}px)`,
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
    config: { damping: 36, stiffness: 270 },
    fps,
    frame,
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
    config: { damping: 34, stiffness: 210 },
    fps,
    frame: frame - startFrame,
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
    config: { damping: 14, mass: 0.4, stiffness: 300 },
    fps,
    frame: frame - startFrame,
    from: 0.75,
    to: 1,
  });

  const opacity = spring({
    config: { damping: 20, stiffness: 200 },
    fps,
    frame: frame - startFrame,
    from: 0,
    to: 1,
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
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
    <div
      style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}
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
    config: { damping: 30, stiffness: 80 },
    fps,
    frame: frame - startFrame,
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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BACKGROUNDS
// ─────────────────────────────────────────────────────────────────────────────

const EvergladeBg: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 30% 40%, var(--color-everglade-light) 0%, var(--color-everglade) 60%)",
      zIndex: 0,
    }}
  />
);
const OverlayBg: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 0% 00%, color-mix(in srgb, var(--color-black) 90%, transparent) 0%, color-mix(in srgb, var(--color-black) 50%, transparent) 100%)",
      zIndex: 2,
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
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          width: "100%",
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
        alignItems: "flex-start",
        borderBlockEnd: "25px solid var(--color-purple-dark)",
        justifyContent: "flex-end",
        padding: `0 ${H_PAD}px 160px`,
        zIndex: 3,
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <span
            style={{
              color: "var(--color-hero-accent)",
              display: "block",
              fontFamily: manrope,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.16em",
              marginBottom: 28,
              textTransform: "uppercase",
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
        <div style={{ marginBottom: 48, marginTop: 36 }}>
          {headline.split("\n").map((line, i) => (
            <TextWipe key={line} startFrame={20 + i * 10}>
              <div
                style={{
                  color: "var(--color-white)",
                  fontFamily: manrope,
                  fontSize: 112,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
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
              color: "var(--color-paper-dark)",
              fontFamily: manrope,
              fontSize: 80,
              fontWeight: 700,
              lineHeight: 1.25,
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
          alignItems: "flex-start",
          justifyContent: "center",
          padding: `0 ${H_PAD}px`,
        }}
      >
        <div style={{ width: "100%" }}>
          <PunchIn startFrame={0}>
            <span
              style={{
                color: "var(--color-white)",
                display: "block",
                fontFamily: manrope,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "0.24em",
                marginBottom: 32,
                textTransform: "uppercase",
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
                    alignItems: "center",
                    display: "flex",
                    gap: 28,
                    marginBottom: 28,
                  }}
                >
                  <div
                    style={{
                      WebkitMaskImage: `url(${adsFile(BenefitIcons[i])})`,
                      WebkitMaskPosition: "center",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      backgroundColor: dotColors[i],
                      flexShrink: 0,
                      height: 50,
                      maskImage: `url(${adsFile(BenefitIcons[i])})`,
                      maskPosition: "center",
                      maskRepeat: "no-repeat",
                      maskSize: "contain",
                      width: 50,
                    }}
                  />
                  <span
                    style={{
                      color: "var(--color-white)",
                      fontFamily: manrope,
                      fontSize: 82,
                      fontWeight: 700,
                      lineHeight: 1.05,
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
        alignItems: "flex-start",
        justifyContent: "center",
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
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 240,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 0.8,
              marginBlockStart: 50,
              textAlign: "center",
              whiteSpace: "pre-line",
            }}
          >
            {line1}
          </div>
          <div
            style={{
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 316,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: 32,
              textAlign: "center",
              whiteSpace: "pre-line",
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
                color: "var(--color-purple-dark)",
                display: "block",
                fontFamily: manrope,
                fontSize: 130,
                fontWeight: 800,
                lineHeight: 1.3,
                margin: 0,
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
        alignItems: "center",
        borderBlockEnd: "25px solid var(--color-accent)",
        justifyContent: "center",
        padding: `0 ${H_PAD}px`,
        zIndex: 3,
      }}
    >
      <PunchIn startFrame={15}>
        <h1
          style={{
            color: "var(--color-white)",
            display: "block",
            fontFamily: "Rift",
            fontSize: 88,
            fontWeight: 700,
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
            color: "var(--color-white)",
            display: "block",
            fontFamily: manrope,
            fontSize: 38,
            fontWeight: 500,
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
                backgroundColor: "var(--color-accent)",
                borderRadius: 4,
                color: "var(--color-everglade)",
                fontFamily: manrope,
                fontSize: 58,
                fontWeight: 800,
                lineHeight: 1.05,
                padding: "10px 20px",
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
        alignItems: "flex-start",
        justifyContent: "center",
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
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 90,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: 36,
            }}
          >
            {name}
          </div>
        </TextWipe>
        <FadeIn startFrame={42}>
          <p
            style={{
              color: "var(--color-everglade)",
              fontFamily: manrope,
              fontSize: 80,
              fontWeight: 600,
              lineHeight: 1.4,
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
              color: "var(--color-everglade)",
              fontFamily: manrope,
              fontSize: 60,
              fontWeight: 600,
              letterSpacing: "0.02em",
              lineHeight: 1.4,
              margin: "20px 0 0",
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
        alignItems: "flex-start",
        justifyContent: "center",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <LightLeak durationInFrames={40} hueShift={hueShift} seed={style} />
      <div style={{ width: "100%" }}>
        <PunchIn startFrame={12}>
          <div
            style={{
              color: "var(--color-everglade)",
              fontFamily: manrope,
              fontSize: 100,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {line1}
          </div>
        </PunchIn>
        <PunchIn startFrame={44}>
          <div
            style={{
              color: "var(--color-everglade-light)",
              fontFamily: manrope,
              fontSize: 100,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1,
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
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: `0 ${H_PAD}px 160px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <FadeIn startFrame={10}>
          <span
            style={{
              color: "var(--color-accent-light)",
              display: "block",
              fontFamily: manrope,
              fontSize: 50,
              fontWeight: 300,
              letterSpacing: "0.01em",
              marginBottom: 20,
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
                  color: "var(--color-white)",
                  fontFamily: manrope,
                  fontSize: 110,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
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
              color: "var(--color-text-on-brand)",
              fontFamily: manrope,
              fontSize: 38,
              fontWeight: 300,
              lineHeight: 1.4,
              margin: "0 0 44px",
            }}
          >
            {action}
          </p>
        </SlideUp>
        <FadeIn startFrame={98}>
          <div
            style={{
              background: "var(--color-accent)",
              borderRadius: 9999,
              color: "var(--color-white)",
              display: "inline-block",
              fontFamily: manrope,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 56,
              padding: "16px 40px",
              textTransform: "uppercase",
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
          <div style={{ alignItems: "center", display: "flex", gap: 24 }}>
            <Logo height={120} invert={true} width={120} />
            <span
              style={{
                color: "var(--color-white)",
                fontFamily: manrope,
                fontSize: 40,
                fontWeight: 600,
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
    style={{ inset: 0, position: "absolute", zIndex: 10 }}
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
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "100% 100%",
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
    config: { damping: 18, mass: 1.2, stiffness: 80 },
    fps,
    frame: frame - 38,
    from: 0,
    to: 280,
  });

  return (
    <FadeWrapper durationInFrames={150} fadeOutFrames={20}>
      <EvergladeBackground />
      <NoiseBackground />
      <AbsoluteFill
        style={{
          alignItems: "flex-start",
          justifyContent: "center",
          padding: `0 ${H_PAD}px`,
        }}
      >
        <div style={{ width: "100%" }}>
          <SlideUp startFrame={0}>
            <div
              style={{
                color: "var(--color-danger)",
                fontFamily: manrope,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "0.18em",
                marginBottom: 36,
                textTransform: "uppercase",
                ...preStyle,
              }}
            >
              {eyebrow}
            </div>
          </SlideUp>
          <SlideUp startFrame={8}>
            <div
              style={{
                color: "var(--color-white)",
                fontFamily: manrope,
                fontSize: 210,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 0.88,
                textTransform: "uppercase",
                ...preStyle,
              }}
            >
              {headline}
            </div>
          </SlideUp>
          <div style={{ marginBottom: 36, marginTop: 36 }}>
            <div
              style={{
                background: "var(--color-hero-accent)",
                borderRadius: 3,
                height: 6,
                width: lineWidth,
              }}
            />
          </div>
          <SlideUp startFrame={45}>
            <div
              style={{
                color: "var(--color-hero-accent)",
                fontFamily: manrope,
                fontSize: 130,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1,
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
        alignItems: "flex-start",
        justifyContent: "center",
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
              borderRadius: 16,
              height: 600,
              marginBlockEnd: 40,
              objectFit: "contain",
              width: 600,
            }}
            trimAfter={600}
            trimBefore={120}
            volume={1}
          />
          <div
            style={{
              color: "var(--color-paper-dark)",
              fontFamily: manrope,
              fontSize: 90,
              fontWeight: 700,
              lineHeight: 1.25,
              ...preStyle,
            }}
          >
            {setup}
          </div>
        </SlideUp>
        <SlideUp startFrame={35}>
          <div
            style={{
              color: "var(--color-accent)",
              fontFamily: manrope,
              fontSize: 90,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 0.92,
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
        alignItems: "flex-start",
        justifyContent: "center",
        padding: `0 ${H_PAD}px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <SlideUp startFrame={0}>
          <div
            style={{
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "0.16em",
              marginBottom: 40,
              textTransform: "uppercase",
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
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 112,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 0.86,
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
              color: "var(--color-everglade)",
              fontFamily: manrope,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.2,
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
        alignItems: "flex-start",
        justifyContent: "center",
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
            {trust}
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
            {callout}
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
            {byline}
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
    <AbsoluteFill
      className="remotion-ad-theme"
      style={{ background: "var(--color-everglade)" }}
    >
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
    <AbsoluteFill
      className="remotion-ad-theme"
      style={{ backgroundColor: "var(--color-everglade)" }}
    >
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
    durationInFrames: 20,
    fps,
    frame,
    from: 0.88,
    to: 1,
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
    durationInFrames: 20,
    fps,
    frame: Math.max(0, frame - 44),
    from: 0.8,
    to: 1,
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
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          paddingBottom: 0,
          paddingTop: 220,
          zIndex: 2,
        }}
      >
        {/* STORM DAMAGE? */}
        <div
          style={{
            color: "var(--color-danger)",
            fontFamily: "Rift",
            fontSize: 165,
            fontWeight: 700,
            letterSpacing: "0.01em",
            lineHeight: 1,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            textTransform: "uppercase",
            transform: `scale(${headlineScale})`,
          }}
        >
          {headline}
        </div>

        {/* I Can Help. */}
        <div
          style={{
            color: "var(--color-white)",
            fontFamily: handelson,
            fontSize: 148,
            fontWeight: 400,
            lineHeight: 1.1,
            marginTop: -10,
            opacity: taglineOpacity,
            textAlign: "center",
            textShadow: "0 4px 20px rgba(0,0,0,0.45)",
            transform: `translateY(${taglineY}px)`,
          }}
        >
          {tagline}
        </div>

        {/* FREE INSPECTION pill */}
        <div
          style={{
            backgroundColor: "var(--color-purple-dark)",
            borderRadius: 20,
            boxShadow:
              "2px 2px 0px 2px color-mix(in srgb, var(--color-everglade) 60%, transparent), 4px 4px 0px 4px color-mix(in srgb, var(--color-purple) 10%, transparent)",
            marginTop: 44,
            opacity: pillOpacity,
            paddingBottom: 22,
            paddingLeft: 64,
            paddingRight: 64,
            paddingTop: 22,
          }}
        >
          <span
            style={{
              color: "var(--color-everglade)",
              fontFamily: manrope,
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {pill}
          </span>
        </div>

        {/* Phone number */}
        <div
          style={{
            color: "var(--color-white)",
            fontFamily: "Rift",
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginTop: 36,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            transform: `scale(${phoneScale})`,
          }}
        >
          {phone}
        </div>
      </AbsoluteFill>

      {/* Bottom teal bar */}
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          display: "flex",
          zIndex: 3,
        }}
      >
        <div
          style={{
            alignItems: "center",
            backgroundColor: "var(--color-everglade)",
            display: "flex",
            gap: 24,
            insetBlockEnd: 0,
            opacity: barOpacity,
            paddingBottom: 28,
            paddingLeft: 40,
            paddingRight: 40,
            paddingTop: 28,
            position: "absolute",
            width: "100%",
          }}
        >
          {/* Circle arrow icon */}
          <div
            style={{
              alignItems: "center",
              backgroundColor: "var(--color-purple-dark)",
              borderRadius: "50%",
              display: "flex",
              flexShrink: 0,
              height: 72,
              justifyContent: "center",
              width: 72,
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
              color: "var(--color-white)",
              fontFamily: manrope,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "0.08em",
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
    durationInFrames: 18,
    fps,
    frame: Math.max(0, frame - 40),
    from: 0.95,
    to: 1,
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
          alignItems: "flex-start",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: `300px ${H_PAD}px 0`,
          zIndex: 2,
        }}
      >
        <div
          style={{
            color: "var(--color-white)",
            fontFamily: "Rift",
            fontSize: 190,
            fontWeight: 700,
            lineHeight: 0.95,
            opacity: headlineOpacity,
            textShadow: "0 4px 32px rgba(0,0,0,0.5)",
            textTransform: "uppercase",
            transform: `translateX(${headlineX}px)`,
          }}
        >
          {headline.split("\n").map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        {/* I've got you covered */}
        <div
          style={{
            color: "var(--color-danger)",
            fontFamily: handelson,
            fontSize: 130,
            fontWeight: 400,
            lineHeight: 1.1,
            marginTop: 8,
            opacity: taglineOpacity,
            textShadow: "0 3px 16px rgba(0,0,0,0.4)",
            transform: `translateY(${taglineY}px)`,
          }}
        >
          {tagline}
        </div>
      </AbsoluteFill>

      {/* Bottom brand bar */}
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          display: "flex",
          zIndex: 3,
        }}
      >
        <div
          style={{
            alignItems: "center",
            backgroundColor: "#072326",
            display: "flex",
            insetBlockEnd: 0,
            justifyContent: "space-between",
            opacity: barOpacity,
            paddingBottom: 36,
            paddingLeft: H_PAD,
            paddingRight: H_PAD,
            paddingTop: 36,
            position: "absolute",
            transform: `scaleY(${barScale})`,
            transformOrigin: "bottom",
            width: "100%",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--color-accent-light)",
                fontFamily: "Rift",
                fontSize: 72,
                fontWeight: 600,
                letterSpacing: "0.01em",
                lineHeight: 1,
              }}
            >
              {phone}
            </div>
            <span
              style={{
                color: "var(--color-white)",
                fontFamily: manrope,
                fontSize: 36,
                fontWeight: 700,
                gridColumn: 1,
                gridRow: 2,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {name}
            </span>
            <span
              style={{
                color: "var(--color-accent-light)",
                fontSize: 48,
                margin: "0 12px",
              }}
            >
              |
            </span>
            <span
              style={{
                color: "var(--color-everglade-muted)",
                fontSize: 36,
                fontWeight: 500,
                textTransform: "captialize",
              }}
            >
              {company}
            </span>
          </div>
          {/* Right: Bird Creek logo */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Img
              src={adsFile("BC_Bird_White.svg")}
              style={{ height: 88, objectFit: "contain", width: 88 }}
            />
            <div
              style={{
                color: "var(--color-white)",
                fontFamily: "Rift",
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: "0.12em",
                lineHeight: 0.7,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              BIRDCREEK
            </div>
            <div
              style={{
                color: "var(--color-white)",
                fontFamily: manrope,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.5em",
                textAlign: "center",
                textTransform: "uppercase",
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
