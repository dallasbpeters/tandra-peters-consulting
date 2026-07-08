import { createClient } from "@sanity/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const WORKFLOW_PAGE_DOCUMENT_ID = "workflowPage";

const VALID_HANDLES = new Set(["top", "right", "bottom", "left"]);

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const sanitizeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

interface InputNode {
  body?: unknown;
  posX?: unknown;
  posY?: unknown;
  stepId?: unknown;
  subsections?: unknown;
  title?: unknown;
  wide?: unknown;
}

interface InputEdge {
  edgeId?: unknown;
  label?: unknown;
  sourceHandle?: unknown;
  sourceStep?: unknown;
  targetHandle?: unknown;
  targetStep?: unknown;
}

const sanitizeNodes = (input: unknown) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return (input as InputNode[])
    .map((node) => {
      const stepId = sanitizeString(node.stepId);
      const title = sanitizeString(node.title);
      const body = sanitizeString(node.body);
      if (!(stepId && title && body)) {
        return null;
      }

      const posX = sanitizeNumber(node.posX);
      const posY = sanitizeNumber(node.posY);

      const subsections = Array.isArray(node.subsections)
        ? node.subsections
            .map((section) => {
              if (!section || typeof section !== "object") {
                return null;
              }

              const titleValue = sanitizeString(
                (section as Record<string, unknown>).title
              );
              const bodyValue = sanitizeString(
                (section as Record<string, unknown>).body
              );
              if (!(titleValue && bodyValue)) {
                return null;
              }

              return {
                _key: `${stepId}-${titleValue.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
                _type: "workflowDiagramNodeSubsection",
                body: bodyValue,
                title: titleValue,
              };
            })
            .filter(Boolean)
        : [];

      return {
        _key: `node-${stepId}`,
        _type: "workflowDiagramNode",
        body,
        stepId,
        title,
        wide: node.wide === true,
        ...(subsections.length > 0 ? { subsections } : {}),
        ...(posX === null ? {} : { posX }),
        ...(posY === null ? {} : { posY }),
      };
    })
    .filter(Boolean);
};

const sanitizeEdges = (input: unknown) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return (input as InputEdge[])
    .map((edge) => {
      const edgeId = sanitizeString(edge.edgeId);
      const sourceStep = sanitizeString(edge.sourceStep);
      const targetStep = sanitizeString(edge.targetStep);
      const sourceHandle = sanitizeString(edge.sourceHandle) || "right";
      const targetHandle = sanitizeString(edge.targetHandle) || "left";
      const label = sanitizeString(edge.label) || "Connection";

      if (!(edgeId && sourceStep && targetStep)) {
        return null;
      }

      if (
        !(VALID_HANDLES.has(sourceHandle) && VALID_HANDLES.has(targetHandle))
      ) {
        return null;
      }

      return {
        _key: `edge-${edgeId}`,
        _type: "workflowDiagramEdge",
        edgeId,
        label,
        sourceHandle,
        sourceStep,
        targetHandle,
        targetStep,
      };
    })
    .filter(Boolean);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    res.status(401).json({ error: "Missing Google authorization token." });
    return;
  }

  const user = parseGoogleIdToken(bearer);
  if (!(user && isAllowedGoogleUser(user))) {
    res
      .status(403)
      .json({ error: "Google account is not authorized for workflow edits." });
    return;
  }

  const token = readWriteToken();
  if (!token) {
    res.status(500).json({
      error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    });
    return;
  }

  const body = (req.body ?? {}) as { nodes?: unknown; edges?: unknown };
  const nodes = sanitizeNodes(body.nodes);
  const edges = sanitizeEdges(body.edges);

  if (nodes.length === 0) {
    res.status(400).json({ error: "No valid workflow nodes provided." });
    return;
  }

  try {
    const client = createClient({
      apiVersion: SANITY_API_VERSION,
      dataset: SANITY_DATASET,
      projectId: SANITY_PROJECT_ID,
      token,
      useCdn: false,
    });

    await client
      .patch(WORKFLOW_PAGE_DOCUMENT_ID)
      .set({
        edges,
        nodes,
      })
      .commit();

    res
      .status(200)
      .json({ edgeCount: edges.length, nodeCount: nodes.length, ok: true });
  } catch (error) {
    console.error("[workflow-save]", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unexpected workflow save error.",
    });
  }
}
