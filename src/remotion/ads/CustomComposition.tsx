import "./ads.vars.css";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, staticFile, delayRender, continueRender } from "remotion";

import type { CustomCompositionProps, SceneConfig } from "./composition/customSchema";

import {
  RvSceneHook,
  RvSceneSimple,
  RvSceneBenefits,
  RvSceneIntro,
  RvSceneLogoAnimation,
  RvSceneTrust,
  RvSceneCTA,
  RvSceneHelpingTexasHomeowners,
  SceneStormHook,
  SceneStormBrand,
  SsSceneImpact,
  SsSceneUrgency,
  SsSceneIntro,
  SsSceneValue,
  SsSceneCTA,
} from "./Clips";

// ─────────────────────────────────────────────────────────────────────────────
// Scene dispatcher — maps a SceneConfig to the correct component
// ─────────────────────────────────────────────────────────────────────────────

const renderScene = (scene: SceneConfig): React.ReactNode => {
  switch (scene.type) {
    case "hook":
      return <RvSceneHook {...scene} />;
    case "simple": {
      const s = scene as Extract<SceneConfig, { type: "simple" }>;
      return (
        <RvSceneSimple
          headline={s.headline}
          showPill={s.showPill}
          pill={s.pill}
          image={s.image}
          body={s.body}
        />
      );
    }
    case "benefits":
      return <RvSceneBenefits {...scene} />;
    case "intro-1":
      return <RvSceneIntro {...scene} />;
    case "trust":
      return <RvSceneTrust {...scene} />;
    case "cta":
      return <RvSceneCTA {...scene} badges={scene.badges} />;

    case "impact":
      return <SsSceneImpact {...scene} />;
    case "urgency":
      return <SsSceneUrgency {...scene} />;
    case "intro":
      return (
        <SsSceneIntro
          {...scene}
          showProfilePhoto={scene.showProfilePhoto}
          profilePhoto={scene.profilePhoto}
          seed={scene.seed}
        />
      );
    case "value":
      return <SsSceneValue {...scene} />;
    case "cta-3":
      return <SsSceneCTA {...scene} badges={scene.badges} />;
    case "logo-animation":
      return <RvSceneLogoAnimation {...scene} />;
    case "helping":
      return <RvSceneHelpingTexasHomeowners {...scene} />;
    case "storm-hook":
      return <SceneStormHook {...scene} />;
    case "storm-brand":
      return <SceneStormBrand {...scene} />;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomSlots — assembles any ordered list of scenes into a single video
// ─────────────────────────────────────────────────────────────────────────────

export const CustomSlots: React.FC<CustomCompositionProps> = ({ scenes }) => {
  const safeScenes = scenes ?? [];

  // Block rendering until every scene image is downloaded.
  const [handle] = useState(() => delayRender("Preloading all scene images"));

  useEffect(() => {
    const toSrc = (v: string) =>
      v.startsWith("http://") || v.startsWith("https://") ? v : staticFile(`ads/${v}`);

    const srcs: string[] = [];
    for (const s of safeScenes) {
      if ("image" in s && typeof s.image === "string") srcs.push(toSrc(s.image));
      const pf = (s as Record<string, unknown>).profilePhoto as { src?: string } | undefined;
      if (pf?.src) srcs.push(toSrc(pf.src));
    }

    if (srcs.length === 0) {
      continueRender(handle);
      return;
    }

    let remaining = srcs.length;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) continueRender(handle);
    };

    const imgs = srcs.map((src) => {
      const img = new Image();
      img.onload = tick;
      img.onerror = tick; // don't block forever on a bad URL
      img.src = src;
      return img;
    });

    return () =>
      imgs.forEach((img) => {
        img.src = "";
      });
  }, []);

  let offset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "var(--color-everglade)" }}>
      {safeScenes.map((scene, i) => {
        const from = offset;
        offset += scene.durationInFrames ?? 180;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames ?? 180}>
            {renderScene(scene)}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
