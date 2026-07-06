/**
 * POST /api/marketing-agent
 *
 * Marketing strategy agent. Connects to the Sanity Agent Context MCP endpoint
 * (content-editor slug) so the LLM can inspect existing content, then provide
 * actionable advice on local SEO, content strategy, keyword opportunities, and
 * service page optimisation for tandra.me.
 *
 * Expected body: { messages: ModelMessage[], threadId?: string }
 * Returns:       { response: string }
 */

import { createGroq } from "@ai-sdk/groq";
import { createClient } from "@sanity/client";
import { sanityInsightsIntegration } from "@sanity/context/ai-sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  generateText,
  jsonSchema,
  type ModelMessage,
  stepCountIs,
  type ToolSet,
} from "ai";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = "7irm699i";
const DATASET = "production";
// Reuse content-editor so the agent can read and query live site content
const AGENT_CONTEXT_SLUG = "content-editor";
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_MODEL_FALLBACK = "llama-3.3-70b-versatile";
const GROQ_DEFAULT_HEADERS = { "Groq-Model-Version": "latest" } as const;
const MCP_URL = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${AGENT_CONTEXT_SLUG}`;

const SYSTEM_PROMPT = `You are the marketing strategist for tandra.me — a roofing consultant website serving Central Texas homeowners.

Your job is to help Dallas (the developer/site owner) grow Tandra's online visibility, attract more qualified leads, and build authority in the Texas roofing market.

## Setup (every session)
Call \`initial_context\` to load the current content schema. Use \`groq_query\` to inspect existing pages, posts, FAQs, and service descriptions before making recommendations — always base advice on what's actually live on the site, not assumptions. \`groq_query\` accepts one field only: \`query\` (the GROQ string). Do not pass \`params\`.

## What you do

**Content strategy** — Audit existing blog posts and FAQs. Identify topics that are missing, thin, or poorly optimised. Recommend new articles that target real search queries Central Texas homeowners use when dealing with roof damage, insurance claims, or contractor selection.

**Local SEO** — Advise on Google Business Profile optimisation, citation building, and on-page local signals (NAP consistency, service-area pages, location modifiers in headings and copy). Prioritise tactics with the highest impact-to-effort ratio for a solo consultant.

**Keyword opportunities** — Identify high-intent, low-competition keywords for Tandra's service area. Focus on roofing-specific queries in Austin, Georgetown, Round Rock, Cedar Park, Pflugerville, Kyle, Buda, and surrounding Central Texas cities. Use long-tail, question-format, and "near me" variants.

**Service page optimisation** — Review existing service descriptions fetched via \`groq_query\`. Suggest specific improvements to H1s, meta descriptions, page structure, internal links, and CTAs that would improve both rankings and conversions.

**Content calendar** — When asked, propose a realistic publishing schedule based on Tandra's bandwidth and seasonal roofing demand in Texas (spring/early-summer hail season, post-storm repair demand).

**Competitive positioning** — Help articulate what makes Tandra's consulting approach different from standard roofing contractors: independent advice, insurance claim expertise, homeowner advocacy.

## Brand guidelines (always apply)
- Voice: honest craftsmanship + warm authority — plain speech Tandra would actually say on the job, never corporate jargon
- Write copy in first-person for Tandra; never refer to her in the third person
- Service area: Central Texas — Austin metro and surrounding counties. Fort Worth and Tarrant County are explicitly excluded from the service area
- Brand name spelling: Birdcreek Roofing (one word, lowercase 'c') — never "BirdCreek"
- Do not recommend design or layout changes — that is the feature-builder agent's role

## Boundaries
- You do not write to Sanity. All output is for the developer to review and implement manually.
- Do not fabricate search volume numbers, CTR benchmarks, DA scores, or ranking timelines — frame all estimates clearly as estimates and recommend the user verify with Google Search Console or a keyword tool.
- Stick to white-hat, sustainable SEO practices only. No link schemes, keyword stuffing, or doorway pages.
- Do not recommend paid advertising unless explicitly asked.
- Do not propose technical infrastructure changes (hosting, CDN, build tools).

## Response format
Use markdown. Start with a prioritised action summary (what to do first), then detailed guidance. For keyword lists, use tables with columns: Keyword | Intent | Difficulty (Low/Med/High) | Notes. For content recommendations, include the proposed H1, target keyword, and a one-sentence angle description.`;

const RE_FUNCTION_CALL_FAILURE = /failed to call a function|failed_generation/i;
const RE_MODEL_AVAILABILITY_FAILURE =
  /model.*(not found|unsupported|decommissioned|not available)|invalid model/i;

const isFunctionCallFailure = (message: string): boolean =>
  RE_FUNCTION_CALL_FAILURE.test(message);

const isModelAvailabilityFailure = (message: string): boolean =>
  RE_MODEL_AVAILABILITY_FAILURE.test(message);

// ─── MCP helpers ──────────────────────────────────────────────────────────────

const mcpHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  Authorization: `Bearer ${token}`,
});

async function callMcp(
  token: string,
  method: string,
  params?: unknown,
  id = 1
): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: mcpHeaders(token),
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP ${method} failed (${res.status}): ${body}`);
  }

  const raw = await res.text();
  const dataLine = raw
    .split("\n")
    .find((l) => l.startsWith("data: "))
    ?.slice(6);

  const parsed = JSON.parse(dataLine ?? raw) as {
    result?: unknown;
    error?: { message: string };
  };

  if (parsed.error) {
    throw new Error(`MCP error: ${parsed.error.message}`);
  }
  return parsed.result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? "";
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim());
  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.SANITY_API_READ_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  if (!token) {
    return res.status(500).json({ error: "SANITY_API_READ_TOKEN not set" });
  }
  if (!groqKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not set" });
  }

  const body = req.body as { messages?: ModelMessage[]; threadId?: string };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // ── Sanity Insights telemetry (optional – requires SANITY_WRITE_TOKEN) ──────
  const writeToken = process.env.SANITY_WRITE_TOKEN;
  const insights = writeToken
    ? sanityInsightsIntegration({
        client: createClient({
          projectId: PROJECT_ID,
          dataset: DATASET,
          apiVersion: "2026-01-01",
          useCdn: false,
          token: writeToken,
        }),
        agentId: "marketing-agent",
        threadId: body.threadId ?? crypto.randomUUID(),
      })
    : undefined;

  try {
    const toolsResult = (await callMcp(token, "tools/list")) as {
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
    };

    const tools: ToolSet = Object.fromEntries(
      toolsResult.tools.map((mcpTool) => {
        const execute = async (input: Record<string, unknown>) => {
          const result = (await callMcp(token, "tools/call", {
            name: mcpTool.name,
            arguments: input,
          })) as { content?: Array<{ type: string; text?: string }> };

          return (
            result.content
              ?.filter((c) => c.type === "text")
              .map((c) => c.text ?? "")
              .join("\n") ?? JSON.stringify(result)
          );
        };

        return [
          mcpTool.name,
          {
            description: mcpTool.description,
            inputSchema: jsonSchema(
              mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]
            ),
            execute,
          } as unknown as ToolSet[string],
        ];
      })
    );

    const groq = createGroq({
      apiKey: groqKey,
      headers: GROQ_DEFAULT_HEADERS,
    });

    const experimentalTelemetry = insights
      ? { isEnabled: true, ...insights }
      : undefined;

    const runWithModel = async (modelId: string) => {
      let responseText: string;
      const model = groq(modelId);
      try {
        ({ text: responseText } = await generateText({
          model,
          messages: body.messages,
          experimental_telemetry: experimentalTelemetry,
          stopWhen: stepCountIs(10),
          system: SYSTEM_PROMPT,
          tools,
        }));
      } catch (toolError) {
        const toolErrorMessage =
          toolError instanceof Error ? toolError.message : String(toolError);
        if (!isFunctionCallFailure(toolErrorMessage)) {
          throw toolError;
        }

        ({ text: responseText } = await generateText({
          model,
          messages: body.messages,
          experimental_telemetry: experimentalTelemetry,
          system: `${SYSTEM_PROMPT}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
        }));
      }
      return responseText;
    };

    let text: string;
    try {
      text = await runWithModel(GROQ_MODEL);
    } catch (modelError) {
      const modelErrorMessage =
        modelError instanceof Error ? modelError.message : String(modelError);
      if (!isModelAvailabilityFailure(modelErrorMessage)) {
        throw modelError;
      }
      text = await runWithModel(GROQ_MODEL_FALLBACK);
    }

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("[/api/marketing-agent]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
