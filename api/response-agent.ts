// oxlint-disable func-style
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

import { createGroq } from "@ai-sdk/groq";
import { createClient } from "@sanity/client";
import { sanityInsightsIntegration } from "@sanity/context/ai-sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ModelMessage, ToolSet } from "ai";
import { generateText, jsonSchema, stepCountIs } from "ai";

import { downloadVisionAssets } from "./lib/download-vision-assets.js";
import {
  fetchNextdoorThread,
  NEXTDOOR_FETCH_TOOL,
} from "./lib/fetch-nextdoor-thread.js";
import { normalizeVisionMessages } from "./lib/normalize-vision-messages.js";
import { pickResponseAgentModel } from "./lib/response-agent-models.js";
import { RESPONSE_AGENT_SYSTEM_PROMPT } from "./lib/response-agent-prompt.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const AGENT_CONTEXT_SLUG = "response-agent";
const SANITY_MCP_URL = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${AGENT_CONTEXT_SLUG}`;

const RE_FUNCTION_CALL_FAILURE =
  /failed to call a function|failed_generation/iu;

const isFunctionCallFailure = (message: string): boolean =>
  RE_FUNCTION_CALL_FAILURE.test(message);

// ─── MCP helpers ──────────────────────────────────────────────────────────────

interface RpcTool {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

interface ResponseAgentBody {
  messages?: ModelMessage[];
  threadId?: string;
}

type ToolEntry = [
  string,
  RpcTool,
  (input: Record<string, unknown>) => Promise<string>,
];

const sanityMcpHeaders = (token: string) => ({
  Accept: "application/json, text/event-stream",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function callJsonRpc(
  url: string,
  headers: Record<string, string>,
  method: string,
  params?: unknown,
  id = 1
): Promise<unknown> {
  const res = await fetch(url, {
    body: JSON.stringify({ id, jsonrpc: "2.0", method, params }),
    headers,
    method: "POST",
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

const setCorsHeaders = (req: VercelRequest, res: VercelResponse): void => {
  const origin = req.headers.origin ?? "";
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim());

  if (allowed.length && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const createInsights = (threadId?: string) => {
  const writeToken = process.env.SANITY_WRITE_TOKEN;

  if (!writeToken) {
    return;
  }

  return sanityInsightsIntegration({
    agentId: "response-agent",
    client: createClient({
      apiVersion: "2026-01-01",
      dataset: DATASET,
      projectId: PROJECT_ID,
      token: writeToken,
      useCdn: false,
    }),
    threadId: threadId ?? crypto.randomUUID(),
  });
};

const createMcpToolEntry = (token: string, mcpTool: RpcTool): ToolEntry => [
  mcpTool.name,
  mcpTool,
  async (input: Record<string, unknown>) => {
    const result = (await callJsonRpc(
      SANITY_MCP_URL,
      sanityMcpHeaders(token),
      "tools/call",
      {
        arguments: input,
        name: mcpTool.name,
      }
    )) as { content?: { type: string; text?: string }[] };

    return (
      result.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n") ?? JSON.stringify(result)
    );
  },
];

const createNextdoorToolEntry = (): ToolEntry => {
  const nextdoorCookie = process.env.NEXTDOOR_SESSION_COOKIE?.trim();
  const jinaApiKey = process.env.JINA_API_KEY?.trim();

  return [
    NEXTDOOR_FETCH_TOOL.name,
    {
      description: NEXTDOOR_FETCH_TOOL.description,
      inputSchema: NEXTDOOR_FETCH_TOOL.inputSchema,
      name: NEXTDOOR_FETCH_TOOL.name,
    },
    (input: Record<string, unknown>) => {
      const url = typeof input.url === "string" ? input.url : "";
      return fetchNextdoorThread(url, {
        cookie: nextdoorCookie,
        jinaApiKey,
      });
    },
  ];
};

const toToolSet = (toolEntries: ToolEntry[]): ToolSet =>
  Object.fromEntries(
    toolEntries.map(([toolName, mcpTool, execute]) => [
      toolName,
      {
        description: mcpTool.description,
        execute,
        inputSchema: jsonSchema(
          mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]
        ),
      } as unknown as ToolSet[string],
    ])
  );

const loadTools = async (token: string): Promise<ToolSet> => {
  const sanityToolsResult = (await callJsonRpc(
    SANITY_MCP_URL,
    sanityMcpHeaders(token),
    "tools/list"
  )) as { tools: RpcTool[] };

  return toToolSet([
    ...sanityToolsResult.tools.map((mcpTool) =>
      createMcpToolEntry(token, mcpTool)
    ),
    createNextdoorToolEntry(),
  ]);
};

// ─── Route handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

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

  const body = req.body as ResponseAgentBody;
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const insights = createInsights(body.threadId);

  try {
    const tools = await loadTools(token);
    const groq = createGroq({ apiKey: groqKey });
    const messages = normalizeVisionMessages(body.messages);
    const modelId = pickResponseAgentModel(messages);

    const model = groq(modelId);
    const experimentalTelemetry = insights
      ? { integrations: [insights], isEnabled: true }
      : undefined;

    let text: string;
    try {
      ({ text } = await generateText({
        experimental_download: downloadVisionAssets,
        experimental_telemetry: experimentalTelemetry,
        messages,
        model,
        stopWhen: stepCountIs(10),
        system: RESPONSE_AGENT_SYSTEM_PROMPT,
        tools,
      }));
    } catch (toolError) {
      const toolErrorMessage =
        toolError instanceof Error ? toolError.message : String(toolError);
      if (!isFunctionCallFailure(toolErrorMessage)) {
        throw toolError;
      }

      ({ text } = await generateText({
        experimental_download: downloadVisionAssets,
        experimental_telemetry: experimentalTelemetry,
        messages,
        model,
        system: `${RESPONSE_AGENT_SYSTEM_PROMPT}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
      }));
    }

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error("[/api/response-agent]", error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
