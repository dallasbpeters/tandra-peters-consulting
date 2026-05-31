/**
 * POST /api/feature-agent
 *
 * Feature-planning agent. Connects to the Sanity Agent Context MCP endpoint
 * (feature-builder slug) so the LLM can inspect the live schema and content,
 * then propose Sanity schema additions, React component structures, and
 * step-by-step implementation plans for new site features.
 * Optionally also loads Mobbin MCP tools when MOBBIN_MCP_URL is configured.
 *
 * Expected body: { messages: ModelMessage[] }
 * Returns:       { response: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createGroq } from "@ai-sdk/groq";
import { sanityInsightsIntegration } from "@sanity/agent-context/ai-sdk";
import { createClient } from "@sanity/client";
import { generateText, jsonSchema, stepCountIs, type ModelMessage, type ToolSet } from "ai";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const AGENT_CONTEXT_SLUG = "feature-builder";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const SANITY_MCP_URL = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${AGENT_CONTEXT_SLUG}`;

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

**UI reference research (Mobbin MCP)** — When the request involves UI patterns, flows, or interaction design references, call Mobbin tools first (tool names prefixed with \`mobbin_\`). Cite the app/screen patterns you used and translate them into implementation recommendations for this codebase.

## Design & Brand Context

**Tandra Peters** is a roofing consultant employed by Birdcreek Roofing (one word, lowercase 'c' — never "BirdCreek"). She serves Central Texas homeowners. The site's brand voice is honest craftsmanship + warm authority — plain speech, no jargon she wouldn't say on the job.

**Design system (never change these without explicit instruction):**
- Colors: OKLCH-based palette. Primary = everglade (dark forest green). Accent = warm amber. All tokens live in \`src/theme.ts\`.
- Typography: Manrope for headings/UI labels, Instrument Serif for body text. Do not swap these.
- Icons: iconoir-react only — never suggest lucide-react.
- Service area: Central Texas — Fort Worth and Tarrant County are explicitly excluded.
- Responsive breakpoints belong in CSS files (\`site-layout.css\`), never inline.

**When proposing a new component:**
- Use theme tokens (\`theme.colors\`, \`theme.palette\`, \`theme.fonts\`), never hardcoded hex values.
- Match the existing warm, grounded visual language — earthy greens, warm whites, generous whitespace.
- Write copy in Tandra's first-person voice; don't refer to her in the third person.

## Boundaries
- You do not write to Sanity. All proposals are for the developer to review and implement.
- Do not fabricate document IDs, image asset references, or slugs — always query first.
- Do not propose architectural rewrites. Work within the existing Vite + React + react-router-dom + Sanity stack.
- Do not propose changing the design system (OKLCH palette, theme.ts). New components should use the existing theme tokens.

## Response format
Use markdown. Lead with a concise summary, then structure and detail. Use code blocks with language tags for TypeScript, TSX, and GROQ.`;

const isFunctionCallFailure = (message: string): boolean =>
  /failed to call a function|failed_generation/i.test(message);

// ─── MCP helpers ──────────────────────────────────────────────────────────────

type RpcTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const sanityMcpHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  Authorization: `Bearer ${token}`,
});

const mobbinMcpHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function callJsonRpc(
  url: string,
  headers: Record<string, string>,
  method: string,
  params?: unknown,
  id = 1,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers,
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
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim());
  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.SANITY_API_READ_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;
  const mobbinMcpUrl = process.env.MOBBIN_MCP_URL?.trim() ?? "";
  const mobbinMcpToken = process.env.MOBBIN_MCP_BEARER_TOKEN?.trim() ?? "";

  if (!token) return res.status(500).json({ error: "SANITY_API_READ_TOKEN not set" });
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not set" });

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
        agentId: "feature-agent",
        threadId: body.threadId ?? crypto.randomUUID(),
      })
    : undefined;

  try {
    const sanityToolsResult = (await callJsonRpc(
      SANITY_MCP_URL,
      sanityMcpHeaders(token),
      "tools/list",
    )) as { tools: RpcTool[] };

    const allToolEntries: Array<
      [string, RpcTool, (input: Record<string, unknown>) => Promise<string>]
    > = sanityToolsResult.tools.map((mcpTool) => [
      mcpTool.name,
      mcpTool,
      async (input: Record<string, unknown>) => {
        const result = (await callJsonRpc(SANITY_MCP_URL, sanityMcpHeaders(token), "tools/call", {
          name: mcpTool.name,
          arguments: input,
        })) as { content?: Array<{ type: string; text?: string }> };

        return (
          result.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("\n") ?? JSON.stringify(result)
        );
      },
    ]);

    if (mobbinMcpUrl) {
      const mobbinToolsResult = (await callJsonRpc(
        mobbinMcpUrl,
        mobbinMcpHeaders(mobbinMcpToken),
        "tools/list",
      )) as { tools: RpcTool[] };

      for (const mobbinTool of mobbinToolsResult.tools) {
        allToolEntries.push([
          `mobbin_${mobbinTool.name}`,
          {
            ...mobbinTool,
            description: `[Mobbin] ${mobbinTool.description}`,
          },
          async (input: Record<string, unknown>) => {
            const result = (await callJsonRpc(
              mobbinMcpUrl,
              mobbinMcpHeaders(mobbinMcpToken),
              "tools/call",
              {
                name: mobbinTool.name,
                arguments: input,
              },
            )) as { content?: Array<{ type: string; text?: string }> };

            return (
              result.content
                ?.filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("\n") ?? JSON.stringify(result)
            );
          },
        ]);
      }
    }

    const tools: ToolSet = Object.fromEntries(
      allToolEntries.map(([toolName, mcpTool, execute]) => [
        toolName,
        {
          description: mcpTool.description,
          inputSchema: jsonSchema(mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]),
          execute,
        } as unknown as ToolSet[string],
      ]),
    );

    const groq = createGroq({ apiKey: groqKey });

    const baseRequest = {
      model: groq(GROQ_MODEL),
      messages: body.messages,
      ...(insights ? { experimental_telemetry: { isEnabled: true, ...insights } } : {}),
    } as const;

    let text: string;
    try {
      ({ text } = await generateText({
        ...baseRequest,
        system: SYSTEM_PROMPT,
        tools,
        stopWhen: stepCountIs(10),
      }));
    } catch (toolError) {
      const toolErrorMessage = toolError instanceof Error ? toolError.message : String(toolError);
      if (!isFunctionCallFailure(toolErrorMessage)) {
        throw toolError;
      }

      ({ text } = await generateText({
        ...baseRequest,
        system: `${SYSTEM_PROMPT}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
      }));
    }

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("[/api/feature-agent]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
