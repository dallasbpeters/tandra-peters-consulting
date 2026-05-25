import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import type {
  TandraIntroContent,
  TandraIntroProps,
} from "./tandraIntroContent";

loadManrope("normal", {
  weights: ["300", "400", "700", "800"],
  subsets: ["latin"],
});
loadInstrumentSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const colors = {
  everglade: "#092A1D",
  evergladeLight: "#12533A",
  paper: "#F4F4F1",
  paperDim: "#E7E7E4",
  paperDark: "#D2D2C6",
  accent: "#69A758",
  accentLight: "#A5CA9B",
  purple: "#CECCFF",
  heroAccent: "#9C99FF",
  black: "#03100b",
  white: "#FFFFFF",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const useScene = (from: number, duration: number) => {
  const frame = useCurrentFrame();
  const localFrame = frame - from;
  const enter = interpolate(localFrame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const exit = interpolate(localFrame, [duration - 18, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });

  return {
    localFrame,
    progress: Math.max(0, Math.min(1, localFrame / duration)),
    reveal: enter * exit,
  };
};

const Kicker = ({
  children,
  color = colors.paperDark,
  delay = 0,
}: {
  children: ReactNode;
  color?: string;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const y = interpolate(frame - delay, [0, 18], [52, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <div
      className="kicker"
      style={{
        alignItems: "center",
        color: color,
        display: "flex",
        fontFamily: theme.fonts.headline,
        fontSize: 25,
        fontWeight: 800,
        gap: 24,
        letterSpacing: "0.16em",
        lineHeight: 1,
        opacity,
        transform: `translateY(${y}px)`,
        textTransform: "uppercase",
        zIndex: 100,
        position: "relative",
      }}
    >
      <span
        style={{
          display: "block",
          height: 2,
          width: 100,
          backgroundColor: colors.accent,
        }}
      />
      {children}
    </div>
  );
};

const BigLine = ({
  children,
  serif = false,
  color = colors.paper,
  size = 146,
  delay = 0,
}: {
  children: ReactNode;
  serif?: boolean;
  color?: string;
  size?: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const y = interpolate(frame - delay, [0, 18], [52, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <div
      style={{
        color,
        fontFamily: serif ? theme.fonts.headlineAlt : theme.fonts.headline,
        fontSize: size,
        fontWeight: serif ? 400 : 800,
        letterSpacing: 0,
        lineHeight: serif ? 0.98 : 0.88,
        opacity,
        textTransform: serif ? "none" : "uppercase",
        transform: `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
};

const PageTexture = ({ dark = true }: { dark?: boolean }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 900], [-40, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? colors.black : colors.paper,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(3, 25, 5, 0.05) 50%, transparent 100%)",
          height: "100%",
          left: `${drift - 10}%`,
          opacity: dark ? 0.28 : 0.18,
          position: "absolute",
          top: 0,
          transform: "skewX(-12deg)",
          width: 380,
        }}
      />
    </AbsoluteFill>
  );
};

const ImagePanel = ({
  src,
  from,
  side = "right",
  opacity = 0.58,
}: {
  src: string;
  from: number;
  side?: "left" | "right";
  opacity?: number;
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const reveal = interpolate(local, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const scale = interpolate(local, [0, 180], [1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        bottom: 0,
        height: "100%",
        opacity: reveal * opacity,
        overflow: "hidden",
        position: "absolute",
        [side]: 0,
        top: 0,
        width: 780,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          filter: "grayscale(0.15) contrast(1.1)",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          width: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          inset: 0,
          background:
            side === "right"
              ? `linear-gradient(90deg, ${colors.black} 10%, transparent 70%)`
              : `linear-gradient(270deg, ${colors.black} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};
const ImagePip = ({
  src,
  from,
  side = "right",
  opacity = 0.58,
}: {
  src: string;
  from: number;
  side?: "left" | "right";
  opacity?: number;
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const reveal = interpolate(local, [10, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const scale = interpolate(local, [0, 280], [1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        bottom: 0,
        height: 500,
        transform: `scale(${scale})`,
        opacity: reveal * opacity,
        overflow: "hidden",
        position: "absolute",
        borderRadius: 999,
        border: `2px solid ${colors.paperDark}`,
        [side]: 100,
        top: "40%",
        width: 500,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          filter: "grayscale(0.15) contrast(1.1)",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          width: "100%",
        }}
      />
    </div>
  );
};

const StormScene = ({ content }: { content: TandraIntroContent["storm"] }) => {
  const { reveal } = useScene(0, 180);
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture />
      <ImagePanel from={0} src="hail-storm.jpg" />
      <div style={{ padding: "132px 128px 80px 128px" }}>
        <Kicker color={colors.paperDark} delay={6}>
          {content.kicker}
        </Kicker>
        <div style={{ marginTop: 72, maxWidth: 1070 }}>
          <BigLine delay={6}>{content.line1}</BigLine>
          <BigLine color={colors.heroAccent} delay={16}>
            {content.line2}
          </BigLine>
        </div>
        <div
          style={{
            bottom: 104,
            color: colors.paperDark,
            fontFamily: theme.fonts.headline,
            fontSize: 44,
            fontWeight: 300,
            left: 128,
            letterSpacing: 0,
            lineHeight: 1.25,
            maxWidth: 1070,
            position: "absolute",
          }}
        >
          {content.body}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StraightAnswersScene = ({
  content,
}: {
  content: TandraIntroContent["straightAnswers"];
}) => {
  const { reveal } = useScene(150, 180);
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture dark={false} />
      <div
        style={{
          color: colors.everglade,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          height: "100%",
          padding: "108px 128px",
        }}
      >
        <div>
          <Kicker color={colors.everglade} delay={6}>
            {content.kicker}
          </Kicker>
          <div style={{ marginTop: 86 }}>
            <BigLine color={colors.everglade} delay={154} size={154}>
              {content.line1}
            </BigLine>
            <BigLine color={colors.everglade} delay={164} size={154}>
              {content.line2}
            </BigLine>
            <BigLine color={colors.accent} delay={176} size={154}>
              {content.line3}
            </BigLine>
          </div>
        </div>
        <div
          style={{
            alignSelf: "end",
            borderLeft: `2px solid ${colors.paperDark}`,
            color: colors.everglade,
            fontFamily: theme.fonts.headlineAlt,
            fontSize: 74,
            lineHeight: 1.08,
            paddingLeft: 56,
            zIndex: 100,
          }}
        >
          &quot;{content.quote}&quot;
        </div>
      </div>
    </AbsoluteFill>
  );
};

const InspectionScene = ({
  content,
}: {
  content: TandraIntroContent["inspection"];
}) => {
  const { reveal } = useScene(300, 180);
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture />
      <ImagePanel from={300} side="right" src="roof.png" opacity={0.52} />
      <div
        style={{
          alignItems: "center",
          display: "grid",
          gridTemplateColumns: "1fr",
          height: "100%",
          padding: "116px 128px",
        }}
      >
        <div />
        <div>
          <Kicker color={colors.purple} delay={6}>
            {content.kicker}
          </Kicker>
          <div style={{ marginTop: 76 }}>
            <BigLine delay={304} size={158}>
              {content.line1}
            </BigLine>
            <BigLine color={colors.purple} delay={318} size={158}>
              {content.line2}
            </BigLine>
            <BigLine delay={332} size={158}>
              {content.line3}
            </BigLine>
          </div>
          <p
            style={{
              color: colors.paper,
              fontFamily: theme.fonts.headline,
              fontSize: 40,
              fontWeight: 300,
              lineHeight: 1.38,
              marginTop: 58,
              maxWidth: 770,
              position: "relative",
              zIndex: 100,
            }}
          >
            {content.body}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ManagedScene = ({
  content,
}: {
  content: TandraIntroContent["managed"];
}) => {
  const { reveal } = useScene(450, 210);
  const frame = useCurrentFrame();
  const rule = interpolate(frame, [464, 520], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture dark={false} />
      <div style={{ color: colors.everglade, padding: "104px 128px" }}>
        <Kicker color={colors.everglade} delay={6}>
          {content.kicker}
        </Kicker>
        <div style={{ marginTop: 72, maxWidth: 1280 }}>
          <BigLine color={colors.everglade} delay={458} size={130}>
            {content.line1}
          </BigLine>
          <BigLine color={colors.heroAccent} delay={470} size={120}>
            {content.line2}
          </BigLine>
          <BigLine color={colors.accent} delay={486} size={110}>
            {content.line3}
          </BigLine>
        </div>
        <div
          style={{
            bottom: 100,
            display: "grid",
            gap: 0,
            gridTemplateColumns: "repeat(4, 1fr)",
            left: 128,
            position: "absolute",
            right: 128,
          }}
        >
          {content.items.map((item, index) => {
            const itemOpacity = interpolate(
              frame,
              [522 + index * 10, 540 + index * 10],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
              },
            );
            return (
              <div
                key={item}
                style={{
                  borderTop: `2px solid ${colors.purple}`,
                  color: colors.everglade,
                  fontFamily: theme.fonts.headline,
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  lineHeight: 1.18,
                  opacity: itemOpacity,
                  padding: "28px 32px 0 0",
                  textTransform: "uppercase",
                  transform: `scaleX(${rule})`,
                  transformOrigin: "left",
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProofScene = ({ content }: { content: TandraIntroContent["proof"] }) => {
  const { reveal } = useScene(630, 150);
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture />
      <ImagePip from={630} src="tandra.png" opacity={0.68} />
      <div style={{ padding: "116px 128px" }}>
        <Kicker delay={6}>{content.kicker}</Kicker>
        <div style={{ marginTop: 76, maxWidth: 1080 }}>
          <BigLine delay={634} size={136}>
            {content.line1}
          </BigLine>
          <BigLine color={colors.heroAccent} delay={650} size={136}>
            {content.line2}
          </BigLine>
        </div>
        <div
          style={{
            bottom: 96,
            color: colors.paperDark,
            display: "flex",
            fontFamily: theme.fonts.headline,
            fontSize: 34,
            fontWeight: 700,
            gap: 34,
            letterSpacing: "0.1em",
            lineHeight: 1,
            position: "absolute",
            textTransform: "uppercase",
          }}
        >
          {content.items.map((item, index) => (
            <span
              key={item}
              style={index === 1 ? { color: colors.accentLight } : undefined}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene = ({
  content,
}: {
  content: TandraIntroContent["closing"];
}) => {
  const { reveal } = useScene(750, 150);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [26 * fps, 30 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <PageTexture dark={false} />
      <div
        style={{
          alignItems: "center",
          color: colors.everglade,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "96px 128px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: colors.accent,
            fontFamily: theme.fonts.headline,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.16em",
            lineHeight: 1,
            marginBottom: 52,
            textTransform: "uppercase",
          }}
        >
          {content.kicker}
        </div>
        <BigLine color={colors.everglade} delay={756} size={168}>
          {content.line1}
        </BigLine>
        <BigLine color={colors.everglade} delay={770} size={168}>
          {content.line2}
        </BigLine>
        <div
          style={{
            backgroundColor: colors.everglade,
            color: colors.paper,
            fontFamily: theme.fonts.headline,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "0.1em",
            marginTop: 66,
            opacity: 0.82 + pulse * 0.18,
            padding: "28px 42px",
            textTransform: "uppercase",
          }}
        >
          {content.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TandraIntro = ({ content }: TandraIntroProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      <StormScene content={content.storm} />
      <StraightAnswersScene content={content.straightAnswers} />
      <InspectionScene content={content.inspection} />
      <ManagedScene content={content.managed} />
      <ProofScene content={content.proof} />
      <ClosingScene content={content.closing} />
    </AbsoluteFill>
  );
};
