import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

import {
  type DeskBoardItemRecord,
  type DeskBoardKind,
  listBoardItems,
  saveBoardItem,
} from "./desk-board.js";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile";
const GROQ_DEFAULT_HEADERS = { "Groq-Model-Version": "latest" } as const;

const MAX_GENERATED = 6;
const CONTEXT_ITEM_LIMIT = 40;

const RE_MODEL_AVAILABILITY_FAILURE =
  /model.*(not found|unsupported|decommissioned|not available)|invalid model/i;

const isModelAvailabilityFailure = (message: string): boolean =>
  RE_MODEL_AVAILABILITY_FAILURE.test(message);

const RE_JSON_ARRAY = /\[[\s\S]*\]/;

export type DeskPlanMode = "tasks" | "content";

export interface DeskPlanResult {
  body: {
    error?: string;
    items?: DeskBoardItemRecord[];
    ok: boolean;
  };
  status: number;
}

interface DeskPlanOptions {
  createdBy: string;
  groqKey: string | undefined;
  mode: DeskPlanMode;
  sanityWriteToken: string | undefined;
}

const BRAND_CONTEXT = `Tandra Peters is a roofing consultant with Birdcreek Roofing (one word, lowercase "c"), serving Central Texas homeowners — the Austin metro plus surrounding counties, and now also Tarrant/Fort Worth, Dallas, and McLennan/Waco. Write everything in Tandra's honest, plain-spoken first-person voice — the way she'd actually talk on the job, never corporate jargon. Texas roofing demand is seasonal: spring and early-summer hail storms drive post-storm inspection and insurance-claim work.`;

const TASKS_SYSTEM = `You are Tandra's marketing operations planner. Using proven marketing-psychology mental models (Jobs to Be Done, Theory of Constraints, Pareto 80/20, social proof, loss aversion, and second-order thinking), generate the next batch of concrete marketing work items that move the needle for a solo roofing consultant.

${BRAND_CONTEXT}

Rules:
- Look at what is already DONE and what is still TODO in the provided board. Do NOT repeat items that already exist. Build on completed work — propose the logical next step.
- Each task must be a single, concrete, shippable action Tandra (or her developer) can finish in one sitting. No vague "improve SEO" filler.
- Prefer high impact-to-effort tasks. Favor the bottleneck constraining lead flow.
- Assign a realistic channel (e.g. "Google Business Profile", "Blog", "Email", "Instagram", "Referrals", "Website").

Return ONLY a JSON array (no prose, no markdown fences) of up to ${MAX_GENERATED} objects with this exact shape:
[{ "title": string, "detail": string, "channel": string }]
- title: <= 120 chars, action-first ("Publish...", "Record...", "Add...").
- detail: 1-2 sentences on the why + how, in Tandra's voice.`;

const CONTENT_SYSTEM = `You are Tandra's content strategist. Using content-strategy best practices (searchable vs shareable content, topic pillars, and mapping topics to buyer stages), generate the next batch of content-calendar entries for a solo roofing consultant.

${BRAND_CONTEXT}

Rules:
- Look at content already planned in the provided board and do NOT duplicate topics. Fill gaps across pillars and buyer stages.
- Each entry targets a real question Central Texas homeowners search when dealing with roof damage, hail, insurance claims, or picking a contractor.
- Spread entries across buyer stages: awareness, consideration, decision, retention.
- Give each a content pillar theme (e.g. "Storm & hail damage", "Insurance claims", "Choosing a contractor", "Roof maintenance", "Cost & financing").
- Suggest a realistic publish date (YYYY-MM-DD) over the coming weeks, front-loading storm-season topics.

Return ONLY a JSON array (no prose, no markdown fences) of up to ${MAX_GENERATED} objects with this exact shape:
[{ "title": string, "detail": string, "pillar": string, "buyerStage": "awareness" | "consideration" | "decision" | "retention", "publishDate": string, "channel": string }]
- title: <= 120 chars, the working headline.
- detail: 1-2 sentences on the angle + target search intent, in Tandra's voice.`;

const summarizeBoard = (items: DeskBoardItemRecord[]): string => {
  if (items.length === 0) {
    return "The board is currently empty.";
  }
  return items
    .slice(0, CONTEXT_ITEM_LIMIT)
    .map((item) => {
      const bits = [`- [${item.status}] ${item.title}`];
      if (item.channel) {
        bits.push(`(${item.channel})`);
      }
      if (item.pillar) {
        bits.push(`pillar: ${item.pillar}`);
      }
      if (item.buyerStage) {
        bits.push(`stage: ${item.buyerStage}`);
      }
      return bits.join(" ");
    })
    .join("\n");
};

interface GeneratedItem {
  buyerStage?: unknown;
  channel?: unknown;
  detail?: unknown;
  pillar?: unknown;
  publishDate?: unknown;
  title?: unknown;
}

const parseGenerated = (text: string): GeneratedItem[] => {
  const match = text.match(RE_JSON_ARRAY);
  if (!match) {
    return [];
  }
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return Array.isArray(parsed) ? (parsed as GeneratedItem[]) : [];
  } catch {
    return [];
  }
};

export const generateBoardPlan = async (
  options: DeskPlanOptions
): Promise<DeskPlanResult> => {
  if (!options.groqKey?.trim()) {
    return {
      body: { error: "GROQ_API_KEY is not set.", ok: false },
      status: 500,
    };
  }
  if (!options.sanityWriteToken?.trim()) {
    return {
      body: {
        error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
        ok: false,
      },
      status: 500,
    };
  }

  const kind: DeskBoardKind = options.mode === "content" ? "content" : "task";
  const system = options.mode === "content" ? CONTENT_SYSTEM : TASKS_SYSTEM;

  const context = await listBoardItems({
    kind,
    sanityWriteToken: options.sanityWriteToken,
  });
  const existing = context.body.items ?? [];

  const groq = createGroq({
    apiKey: options.groqKey,
    headers: GROQ_DEFAULT_HEADERS,
  });

  const userPrompt = `Here is the current ${kind} board:\n\n${summarizeBoard(
    existing
  )}\n\nGenerate the next batch now.`;

  const runWithModel = async (modelId: string): Promise<string> => {
    const { text } = await generateText({
      messages: [{ content: userPrompt, role: "user" }],
      model: groq(modelId),
      system,
    });
    return text;
  };

  let text: string;
  try {
    text = await runWithModel(GROQ_MODEL);
  } catch (modelError) {
    const message =
      modelError instanceof Error ? modelError.message : String(modelError);
    if (!isModelAvailabilityFailure(message)) {
      throw modelError;
    }
    text = await runWithModel(GROQ_MODEL_FALLBACK);
  }

  const generated = parseGenerated(text).slice(0, MAX_GENERATED);
  if (generated.length === 0) {
    return {
      body: { error: "The model did not return any usable items.", ok: false },
      status: 502,
    };
  }

  const saved: DeskBoardItemRecord[] = [];
  for (const raw of generated) {
    const result = await saveBoardItem(
      {
        buyerStage: raw.buyerStage,
        channel: raw.channel,
        detail: raw.detail,
        kind,
        origin: "generated",
        pillar: raw.pillar,
        publishDate: raw.publishDate,
        status: kind === "content" ? "idea" : "todo",
        title: raw.title,
      },
      {
        createdBy: options.createdBy,
        sanityWriteToken: options.sanityWriteToken,
      }
    );
    if (result.body.item) {
      saved.push(result.body.item);
    }
  }

  return { body: { items: saved, ok: true }, status: 200 };
};
