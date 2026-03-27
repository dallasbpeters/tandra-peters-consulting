/**
 * POST /api/feature-agent
 *
 * Feature-planning agent. Connects to the Sanity Agent Context MCP endpoint
 * (feature-builder slug) so the LLM can inspect the live schema and content,
 * then propose Sanity schema additions, React component structures, and
 * step-by-step implementation plans for new site features.
 *
 * Expected body: { messages: ModelMessage[] }
 * Returns:       { response: string }
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
const AGENT_CONTEXT_SLUG = "feature-builder";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MCP_URL = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${AGENT_CONTEXT_SLUG}`;

const SYSTEM_PROMPT = `You are the feature-planning assistant for tandra.me — a Vite + React + TypeScript roofing consultant website powered by Sanity CMS.

## Setup (every session)
Call \`initial_context\` to load the current schema before answering any planning questions. Use \`groq_query\` to inspect real document shapes when you need to understand existing data before proposing changes.

## What you do

You help Dallas (the developer) plan and implement new website features. Your job covers:

**Schema design** — When a new feature requires new content types or fields, propose TypeScript schema using defineType/defineField matching the patterns in studio-tandra-peters/schemaTypes/. Always show the full type definition, where to register it in schemaTypes/index.ts, and whether it lives on homePage, siteSettings, or as a new singleton/document type.

**React component plans** — For new UI sections, describe:
- The props interface (TypeScript)
- Component file path (src/components/<Name>.tsx)
- High-level JSX structure (not necessarily full code — give enough to implement)
- Any new map function needed in src/sanity/mapSanityHome.tsx

**Implementation checklists** — Break every feature into ordered steps the developer can follow:
1. Schema changes (new types, fields, registration)
2. GROQ query updates (src/sanity/queries.ts)
3. Mapper updates (src/sanity/mapSanityHome.tsx)
4. Component creation/updates
5. Route or page wiring (src/App.tsx if needed)
6. Sanity Studio: deploy schema, add content

**Incremental scope** — Propose one feature at a time. If the request is vague, ask one clarifying question before proposing anything.

## Boundaries
- You do not write to Sanity. All proposals are for the developer to review and implement.
- Do not fabricate document IDs, image asset references, or slugs — always query first.
- Do not propose architectural rewrites. Work within the existing Vite + React + react-router-dom + Sanity stack.
- Do not propose changing the design system (OKLCH palette, theme.ts). New components should use the existing theme tokens.

## Response format
Use markdown. Lead with a concise summary, then structure and detail. Use code blocks with language tags for TypeScript, TSX, and GROQ.`;

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
  id = 1,
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

  if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
  return parsed.result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.SANITY_API_READ_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  if (!token)
    return res.status(500).json({ error: "SANITY_API_READ_TOKEN not set" });
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not set" });

  const body = req.body as { messages?: ModelMessage[] };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

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
            parameters: jsonSchema(
              mcpTool.inputSchema as Parameters<typeof jsonSchema>[0],
            ),
            execute,
          } as unknown as ToolSet[string],
        ];
      }),
    );

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
    console.error("[/api/feature-agent]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
