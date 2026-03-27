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

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createGroq } from "@ai-sdk/groq";
import {
  generateText,
  jsonSchema,
  stepCountIs,
  type ModelMessage,
  type ToolSet,
} from "ai";

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

// ─── MCP helpers ──────────────────────────────────────────────────────────────

const mcpUrl = (slug?: string) =>
  `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}${slug ? `/${slug}` : ""}`;

const mcpHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  Authorization: `Bearer ${token}`,
});

/** Send a JSON-RPC request and return `result`. Handles SSE and plain JSON. */
async function callMcp(
  url: string,
  token: string,
  method: string,
  params?: unknown,
  id = 1,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: mcpHeaders(token),
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
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

  if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
  return parsed.result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.SANITY_API_READ_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  if (!token)
    return res.status(500).json({ error: "SANITY_API_READ_TOKEN not set" });
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not set" });

  const body = req.body as { messages?: ModelMessage[]; slug?: string };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const url = mcpUrl(body.slug);

  try {
    // ── 1. Fetch MCP tool definitions ────────────────────────────────────────
    const toolsResult = (await callMcp(url, token, "tools/list")) as {
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
    };

    // ── 2. Convert MCP tools → AI SDK tools with execute handlers ────────────
    const tools: ToolSet = Object.fromEntries(
      toolsResult.tools.map((mcpTool) => {
        const execute = async (input: Record<string, unknown>) => {
          const result = (await callMcp(url, token, "tools/call", {
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
          // Cast via unknown: the runtime shape is correct; TypeScript's
          // overload resolution for tool() in v6 requires the cast.
          {
            description: mcpTool.description,
            parameters: jsonSchema(
              mcpTool.inputSchema as Parameters<typeof jsonSchema>[0],
            ),
            execute,
          } as unknown as ToolSet[string],
        ];
      }),
    );

    // ── 3. Run Groq with tool auto-continuation ───────────────────────────────
    const groq = createGroq({ apiKey: groqKey });

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: SYSTEM_PROMPT,
      messages: body.messages,
      tools,
      stopWhen: stepCountIs(10),
    });

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("[/api/agent]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
