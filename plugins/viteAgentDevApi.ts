/**
 * Serves POST /api/agent, POST /api/feature-agent, and POST /api/marketing-agent
 * during `vite` dev so you can test all agents locally without running
 * `vercel dev`. Requires SANITY_API_READ_TOKEN and GROQ_API_KEY in repo-root
 * `.env.local`.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const AGENT_PATHS = ["/api/agent", "/api/feature-agent", "/api/marketing-agent"] as const;
type AgentPath = (typeof AGENT_PATHS)[number];

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

const pathnameOnly = (url: string | undefined): string => (url ?? "").split("?")[0] ?? "";

const isFunctionCallFailure = (message: string): boolean =>
  /failed to call a function|failed_generation/i.test(message);

const isModelAvailabilityFailure = (message: string): boolean =>
  /model.*(not found|unsupported|decommissioned|not available)|invalid model/i.test(message);

const SYSTEM_PROMPTS: Record<AgentPath, string> = {
  "/api/agent": `You are the content drafting assistant for Tandra Peters Consulting — a roofing consulting website serving Austin and Texas homeowners.

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
Say so directly. For technical roofing facts, recommend the user verify with Tandra or a current industry source before publishing.`,

  "/api/marketing-agent": `You are the marketing strategist for tandra.me — a roofing consultant website serving Central Texas homeowners.

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
Use markdown. Start with a prioritised action summary (what to do first), then detailed guidance. For keyword lists, use tables with columns: Keyword | Intent | Difficulty (Low/Med/High) | Notes. For content recommendations, include the proposed H1, target keyword, and a one-sentence angle description.`,

  "/api/feature-agent": `You are the feature-planning assistant for tandra.me — a Vite + React + TypeScript roofing consultant website powered by Sanity CMS.

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

## Boundaries
- You do not write to Sanity. All proposals are for the developer to review and implement.
- Do not fabricate document IDs, image asset references, or slugs — always query first.
- Do not propose architectural rewrites. Work within the existing Vite + React + react-router-dom + Sanity stack.
- Do not propose changing the design system (OKLCH palette, theme.ts). New components should use the existing theme tokens.

## Response format
Use markdown. Lead with a concise summary, then structure and detail. Use code blocks with language tags for TypeScript, TSX, and GROQ.`,
};

const MCP_SLUGS: Record<AgentPath, string> = {
  "/api/agent": "content-editor",
  "/api/feature-agent": "feature-builder",
  "/api/marketing-agent": "content-editor",
};

type RpcTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const PRIMARY_MODEL_BY_PATH: Record<AgentPath, string> = {
  "/api/agent": "llama-3.3-70b-versatile",
  "/api/feature-agent": "llama-3.3-70b-versatile",
  "/api/marketing-agent": "openai/gpt-oss-120b",
};

const FALLBACK_MODEL_BY_PATH: Record<AgentPath, string> = {
  "/api/agent": "llama-3.3-70b-versatile",
  "/api/feature-agent": "llama-3.3-70b-versatile",
  "/api/marketing-agent": "llama-3.3-70b-versatile",
};

const GROQ_DEFAULT_HEADERS_BY_PATH: Partial<Record<AgentPath, Record<string, string>>> = {
  "/api/marketing-agent": { "Groq-Model-Version": "latest" },
};

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
      const pathname = pathnameOnly(req.url) as AgentPath;
      if (!(AGENT_PATHS as readonly string[]).includes(pathname)) {
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

      if (!token) {
        json(res, 500, { error: "SANITY_API_READ_TOKEN not set" });
        return;
      }
      if (!groqKey) {
        json(res, 500, { error: "GROQ_API_KEY not set" });
        return;
      }

      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString()) as {
          messages?: unknown[];
          slug?: string;
          threadId?: string;
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
        const slug = body.slug ?? MCP_SLUGS[pathname];
        const sanityMcpUrl = `https://api.sanity.io/v2026-03-03/agent-context/${PROJECT_ID}/${DATASET}/${slug}`;
        const mobbinMcpUrl = env.MOBBIN_MCP_URL?.trim() ?? "";
        const mobbinMcpToken = env.MOBBIN_MCP_BEARER_TOKEN?.trim() ?? "";

        const sanityMcpHeaders = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${token}`,
        };
        const mobbinMcpHeaders = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(mobbinMcpToken ? { Authorization: `Bearer ${mobbinMcpToken}` } : {}),
        };

        const callJsonRpc = async (
          url: string,
          headers: Record<string, string>,
          method: string,
          params?: unknown,
          id = 1,
        ) => {
          const r = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
          });
          const text = await r.text();
          const dataLine = text
            .split("\n")
            .find((l) => l.startsWith("data: "))
            ?.slice(6);
          const parsed = JSON.parse(dataLine ?? text) as {
            result?: unknown;
            error?: { message: string };
          };
          if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
          return parsed.result;
        };

        const sanityToolsResult = (await callJsonRpc(
          sanityMcpUrl,
          sanityMcpHeaders,
          "tools/list",
        )) as { tools: RpcTool[] };

        const allToolEntries: Array<
          [string, RpcTool, (input: Record<string, unknown>) => Promise<string>]
        > = sanityToolsResult.tools.map((mcpTool) => [
          mcpTool.name,
          mcpTool,
          async (input: Record<string, unknown>) => {
            const result = (await callJsonRpc(sanityMcpUrl, sanityMcpHeaders, "tools/call", {
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

        if (pathname === "/api/feature-agent" && mobbinMcpUrl) {
          const mobbinToolsResult = (await callJsonRpc(
            mobbinMcpUrl,
            mobbinMcpHeaders,
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
                const result = (await callJsonRpc(mobbinMcpUrl, mobbinMcpHeaders, "tools/call", {
                  name: mobbinTool.name,
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
          }
        }

        const tools = Object.fromEntries(
          allToolEntries.map(([toolName, mcpTool, execute]) => [
            toolName,
            {
              description: mcpTool.description,
              inputSchema: jsonSchema(mcpTool.inputSchema as Parameters<typeof jsonSchema>[0]),
              execute,
            },
          ]),
        );

        const groq = createGroq({
          apiKey: groqKey,
          ...(GROQ_DEFAULT_HEADERS_BY_PATH[pathname]
            ? { headers: GROQ_DEFAULT_HEADERS_BY_PATH[pathname] }
            : {}),
        });

        // Telemetry: save conversations to Sanity Insights (requires SANITY_WRITE_TOKEN)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let insights: any;
        const writeToken = env.SANITY_WRITE_TOKEN;
        if (writeToken) {
          const { sanityInsightsIntegration } = await import("@sanity/agent-context/ai-sdk");
          const { createClient } = await import("@sanity/client");
          insights = sanityInsightsIntegration({
            client: createClient({
              projectId: PROJECT_ID,
              dataset: DATASET,
              apiVersion: "2026-01-01",
              useCdn: false,
              token: writeToken,
            }),
            agentId: MCP_SLUGS[pathname],
            threadId: body.threadId ?? crypto.randomUUID(),
          });
        }

        const baseRequest = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: body.messages as any,
          ...(insights ? { experimental_telemetry: { isEnabled: true, ...insights } } : {}),
        };

        const runWithModel = async (modelId: string) => {
          let responseText: string;
          try {
            ({ text: responseText } = await generateText({
              ...baseRequest,
              model: groq(modelId),
              system: SYSTEM_PROMPTS[pathname],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tools: tools as any,
              stopWhen: stepCountIs(10),
            }));
          } catch (toolError) {
            const toolErrorMessage =
              toolError instanceof Error ? toolError.message : String(toolError);
            if (!isFunctionCallFailure(toolErrorMessage)) {
              throw toolError;
            }

            ({ text: responseText } = await generateText({
              ...baseRequest,
              model: groq(modelId),
              system: `${SYSTEM_PROMPTS[pathname]}\n\nTool execution is currently unavailable. Do not call tools. Give the best possible answer from the provided conversation context and clearly state assumptions where needed.`,
            }));
          }
          return responseText;
        };

        let text: string;
        try {
          text = await runWithModel(PRIMARY_MODEL_BY_PATH[pathname]);
        } catch (modelError) {
          const modelErrorMessage =
            modelError instanceof Error ? modelError.message : String(modelError);
          if (!isModelAvailabilityFailure(modelErrorMessage)) {
            throw modelError;
          }
          text = await runWithModel(FALLBACK_MODEL_BY_PATH[pathname]);
        }

        json(res, 200, { response: text });
      } catch (err) {
        console.error("[vite-agent-dev-api]", err);
        const message = err instanceof Error ? err.message : String(err);
        json(res, 500, { error: message });
      }
    });
  },
});
