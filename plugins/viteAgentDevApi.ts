/**
 * Serves POST /api/agent during `vite` dev so you can test the content-editing
 * agent locally without running `vercel dev`. Requires SANITY_API_READ_TOKEN and
 * GROQ_API_KEY in repo-root `.env.local`.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const AGENT_PATH = "/api/agent";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer | string) => {
      chunks.push(typeof c === "string" ? Buffer.from(c) : c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const pathnameOnly = (url: string | undefined) => (url ?? "").split("?")[0] ?? "";

const json = (res: ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(payload);
};

export const viteAgentDevApi = (env: Record<string, string>): Plugin => ({
  name: "vite-agent-dev-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== AGENT_PATH) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        json(res, 405, { error: "Method not allowed" });
        return;
      }

      const token = env.SANITY_API_READ_TOKEN;
      const groqKey = env.GROQ_API_KEY;

      if (!token) { json(res, 500, { error: "SANITY_API_READ_TOKEN not set" }); return; }
      if (!groqKey) { json(res, 500, { error: "GROQ_API_KEY not set" }); return; }

      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString()) as {
          messages?: unknown[];
          slug?: string;
        };

        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          json(res, 400, { error: "messages array is required" });
          return;
        }

        // Dynamically import so we only load Groq/AI SDK in dev when the route is hit
        const { createGroq } = await import("@ai-sdk/groq");
        const { generateText, jsonSchema, stepCountIs } = await import("ai");

        const PROJECT_ID = "7irm699i";
        const DATASET = "production";
        const slug = body.slug ?? "content-editor";
        const mcpUrl = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${slug}`;

        const mcpHeaders = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${token}`,
        };

        const callMcp = async (method: string, params?: unknown, id = 1) => {
          const r = await fetch(mcpUrl, {
            method: "POST",
            headers: mcpHeaders,
            body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
          });
          const text = await r.text();
          const dataLine = text.split("\n").find((l) => l.startsWith("data: "))?.slice(6);
          const parsed = JSON.parse(dataLine ?? text) as {
            result?: unknown;
            error?: { message: string };
          };
          if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
          return parsed.result;
        };

        const toolsResult = (await callMcp("tools/list")) as {
          tools: Array<{
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
          }>;
        };

        const tools = Object.fromEntries(
          toolsResult.tools.map((mcpTool) => {
            const execute = async (input: Record<string, unknown>) => {
              const result = (await callMcp("tools/call", {
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
              },
            ];
          }),
        );

        const groq = createGroq({ apiKey: groqKey });

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

        const { text } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          system: SYSTEM_PROMPT,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: body.messages as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: tools as any,
          stopWhen: stepCountIs(10),
        });

        json(res, 200, { response: text });
      } catch (err) {
        console.error("[vite-agent-dev-api]", err);
        const message = err instanceof Error ? err.message : String(err);
        json(res, 500, { error: message });
      }
    });
  },
});
