import { MarkerType, type Edge, type Node } from "@xyflow/react";

const WORKFLOW_EDGE_COLOR = "#8156f6";

export type WorkflowNodeData = {
  title: string;
  body: string;
  wide?: boolean;
  subsections?: { title: string; body: string }[];
};

type SanityDoc = Record<string, unknown>;

export type WorkflowPageDoc = {
  pageTitle?: string;
  pageLede?: string;
  seoTitle?: string;
  seoDescription?: string;
  viewportZoom?: number;
  viewportAnchorX?: number;
  viewportAnchorY?: number;
  layoutOriginX?: number;
  layoutOriginY?: number;
  layoutNodeWidth?: number;
  layoutNodeHeight?: number;
  layoutColGap?: number;
  layoutRowGap?: number;
  layoutFinalRowExtraOffset?: number;
  nodes?: Array<{
    stepId?: string;
    title?: string;
    body?: string;
    wide?: boolean;
    posX?: number;
    posY?: number;
    subsections?: Array<{ title?: string; body?: string }>;
  }>;
  edges?: Array<{
    edgeId?: string;
    sourceStep?: string;
    targetStep?: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    animated?: boolean;
  }>;
};

const FALLBACK_PAGE_TITLE = "Insurance Claim Workflow";
const FALLBACK_PAGE_LEDE =
  "Here's how I walk homeowners through a storm or insurance claim with Birdcreek Roofing—from the first inspection to the last check.";
const FALLBACK_SEO_TITLE = "Insurance Claim Workflow | Tandra Peters";
const FALLBACK_SEO_DESCRIPTION =
  "Step-by-step overview of the Birdcreek Roofing insurance claim process—from inspection through installation and final payment.";

const FALLBACK_STEPS: WorkflowNodeData[] = [
  {
    title: "Roof Inspection",
    body: "I'll take a look first. If there's no damage, I'll tell you—you're good to go.",
  },
  {
    title: "File the Claim",
    body: "Once you file the claim, let me know when the adjuster will inspect your roof.",
  },
  {
    title: "Receive the Estimate Letter & Check",
    body: "Forward the full estimate to tandra@birdcreekroofing.com.",
  },
  {
    title: "Adjuster & Birdcreek Roofing Meeting",
    body: "Having Birdcreek at the meeting with the adjuster helps ensure all components are accounted for.",
  },
  {
    title: "First Insurance Check",
    body: "The first insurance check, your deductible, and payment for any upgrades start the installation process.",
  },
  {
    title: "Supplement",
    body: "If insurance left items off the estimate, we'll request they include them.",
  },
  {
    title: "Roof Installation",
    body: "Once we have your signed contract, initial payment, and approval of any supplement, our production team will call to schedule your new roof.",
  },
  {
    title: "Work Complete / Payment Due",
    wide: true,
    body: "After the job is complete, we'll advise your insurance company and they'll release any recoverable depreciation. Those payments are due to Birdcreek Roofing when you receive them.",
    subsections: [
      {
        title: "Additional Insurance Payments (Supplements)",
        body: "If we find additional work that wasn't in the original estimate, with your permission we'll request coverage from the insurance company. They'll send you a separate check (a supplement). That check is due to Birdcreek Roofing when you receive it.",
      },
    ],
  },
];

type WorkflowLayout = {
  originX: number;
  originY: number;
  nodeWidth: number;
  nodeHeight: number;
  colGap: number;
  rowGap: number;
  finalRowExtraOffset: number;
};

const DEFAULT_LAYOUT: WorkflowLayout = {
  originX: 12,
  originY: 12,
  nodeWidth: 496,
  nodeHeight: 232,
  colGap: 230,
  rowGap: 40,
  finalRowExtraOffset: 24,
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const layoutPosition = (index: number, layout: WorkflowLayout): { x: number; y: number } => {
  const rowStride = layout.nodeHeight + layout.rowGap;
  const colStride = layout.nodeWidth + layout.colGap;

  switch (index) {
    case 0:
      return { x: layout.originX, y: layout.originY };
    case 1:
      return { x: layout.originX + colStride, y: layout.originY };
    case 2:
      return { x: layout.originX, y: layout.originY + rowStride };
    case 3:
      return { x: layout.originX + colStride, y: layout.originY + rowStride };
    case 4:
      return { x: layout.originX, y: layout.originY + rowStride * 2 };
    case 5:
      return { x: layout.originX + colStride, y: layout.originY + rowStride * 2 };
    case 6:
      return { x: layout.originX + colStride * 2, y: layout.originY + rowStride * 2 };
    case 7:
      return {
        x: layout.originX,
        y: layout.originY + rowStride * 3 + layout.finalRowExtraOffset,
      };
    default:
      return { x: 0, y: 0 };
  }
};

const mapWorkflowLayout = (
  doc: WorkflowPageDoc | SanityDoc | null | undefined,
): WorkflowLayout => ({
  originX: asNumber(doc?.layoutOriginX, DEFAULT_LAYOUT.originX),
  originY: asNumber(doc?.layoutOriginY, DEFAULT_LAYOUT.originY),
  nodeWidth: asNumber(doc?.layoutNodeWidth, DEFAULT_LAYOUT.nodeWidth),
  nodeHeight: asNumber(doc?.layoutNodeHeight, DEFAULT_LAYOUT.nodeHeight),
  colGap: asNumber(doc?.layoutColGap, DEFAULT_LAYOUT.colGap),
  rowGap: asNumber(doc?.layoutRowGap, DEFAULT_LAYOUT.rowGap),
  finalRowExtraOffset: asNumber(doc?.layoutFinalRowExtraOffset, DEFAULT_LAYOUT.finalRowExtraOffset),
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
    source: "1",
    target: "2",
    sourceHandle: "right",
    targetHandle: "left",
    label: "Damage found",
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    sourceHandle: "bottom",
    targetHandle: "top",
    label: "Adjuster scheduled",
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    sourceHandle: "right",
    targetHandle: "left",
    label: "Forward estimate",
  },
  {
    id: "e4-5",
    source: "4",
    target: "5",
    sourceHandle: "bottom",
    targetHandle: "top",
    label: "Meet on site",
  },
  {
    id: "e5-6",
    source: "5",
    target: "6",
    sourceHandle: "right",
    targetHandle: "left",
    label: "Deductible & deposit",
  },
  {
    id: "e6-7",
    source: "6",
    target: "7",
    sourceHandle: "right",
    targetHandle: "left",
    label: "Supplement filed",
  },
  {
    id: "e7-8",
    source: "7",
    target: "8",
    sourceHandle: "bottom",
    targetHandle: "top",
    label: "Install complete",
  },
] as const;

const edgeLabelDefaults = {
  labelShowBg: true,
  labelBgPadding: [8, 6] as [number, number],
  labelBgBorderRadius: 6,
};

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: WORKFLOW_EDGE_COLOR, width: 16, height: 16 },
  ...edgeLabelDefaults,
  animated: false,
};

const buildFallbackNodes = (layout: WorkflowLayout): Node<WorkflowNodeData>[] =>
  FALLBACK_STEPS.map((step, index) => ({
    id: String(index + 1),
    type: "workflowStep",
    position: layoutPosition(index, layout),
    data: step,
  }));

const buildFallbackEdges = (): Edge[] =>
  FALLBACK_CONNECTIONS.map((connection) => ({
    ...edgeDefaults,
    ...connection,
  }));

const mapNodeData = (node: NonNullable<WorkflowPageDoc["nodes"]>[number]): WorkflowNodeData => {
  const subsections = Array.isArray(node.subsections)
    ? node.subsections.flatMap((section) => {
        const title = asString(section.title);
        const body = asString(section.body);
        if (!title || !body) return [];
        return [{ title, body }];
      })
    : undefined;

  return {
    title: asString(node.title) ?? "",
    body: asString(node.body) ?? "",
    ...(node.wide ? { wide: true } : {}),
    ...(subsections?.length ? { subsections } : {}),
  };
};

export const mapWorkflowDiagram = (doc: WorkflowPageDoc | SanityDoc | null | undefined) => {
  const layout = mapWorkflowLayout(doc);
  const nodesRaw = Array.isArray(doc?.nodes) ? doc.nodes : null;
  const edgesRaw = Array.isArray(doc?.edges) ? doc.edges : null;

  const nodes =
    nodesRaw?.length &&
    nodesRaw.every((node) => asString(node.stepId) && asString(node.title) && asString(node.body))
      ? [...nodesRaw]
          .sort((a, b) => {
            const ai = stepIndexFromId(asString(a.stepId) ?? "");
            const bi = stepIndexFromId(asString(b.stepId) ?? "");
            return (ai ?? 0) - (bi ?? 0);
          })
          .map((node) => {
            const stepId = asString(node.stepId)!;
            const index = stepIndexFromId(stepId) ?? 0;
            const defaultPosition = layoutPosition(index, layout);
            return {
              id: stepId,
              type: "workflowStep" as const,
              position: {
                x: asNumber(node.posX, defaultPosition.x),
                y: asNumber(node.posY, defaultPosition.y),
              },
              data: mapNodeData(node),
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
        asString(edge.targetHandle) &&
        asString(edge.label),
    )
      ? edgesRaw.map((edge) => ({
          ...edgeDefaults,
          id: asString(edge.edgeId)!,
          source: asString(edge.sourceStep)!,
          target: asString(edge.targetStep)!,
          sourceHandle: asString(edge.sourceHandle)!,
          targetHandle: asString(edge.targetHandle)!,
          label: asString(edge.label)!,
        }))
      : buildFallbackEdges();

  const viewportZoom = asNumber(doc?.viewportZoom, 0.85);
  const viewportAnchorX = asNumber(doc?.viewportAnchorX, 60);
  const viewportAnchorY = asNumber(doc?.viewportAnchorY, 60);
  const originX = layout.originX;
  const originY = layout.originY;

  return {
    nodes,
    edges,
    viewportZoom,
    viewportAnchorX,
    viewportAnchorY,
    originX,
    originY,
    estimatedNodeHeight: layout.nodeHeight,
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
  };
};

export const mapWorkflowPageCopy = (doc: WorkflowPageDoc | SanityDoc | null | undefined) => {
  const pageTitle = asString(doc?.pageTitle) ?? FALLBACK_PAGE_TITLE;
  const pageLede = asString(doc?.pageLede) ?? FALLBACK_PAGE_LEDE;

  return {
    pageTitle,
    pageLede,
    seoTitle: asString(doc?.seoTitle) ?? FALLBACK_SEO_TITLE,
    seoDescription: asString(doc?.seoDescription) ?? FALLBACK_SEO_DESCRIPTION,
  };
};
