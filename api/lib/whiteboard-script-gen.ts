/**
 * Generates a Tandra-voiced narration script for each whiteboard scene using
 * Claude. The script is conversational, warm, and matches Tandra's brand voice:
 * honest, direct, Austin-roofing-expert, never salesy.
 *
 * Used by `/api/whiteboard-voiceover` before TTS generation.
 */
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

import type { WhiteboardScene } from "../../src/remotion/whiteboard/whiteboard-schema.js";

type SceneWithScript = WhiteboardScene & { _generatedScript: string };

const TANDRA_VOICE_PROMPT = `You write voiceover narration for Tandra Peters — a roofing consultant at Birdcreek Roofing in Austin, Texas.

Tandra's voice is:
- Warm, honest, and direct — never salesy or pushy
- Conversational, like she's talking to a neighbor
- Expert but accessible — no jargon, plain roofer's vocabulary
- Empathetic to the stress homeowners feel after storm damage
- Confident: she's done hundreds of inspections and knows her stuff

Write narration that sounds EXACTLY like Tandra would say it out loud over a whiteboard video.
Keep it concise — each scene's narration should take 5-15 seconds to speak aloud at a comfortable pace.
No intro/outro fluff. Jump straight into the content.`;

const buildSceneContext = (scene: WhiteboardScene): string => {
  switch (scene.type) {
    case "title": {
      return [
        `Scene type: TITLE`,
        `Headline: ${scene.headline}`,
        scene.eyebrow ? `Eyebrow: ${scene.eyebrow}` : null,
        scene.subtitle ? `Subtitle: ${scene.subtitle}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "bullets": {
      return [
        `Scene type: BULLETS`,
        `Heading: ${scene.heading}`,
        `Points: ${scene.bullets.join(" | ")}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "callout": {
      return [
        `Scene type: CALLOUT STAT`,
        `Label: ${scene.label}`,
        `Stat: ${scene.stat}`,
        `Body: ${scene.body}`,
        scene.emphasis ? `Emphasis: ${scene.emphasis}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "diagram": {
      return [
        `Scene type: DIAGRAM / PROCESS`,
        `Heading: ${scene.heading}`,
        `Steps: ${scene.steps.map((s) => s.label + (s.detail ? ` (${s.detail})` : "")).join(" → ")}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "cta": {
      return [
        `Scene type: CALL TO ACTION`,
        `Headline: ${scene.headline}`,
        `Action: ${scene.action}`,
        `Byline: ${scene.byline}`,
        scene.badge ? `Badge: ${scene.badge}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    default: {
      return "";
    }
  }
};

export const generateNarrationScripts = async (
  scenes: WhiteboardScene[]
): Promise<SceneWithScript[]> => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const groq = createGroq({ apiKey });

  // Generate all scripts in parallel (one call per scene)
  const scripts = await Promise.all(
    scenes.map(async (scene, i) => {
      // If a script already exists, keep it
      if (scene.narration?.script) {
        return scene.narration.script;
      }

      const sceneContext = buildSceneContext(scene);
      const prompt = `${TANDRA_VOICE_PROMPT}

---
Scene ${i + 1} of ${scenes.length}:
${sceneContext}

Write Tandra's voiceover narration for this scene only. Return ONLY the narration text, no quotes, no labels.`;

      const { text } = await generateText({
        maxOutputTokens: 200,
        messages: [{ content: prompt, role: "user" }],
        model: groq("llama-3.3-70b-versatile"),
        temperature: 0.7,
      });

      return text.trim();
    })
  );

  return scenes.map((scene, i) => ({
    ...scene,
    _generatedScript: scripts[i] ?? "",
  }));
};
