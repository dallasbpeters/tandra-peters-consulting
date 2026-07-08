/**
 * POST /api/agent
 *
 * Internal content-editing agent. Connects to the Sanity Agent Context MCP
 * endpoint so the LLM can query the dataset, understand the schema, and help
 * with content work. Uses Groq (llama-3.3-70b-versatile) for inference.
 *
 * Expected body: { messages: ModelMessage[], slug?: string }
 *   messages — Vercel AI SDK CoreMessage array (role + content)
 *   slug     — optional Agent Context document slug to scope the MCP URL
 *
 * Returns: { response: string }
 */

import { createGroq } from "@ai-sdk/groq";
import { createClient } from "@sanity/client";
import { sanityInsightsIntegration } from "@sanity/context/ai-sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText, jsonSchema, stepCountIs } from "ai";
import type { ModelMessage, ToolSet } from "ai";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are the content drafting assistant for Tandra Peters Consulting — a roofing consulting website serving Austin and Texas homeowners.

## Setup (every session)
1. Call \`initial_context\` to load the schema.
2. Run \`groq_query\` with \`*[_id == "assist-context-brand-tone"][0].context\` to load the Brand Tone of Voice guidelines. Apply those guidelines to all copy and articles you write — they are the authoritative voice for this brand.

## What you do

**UI copy revisions** — When asked to update headlines, excerpts, CTAs, or any field value, first fetch the current value, then respond in this format:
- **Current:** [exact text from Sanity]
- **Proposed:** [revised version]
- **Why:** one sentence

**Article drafts** — Write complete, publish-ready articles on roofing topics. Use a clear headline, a grounded lead paragraph, scannable body sections, and a practical takeaway. Accuracy matters — if you're uncertain about a specific stat, material spec, code requirement, or cost figure, flag it explicitly and ask the user to verify before publishing. Never estimate and present it as fact.

## Boundaries
- You cannot write to Sanity. All output is for the user to review and paste into Studio manually.
- Never fabricate statistics, pricing, product specs, or building code details.
- Do not give SEO strategy advice — that is a separate workflow.

## When you don't know
Say so directly. For technical roofing facts, recommend the user verify with Tandra or a current industry source before publishing.`;

const RE_FUNCTION_CALL_FAILURE = /failed to call a function|failed_generation/i;

const isFunctionCallFailure = (message: string): boolean =>
  RE_FUNCTION_CALL_FAILURE.test(message);

// ─── MCP helpers ──────────────────────────────────────────────────────────────

const mcpUrl = (slug?: string) =>
  `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}${slug ? `/${slug}` : ""}`;

const mcpHeaders = (token: string) => ({
  Accept: "application/json, text/event-stream",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

/** Send a JSON-RPC request and return `result`. Handles SSE and plain JSON. */
async function callMcp(
  url: string,
  token: string,
  method: string,
  params?: unknown,
  id = 1
): Promise<unknown> {
  const res = await fetch(url, {
    body: JSON.stringify({ id, jsonrpc: "2.0", method, params }),
    headers: mcpHeaders(token),
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP ${method} failed (${res.status}): ${body}`);
  }

  const raw = await res.text();

  // SSE format: each message is "data: <json>\n\n"
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
  // CORS for local dev
  const origin = req.headers.origin ?? "";
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim());
  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

  const body = req.body as {
    messages?: ModelMessage[];
    slug?: string;
    threadId?: string;
  };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const url = mcpUrl(body.slug);

  // ── Sanity Insights telemetry (optional – requires SANITY_WRITE_TOKEN) ──────
  const writeToken = process.env.SANITY_WRITE_TOKEN;
  const insights = writeToken
    ? sanityInsightsIntegration({
        agentId: "content-agent",
        client: createClient({
          apiVersion: "2026-01-01",
          dataset: DATASET,
          projectId: PROJECT_ID,
          token: writeToken,
          useCdn: false,
        }),
        threadId: body.threadId ?? crypto.randomUUID(),
      })
    : undefined;

  try {
    // ── 1. Fetch MCP tool definitions ────────────────────────────────────────
    const toolsResult = (await callMcp(url, token, "tools/list")) as {
      tools: {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }[];
    };

    // ── 2. Convert MCP tools → AI SDK tools with execute handlers ────────────
    const tools: ToolSet = Object.fromEntries(
      toolsResult.tools.map((mcpTool) => {
        const execute = async (input: Record<string, unknown>) => {
          const result = (await callMcp(url, token, "tools/call", {
            arguments: input,
            name: mcpTool.name,
          })) as { content?: { type: string; text?: string }[] };

          return (
            result.content
              ?.filter((c) => c.type === "text")
              .map((c) => c.text ?? "")
              .join("\n") ?? JSON.stringify(result)
          );
        };

        return [
          mcpTool.name,
          // Cast via unknown: the runtime shape is correct; TypeScript's
          // overload resolution for tool() in v6 requires the cast.
          {
            description: mcpTool.description,
            execute,
            inputSchema: jsonSchema(
              mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]
            ),
          } as unknown as ToolSet[string],
        ];
      })
    );

    // ── 3. Run Groq with tool auto-continuation ───────────────────────────────
    const groq = createGroq({ apiKey: groqKey });
    const model = groq(GROQ_MODEL);
    const experimentalTelemetry = insights
      ? { integrations: [insights], isEnabled: true }
      : undefined;

    let text: string;
    try {
      ({ text } = await generateText({
        experimental_telemetry: experimentalTelemetry,
        messages: body.messages,
        model,
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

      ({ text } = await generateText({
        experimental_telemetry: experimentalTelemetry,
        messages: body.messages,
        model,
        system: `${SYSTEM_PROMPT}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
      }));
    }

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error("[/api/agent]", error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
