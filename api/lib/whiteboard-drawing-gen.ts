/**
 * Whiteboard drawing generator.
 *
 * Uses Groq to produce a simple whiteboard-style SVG drawing as an ordered
 * array of stroke paths. Each path represents one pen stroke and will be
 * animated sequentially with stroke-dashoffset in AnimatedDrawing.
 *
 * The output intentionally looks hand-drawn: 4–12 paths, simple shapes,
 * smooth bezier curves, centered on a 300×300 canvas.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

export interface GeneratedDrawing {
  viewBox: string;
  paths: string[];
}

const DRAWING_SYSTEM = `You are an expert whiteboard illustrator who creates simple, clear SVG drawings.
You draw in a clean marker-on-whiteboard style: bold strokes, simple shapes, recognizable icons.
Think TruScribe or RSA Animate — everything is drawn on screen, stroke by stroke.`;

function buildPrompt(subject: string, hint?: string): string {
  return `Draw a whiteboard-style illustration of: "${subject}"
${hint ? `Context / scene: ${hint}` : ""}

Return ONLY valid JSON, no explanation, no markdown fences:
{
  "viewBox": "0 0 300 300",
  "paths": [
    "M … path d attribute …",
    "M … path d attribute …"
  ]
}

Rules:
- 4–12 paths (each = one continuous pen stroke, like lifting and placing the marker)
- Order paths as a person would draw them (overall shape first, details after)
- Simple, recognizable line art — whiteboard / sketch / marker aesthetic
- NO fills, NO closed filled shapes — ONLY open or semi-open stroke paths
- Cover roughly 60–80% of the 300×300 canvas, centered
- Use smooth curves (C S Q) for organic feel, avoid jagged polylines
- Draw the SUBJECT, not just a metaphor — if the subject is "a house" draw a house
- Include 1–2 details that make the drawing clearly recognizable`;
}

const SUBJECTS_MAP: Record<string, string> = {
  house:
    "M50,250 L150,120 L250,250 M50,250 L250,250 M180,250 L180,170 L220,170 L220,250",
  person:
    "M150,60 A25,25 0 1,0 150.1,60 M150,85 L150,180 M150,130 L100,160 M150,130 L200,160 M150,180 L110,240 M150,180 L190,240",
  checkmark: "M40,150 L120,230 L270,70",
  arrow: "M30,150 L240,150 M200,100 L250,150 L200,200",
};

function fallbackPaths(subject: string): GeneratedDrawing {
  const lower = subject.toLowerCase();
  for (const [key, paths] of Object.entries(SUBJECTS_MAP)) {
    // eslint-disable-next-line react-doctor/js-set-map-lookups -- String.includes, not Array.includes; SUBJECTS_MAP has 4 entries
    if (lower.includes(key)) {
      return {
        viewBox: "0 0 300 300",
        paths: paths.split(" M ").map((p, i) => (i === 0 ? p : `M ${p}`)),
      };
    }
  }
  // Generic placeholder — a simple X inside a circle
  return {
    viewBox: "0 0 300 300",
    paths: [
      "M150,30 A120,120 0 1,0 150.1,30",
      "M90,90 L210,210",
      "M210,90 L90,210",
    ],
  };
}

export async function generateDrawing(
  subject: string,
  sceneHint?: string
): Promise<GeneratedDrawing> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn(
      "[whiteboard-drawing-gen] GROQ_API_KEY not set — using fallback"
    );
    return fallbackPaths(subject);
  }

  const groq = createGroq({ apiKey });

  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: DRAWING_SYSTEM,
      prompt: buildPrompt(subject, sceneHint),
      maxOutputTokens: 1200,
      temperature: 0.4,
    });

    // Extract JSON — tolerate markdown fences and leading/trailing text
    const jsonMatch = /\{[\s\S]*"paths"[\s\S]*\}/.exec(text);
    if (!jsonMatch) {
      console.warn(
        "[whiteboard-drawing-gen] No JSON in response, using fallback"
      );
      return fallbackPaths(subject);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      viewBox?: string;
      paths?: unknown;
    };

    if (
      !Array.isArray(parsed.paths) ||
      parsed.paths.length === 0 ||
      parsed.paths.some((p) => typeof p !== "string")
    ) {
      return fallbackPaths(subject);
    }

    return {
      viewBox:
        typeof parsed.viewBox === "string" ? parsed.viewBox : "0 0 300 300",
      paths: (parsed.paths as string[]).slice(0, 16),
    };
  } catch (error) {
    console.error("[whiteboard-drawing-gen] Generation failed:", error);
    return fallbackPaths(subject);
  }
}
