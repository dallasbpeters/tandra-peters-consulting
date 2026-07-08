/**
 * Calendar agent: turns live Desk + site context into a month of content
 * proposals.
 *
 * The agent is grounded in the same knowledge as the marketing agent (Central
 * Texas roofing seasonality, local SEO strategy) plus the Tandra Peters
 * content style guide, and it reads Desk signals (recent leads, canvassing
 * targets) so proposals follow real outreach activity. Output is validated by
 * `parsePlanProposals` — nothing is written to Sanity here; the user accepts
 * proposals from the calendar UI.
 */

import { createClient } from "@sanity/client";

import type {
  CalendarPlanProposal,
  MonthRef,
} from "../../src/lib/content-calendar";
import { monthKey, parsePlanProposals } from "../../src/lib/content-calendar";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile";
const GROQ_DEFAULT_HEADERS = { "Groq-Model-Version": "latest" } as const;

const MAX_FOCUS_LENGTH = 400;
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_YEAR = 2020;
const MAX_YEAR = 2100;

const RE_MODEL_AVAILABILITY_FAILURE =
  /model.*(not found|unsupported|decommissioned|not available)|invalid model/i;

export interface CalendarAgentBody {
  error?: string;
  monthKey?: string;
  ok: boolean;
  proposals?: CalendarPlanProposal[];
}

export interface CalendarAgentResult {
  body: CalendarAgentBody;
  status: number;
}

export interface CalendarAgentOptions {
  groqApiKey: string | undefined;
  sanityToken: string | undefined;
}

interface DeskLeadSignal {
  area?: string;
  county?: string;
  need?: string;
  nextStep?: string;
  source?: string;
}

interface CanvassTargetSignal {
  name?: string;
  neighborhoods?: { county?: string; neighborhood?: string }[];
  status?: string;
}

interface PostSignal {
  category?: string;
  publishedAt?: string;
  title?: string;
}

interface ExistingEntrySignal {
  channel?: string;
  scheduledFor?: string;
  title?: string;
}

interface PlanningContext {
  canvassTargets: CanvassTargetSignal[];
  existingEntries: ExistingEntrySignal[];
  leads: DeskLeadSignal[];
  posts: PostSignal[];
}

const CONTEXT_QUERY = `{
  "leads": *[_type == "deskLead"] | order(capturedAt desc)[0...10]{
    area, county, need, source, nextStep
  },
  "canvassTargets": *[_type == "deskCanvassTarget"] | order(updatedAt desc)[0...8]{
    name, status, neighborhoods[]{ neighborhood, county }
  },
  "posts": *[_type == "post"] | order(publishedAt desc)[0...12]{
    title, category, publishedAt
  },
  "existingEntries": *[_type == "deskBoardItem" && kind == "content" && publishDate >= $start && publishDate <= $end] | order(publishDate asc)[0...50]{
    title, channel, "scheduledFor": publishDate
  }
}`;

const fetchPlanningContext = async (
  token: string,
  month: MonthRef
): Promise<PlanningContext> => {
  const client = createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    perspective: "raw",
    projectId: SANITY_PROJECT_ID,
    token,
    useCdn: false,
  });
  const prefix = monthKey(month);
  return await client.fetch<PlanningContext>(CONTEXT_QUERY, {
    end: `${prefix}-31`,
    start: `${prefix}-01`,
  });
};

const describeLeads = (leads: DeskLeadSignal[]): string => {
  if (leads.length === 0) {
    return "No Desk leads captured yet — plan for proactive demand creation.";
  }
  return leads
    .map((lead) => {
      const where = [lead.area, lead.county].filter(Boolean).join(", ");
      const parts = [
        where ? `Area: ${where}` : "",
        lead.need ? `Need: ${lead.need}` : "",
        lead.source ? `Source: ${lead.source}` : "",
        lead.nextStep ? `Next step: ${lead.nextStep}` : "",
      ].filter(Boolean);
      return `- ${parts.join(" · ")}`;
    })
    .join("\n");
};

const describeCanvassTargets = (targets: CanvassTargetSignal[]): string => {
  if (targets.length === 0) {
    return "No canvassing targets saved yet.";
  }
  return targets
    .map((target) => {
      const areas = (target.neighborhoods ?? [])
        .map((n) => [n.neighborhood, n.county].filter(Boolean).join(", "))
        .filter(Boolean)
        .slice(0, 4)
        .join("; ");
      return `- ${target.name ?? "Unnamed"} (${target.status ?? "planned"})${areas ? ` — ${areas}` : ""}`;
    })
    .join("\n");
};

const describePosts = (posts: PostSignal[]): string => {
  if (posts.length === 0) {
    return "No articles published yet.";
  }
  return posts
    .map(
      (post) =>
        `- ${post.title ?? "Untitled"}${post.category ? ` [${post.category}]` : ""}${post.publishedAt ? ` (${post.publishedAt.slice(0, 10)})` : ""}`
    )
    .join("\n");
};

const describeExistingEntries = (entries: ExistingEntrySignal[]): string => {
  if (entries.length === 0) {
    return "The month is currently empty.";
  }
  return entries
    .map(
      (entry) =>
        `- ${entry.scheduledFor ?? "?"} · ${entry.channel ?? "?"} · ${entry.title ?? "Untitled"}`
    )
    .join("\n");
};

const SYSTEM_PROMPT = `You are the content-calendar planner for tandra.me — Tandra Peters, an independent roofing consultant serving Central and North Texas homeowners (Austin metro, Georgetown, Round Rock, Cedar Park, Pflugerville, Kyle, Buda, Dallas, Fort Worth, Waco, and surrounding counties).

You combine two in-house skills:

## Marketing skill
- Local SEO first: high-intent, low-competition roofing queries with city modifiers, question formats, and "near me" variants.
- Seasonality drives topics: spring/early-summer hail season, post-storm repair demand, fall maintenance, winter prep, and insurance-deadline angles.
- Channels available (use these exact values): "article" (blog post on tandra.me), "neighborhood-post" (Nextdoor/Facebook), "google-post" (Google Business Profile update), "email" (partner or homeowner email), "ad" (digital ad canvas creative), "postcard" (direct-mail creative), "video" (15-second ad).
- Follow Desk activity: if leads or canvassing targets cluster in a neighborhood, schedule content that supports that outreach (roof-check angles for that area).
- White-hat only. Never fabricate search volumes or rankings.

## Content style guide (voice)
- Tandra is a friendly Texas straight-talker and mom who knows roofing inside and out. Warm, direct, plain speech — never corporate jargon, never scare tactics.
- Titles are written in her first-person voice where natural ("What I check first after a hail storm in Georgetown").
- Brand: Birdcreek Roofing (one word, lowercase 'c') handles installs; Tandra is the personal brand.
- Trustworthy, not salesy. Real numbers and specifics beat vague claims.

## Output contract
Respond with ONLY a JSON array — no markdown fences, no commentary. Each element:
{
  "title": string,            // the working headline or post hook
  "channel": one of the seven channel values above,
  "scheduledFor": "YYYY-MM-DD" inside the requested month,
  "targetKeyword": string,    // primary search phrase, omit for postcards/video if not applicable
  "brief": string,            // 1-2 sentence angle in Tandra's voice direction
  "area": string              // optional neighborhood/city focus
}

Rules:
- Propose 8 to 14 items with a realistic solo-consultant cadence (2-4 per week, none on days that already have an entry when avoidable).
- Mix channels: at least 2 articles, 2 neighborhood posts, 1 google-post, 1 email. Ad/postcard/video only when Desk activity supports them.
- Do not duplicate existing scheduled titles or recently published articles — build on them instead.
- Every date must fall inside the requested month.`;

const buildUserPrompt = (
  month: MonthRef,
  focus: string,
  context: PlanningContext
): string => `Plan content for ${monthKey(month)}.

${focus ? `Focus request from the user: ${focus}\n` : ""}
## Desk signals — recent leads (anonymized)
${describeLeads(context.leads)}

## Desk signals — canvassing targets
${describeCanvassTargets(context.canvassTargets)}

## Recently published articles
${describePosts(context.posts)}

## Already on the calendar for ${monthKey(month)}
${describeExistingEntries(context.existingEntries)}

Return the JSON array now.`;

const FENCE_RE = /```(?:json)?/gu;

/**
 * Pull the first JSON array or object out of an LLM response, tolerating
 * markdown fences and surrounding prose. Returns null when nothing parses.
 */
export const extractJsonPayload = (text: string): unknown => {
  const cleaned = text.replaceAll(FENCE_RE, "").trim();
  const candidates: string[] = [cleaned];

  const blocks: { slice: string; start: number }[] = [];
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    blocks.push({
      slice: cleaned.slice(arrayStart, arrayEnd + 1),
      start: arrayStart,
    });
  }

  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    blocks.push({
      slice: cleaned.slice(objectStart, objectEnd + 1),
      start: objectStart,
    });
  }

  // Whichever block opens first is the outermost structure; try it first so a
  // wrapped `{ proposals: [...] }` is not mistaken for its inner array.
  blocks.sort((a, b) => a.start - b.start);
  candidates.push(...blocks.map((block) => block.slice));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
};

const parseMonthRef = (payload: Record<string, unknown>): MonthRef | null => {
  const month = Number(payload.month);
  const year = Number(payload.year);
  const monthOk =
    Number.isInteger(month) && month >= MIN_MONTH && month <= MAX_MONTH;
  const yearOk = Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
  return monthOk && yearOk ? { month, year } : null;
};

export const generateCalendarPlan = async (
  payload: Record<string, unknown>,
  options: CalendarAgentOptions
): Promise<CalendarAgentResult> => {
  if (!options.sanityToken?.trim()) {
    return {
      body: { error: "Sanity API token is not set.", ok: false },
      status: 500,
    };
  }
  if (!options.groqApiKey?.trim()) {
    return {
      body: { error: "GROQ_API_KEY is not set.", ok: false },
      status: 500,
    };
  }

  const month = parseMonthRef(payload);
  if (!month) {
    return {
      body: {
        error: "Provide a numeric month (1-12) and year to plan.",
        ok: false,
      },
      status: 400,
    };
  }

  const focus =
    typeof payload.focus === "string"
      ? payload.focus.trim().slice(0, MAX_FOCUS_LENGTH)
      : "";

  // Dynamic imports keep the AI SDK out of cold paths that never plan.
  const [context, { createGroq }, { generateText }] = await Promise.all([
    fetchPlanningContext(options.sanityToken, month),
    import("@ai-sdk/groq"),
    import("ai"),
  ]);

  const groq = createGroq({
    apiKey: options.groqApiKey,
    headers: GROQ_DEFAULT_HEADERS,
  });

  const prompt = buildUserPrompt(month, focus, context);

  const runWithModel = async (modelId: string): Promise<string> => {
    const { text } = await generateText({
      model: groq(modelId),
      prompt,
      system: SYSTEM_PROMPT,
    });
    return text;
  };

  let responseText: string;
  try {
    responseText = await runWithModel(GROQ_MODEL);
  } catch (modelError) {
    const message =
      modelError instanceof Error ? modelError.message : String(modelError);
    if (!RE_MODEL_AVAILABILITY_FAILURE.test(message)) {
      throw modelError;
    }
    responseText = await runWithModel(GROQ_MODEL_FALLBACK);
  }

  const proposals = parsePlanProposals(extractJsonPayload(responseText), month);
  if (proposals.length === 0) {
    return {
      body: {
        error:
          "The planner did not return usable proposals. Try again or narrow the focus.",
        ok: false,
      },
      status: 502,
    };
  }

  return {
    body: { monthKey: monthKey(month), ok: true, proposals },
    status: 200,
  };
};
