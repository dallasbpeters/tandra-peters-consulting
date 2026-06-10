/**
 * POST /api/response-agent
 *
 * Nextdoor response assistant. Connects to the Sanity Agent Context MCP endpoint
 * (response-agent slug) so the LLM can load brand context and help Tandra draft
 * on-brand replies to neighborhood conversations.
 *
 * Expected body: { messages: ModelMessage[] }
 * Returns:       { response: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createGroq } from "@ai-sdk/groq";
import { sanityInsightsIntegration } from "@sanity/agent-context/ai-sdk";
import { createClient } from "@sanity/client";
import { generateText, jsonSchema, stepCountIs, type ModelMessage, type ToolSet } from "ai";

import { downloadVisionAssets } from "./lib/download-vision-assets.js";
import { fetchNextdoorThread, NEXTDOOR_FETCH_TOOL } from "./lib/fetch-nextdoor-thread.js";
import { normalizeVisionMessages } from "./lib/normalize-vision-messages.js";
import { pickResponseAgentModel } from "./lib/response-agent-models.js";
import { RESPONSE_AGENT_SYSTEM_PROMPT } from "./lib/response-agent-prompt.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const AGENT_CONTEXT_SLUG = "response-agent";
const SANITY_MCP_URL = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${AGENT_CONTEXT_SLUG}`;

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
        agentId: "response-agent",
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

    const nextdoorCookie = process.env.NEXTDOOR_SESSION_COOKIE?.trim();
    const jinaApiKey = process.env.JINA_API_KEY?.trim();

    allToolEntries.push([
      NEXTDOOR_FETCH_TOOL.name,
      {
        name: NEXTDOOR_FETCH_TOOL.name,
        description: NEXTDOOR_FETCH_TOOL.description,
        inputSchema: NEXTDOOR_FETCH_TOOL.inputSchema,
      },
      async (input: Record<string, unknown>) => {
        const url = typeof input.url === "string" ? input.url : "";
        return fetchNextdoorThread(url, {
          cookie: nextdoorCookie,
          jinaApiKey,
        });
      },
    ]);

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
    const messages = normalizeVisionMessages(body.messages);
    const modelId = pickResponseAgentModel(messages);

    const baseRequest = {
      model: groq(modelId),
      messages,
      ...(insights ? { experimental_telemetry: { isEnabled: true, ...insights } } : {}),
    } as const;

    let text: string;
    try {
      ({ text } = await generateText({
        ...baseRequest,
        system: RESPONSE_AGENT_SYSTEM_PROMPT,
        tools,
        stopWhen: stepCountIs(10),
        experimental_download: downloadVisionAssets,
      }));
    } catch (toolError) {
      const toolErrorMessage = toolError instanceof Error ? toolError.message : String(toolError);
      if (!isFunctionCallFailure(toolErrorMessage)) {
        throw toolError;
      }

      ({ text } = await generateText({
        ...baseRequest,
        system: `${RESPONSE_AGENT_SYSTEM_PROMPT}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
        experimental_download: downloadVisionAssets,
      }));
    }

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("[/api/response-agent]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
