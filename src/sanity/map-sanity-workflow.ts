import { stegaClean } from "@sanity/client/stega";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

const WORKFLOW_EDGE_COLOR = "#8156f6";

export interface WorkflowNodeData extends Record<string, unknown> {
  body: string;
  subsections?: { title: string; body: string }[];
  title: string;
  wide?: boolean;
}

type SanityDoc = Record<string, unknown>;

export interface WorkflowPageDoc {
  edges?: {
    edgeId?: string;
    sourceStep?: string;
    targetStep?: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    animated?: boolean;
  }[];
  layoutColGap?: number;
  layoutFinalRowExtraOffset?: number;
  layoutNodeHeight?: number;
  layoutNodeWidth?: number;
  layoutOriginX?: number;
  layoutOriginY?: number;
  layoutRowGap?: number;
  nodes?: {
    stepId?: string;
    title?: string;
    body?: string;
    wide?: boolean;
    posX?: number;
    posY?: number;
    subsections?: Array<{ title?: string; body?: string }>;
  }[];
  pageLede?: string;
  pageTitle?: string;
  seoDescription?: string;
  seoTitle?: string;
  viewportAnchorX?: number;
  viewportAnchorY?: number;
  viewportZoom?: number;
}

const FALLBACK_PAGE_TITLE = "Insurance Claim Workflow";
const FALLBACK_PAGE_LEDE =
  "Here's how I walk homeowners through a storm or insurance claim with Birdcreek Roofing—from the first inspection to the last check.";
const FALLBACK_SEO_TITLE = "Insurance Claim Workflow | Tandra Peters";
const FALLBACK_SEO_DESCRIPTION =
  "Step-by-step overview of the Birdcreek Roofing insurance claim process—from inspection through installation and final payment.";

const FALLBACK_STEPS: WorkflowNodeData[] = [
  {
    body: "I'll take a look first. If there's no damage, I'll tell you—you're good to go.",
    title: "Roof Inspection",
  },
  {
    body: "Once you file the claim, let me know when the adjuster will inspect your roof.",
    title: "File the Claim",
  },
  {
    body: "Forward the full estimate to tandra@birdcreekroofing.com.",
    title: "Receive the Estimate Letter & Check",
  },
  {
    body: "Having Birdcreek at the meeting with the adjuster helps ensure all components are accounted for.",
    title: "Adjuster & Birdcreek Roofing Meeting",
  },
  {
    body: "The first insurance check, your deductible, and payment for any upgrades start the installation process.",
    title: "First Insurance Check",
  },
  {
    body: "If insurance left items off the estimate, we'll request they include them.",
    title: "Supplement",
  },
  {
    body: "Once we have your signed contract, initial payment, and approval of any supplement, our production team will call to schedule your new roof.",
    title: "Roof Installation",
  },
  {
    body: "After the job is complete, we'll advise your insurance company and they'll release any recoverable depreciation. Those payments are due to Birdcreek Roofing when you receive them.",
    subsections: [
      {
        body: "If we find additional work that wasn't in the original estimate, with your permission we'll request coverage from the insurance company. They'll send you a separate check (a supplement). That check is due to Birdcreek Roofing when you receive it.",

        title: "Additional Insurance Payments (Supplements)",
      },
    ],
    title: "Work Complete / Payment Due",
    wide: true,
  },
];

interface WorkflowLayout {
  colGap: number;
  finalRowExtraOffset: number;
  nodeHeight: number;
  nodeWidth: number;
  originX: number;
  originY: number;
  rowGap: number;
}

const DEFAULT_LAYOUT: WorkflowLayout = {
  colGap: 230,
  finalRowExtraOffset: 24,
  nodeHeight: 232,
  nodeWidth: 496,
  originX: 12,
  originY: 12,
  rowGap: 40,
};

const asString = (value: unknown): string | undefined => {
  const cleaned = stegaClean(value);
  return typeof cleaned === "string" && cleaned.trim() ? cleaned : undefined;
};

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const layoutPosition = (
  index: number,
  layout: WorkflowLayout
): { x: number; y: number } => {
  const rowStride = layout.nodeHeight + layout.rowGap;
  const colStride = layout.nodeWidth + layout.colGap;

  switch (index) {
    case 0: {
      return { x: layout.originX, y: layout.originY };
    }
    case 1: {
      return { x: layout.originX + colStride, y: layout.originY };
    }
    case 2: {
      return { x: layout.originX, y: layout.originY + rowStride };
    }
    case 3: {
      return { x: layout.originX + colStride, y: layout.originY + rowStride };
    }
    case 4: {
      return { x: layout.originX, y: layout.originY + rowStride * 2 };
    }
    case 5: {
      return {
        x: layout.originX + colStride,
        y: layout.originY + rowStride * 2,
      };
    }
    case 6: {
      return {
        x: layout.originX + colStride * 2,
        y: layout.originY + rowStride * 2,
      };
    }
    case 7: {
      return {
        x: layout.originX,
        y: layout.originY + rowStride * 3 + layout.finalRowExtraOffset,
      };
    }
    default: {
      return { x: 0, y: 0 };
    }
  }
};

const mapWorkflowLayout = (
  doc: WorkflowPageDoc | SanityDoc | null | undefined
): WorkflowLayout => ({
  colGap: asNumber(doc?.layoutColGap, DEFAULT_LAYOUT.colGap),
  finalRowExtraOffset: asNumber(
    doc?.layoutFinalRowExtraOffset,
    DEFAULT_LAYOUT.finalRowExtraOffset
  ),
  nodeHeight: asNumber(doc?.layoutNodeHeight, DEFAULT_LAYOUT.nodeHeight),
  nodeWidth: asNumber(doc?.layoutNodeWidth, DEFAULT_LAYOUT.nodeWidth),
  originX: asNumber(doc?.layoutOriginX, DEFAULT_LAYOUT.originX),
  originY: asNumber(doc?.layoutOriginY, DEFAULT_LAYOUT.originY),
  rowGap: asNumber(doc?.layoutRowGap, DEFAULT_LAYOUT.rowGap),
});

const stepIndexFromId = (stepId: string): number | null => {
  const n = Number.parseInt(stepId, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n - 1;
};

const FALLBACK_CONNECTIONS = [
  {
    id: "e1-2",
    label: "Damage found",
    source: "1",
    sourceHandle: "right",
    target: "2",
    targetHandle: "left",
  },
  {
    id: "e2-3",
    label: "Adjuster scheduled",
    source: "2",
    sourceHandle: "bottom",
    target: "3",
    targetHandle: "top",
  },
  {
    id: "e3-4",
    label: "Forward estimate",
    source: "3",
    sourceHandle: "right",
    target: "4",
    targetHandle: "left",
  },
  {
    id: "e4-5",
    label: "Meet on site",
    source: "4",
    sourceHandle: "bottom",
    target: "5",
    targetHandle: "top",
  },
  {
    id: "e5-6",
    label: "Deductible & deposit",
    source: "5",
    sourceHandle: "right",
    target: "6",
    targetHandle: "left",
  },
  {
    id: "e6-7",
    label: "Supplement filed",
    source: "6",
    sourceHandle: "right",
    target: "7",
    targetHandle: "left",
  },
  {
    id: "e7-8",
    label: "Install complete",
    source: "7",
    sourceHandle: "bottom",
    target: "8",
    targetHandle: "top",
  },
] as const;

const edgeLabelDefaults = {
  labelBgBorderRadius: 6,
  labelBgPadding: [8, 6] as [number, number],
  labelShowBg: true,
};

const edgeDefaults = {
  markerEnd: {
    color: WORKFLOW_EDGE_COLOR,
    height: 16,
    type: MarkerType.ArrowClosed,
    width: 16,
  },
  type: "smoothstep" as const,
  ...edgeLabelDefaults,
  animated: false,
};

const buildFallbackNodes = (layout: WorkflowLayout): Node<WorkflowNodeData>[] =>
  FALLBACK_STEPS.map((step, index) => ({
    data: step,
    id: String(index + 1),
    position: layoutPosition(index, layout),
    type: "workflowStep",
  }));

const buildFallbackEdges = (): Edge[] =>
  FALLBACK_CONNECTIONS.map((connection) => ({
    ...edgeDefaults,
    ...connection,
  }));

const mapNodeData = (
  node: NonNullable<WorkflowPageDoc["nodes"]>[number]
): WorkflowNodeData => {
  const subsections = Array.isArray(node.subsections)
    ? node.subsections.flatMap((section) => {
        const title = asString(section.title);
        const body = asString(section.body);
        if (!(title && body)) {
          return [];
        }
        return [{ body, title }];
      })
    : undefined;

  return {
    body: asString(node.body) ?? "",
    title: asString(node.title) ?? "",
    ...(node.wide ? { wide: true } : {}),
    ...(subsections?.length ? { subsections } : {}),
  };
};

export const mapWorkflowDiagram = (
  doc: WorkflowPageDoc | SanityDoc | null | undefined
) => {
  const layout = mapWorkflowLayout(doc);
  const nodesRaw = Array.isArray(doc?.nodes) ? doc.nodes : null;
  const edgesRaw = Array.isArray(doc?.edges) ? doc.edges : null;

  const nodes =
    nodesRaw?.length &&
    nodesRaw.every(
      (node) =>
        asString(node.stepId) && asString(node.title) && asString(node.body)
    )
      ? [...nodesRaw]
          .toSorted((a, b) => {
            const ai = stepIndexFromId(asString(a.stepId) ?? "");
            const bi = stepIndexFromId(asString(b.stepId) ?? "");
            return (ai ?? 0) - (bi ?? 0);
          })
          .map((node) => {
            const stepId = asString(node.stepId) ?? "";
            const index = stepIndexFromId(stepId) ?? 0;
            const defaultPosition = layoutPosition(index, layout);
            return {
              data: mapNodeData(node),
              id: stepId,
              position: {
                x: asNumber(node.posX, defaultPosition.x),
                y: asNumber(node.posY, defaultPosition.y),
              },
              type: "workflowStep" as const,
            };
          })
      : buildFallbackNodes(layout);

  const edges =
    edgesRaw?.length &&
    edgesRaw.every(
      (edge) =>
        asString(edge.edgeId) &&
        asString(edge.sourceStep) &&
        asString(edge.targetStep) &&
        asString(edge.sourceHandle) &&
        asString(edge.targetHandle)
      // label is intentionally optional — blank label just shows no text on the edge
    )
      ? edgesRaw.map((edge) => ({
          ...edgeDefaults,
          id: asString(edge.edgeId) ?? "",
          source: asString(edge.sourceStep) ?? "",
          sourceHandle: asString(edge.sourceHandle) ?? "",
          target: asString(edge.targetStep) ?? "",
          targetHandle: asString(edge.targetHandle) ?? "",
          ...(asString(edge.label) ? { label: asString(edge.label) } : {}),
        }))
      : buildFallbackEdges();

  const viewportZoom = asNumber(doc?.viewportZoom, 0.85);
  const viewportAnchorX = asNumber(doc?.viewportAnchorX, 60);
  const viewportAnchorY = asNumber(doc?.viewportAnchorY, 60);
  const { originX } = layout;
  const { originY } = layout;

  return {
    edges,
    estimatedNodeHeight: layout.nodeHeight,
    nodes,
    originX,
    originY,
    remountKey: [
      layout.originX,
      layout.originY,
      layout.nodeWidth,
      layout.nodeHeight,
      layout.colGap,
      layout.rowGap,
      layout.finalRowExtraOffset,
      nodes.map((node) => node.id).join(","),
    ].join("|"),
    viewportAnchorX,
    viewportAnchorY,
    viewportZoom,
  };
};

export const mapWorkflowPageCopy = (
  doc: WorkflowPageDoc | SanityDoc | null | undefined
) => {
  const pageTitle = asString(doc?.pageTitle) ?? FALLBACK_PAGE_TITLE;
  const pageLede = asString(doc?.pageLede) ?? FALLBACK_PAGE_LEDE;

  return {
    pageLede,
    pageTitle,
    seoDescription: asString(doc?.seoDescription) ?? FALLBACK_SEO_DESCRIPTION,
    seoTitle: asString(doc?.seoTitle) ?? FALLBACK_SEO_TITLE,
  };
};
