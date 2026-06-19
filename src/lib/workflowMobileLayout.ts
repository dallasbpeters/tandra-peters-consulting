import type { Edge, Node } from "@xyflow/react";

import type { WorkflowNodeData } from "../sanity/mapSanityWorkflow";

export const WORKFLOW_MOBILE_STACK_GAP = 120;
export const WORKFLOW_MOBILE_HORIZONTAL_PAD = 24;

const stepOrder = (id: string) => Number.parseInt(id, 10) || 0;

const sortByStep = <T extends { id: string }>(items: T[]) =>
  [...items].sort((a, b) => stepOrder(a.id) - stepOrder(b.id));

export const remapWorkflowEdgesForVerticalStack = (edges: Edge[]): Edge[] =>
  edges.map((edge) => {
    const sourceOrder = stepOrder(edge.source);
    const targetOrder = stepOrder(edge.target);
    const flowsDown = sourceOrder <= targetOrder;

    return {
      ...edge,
      sourceHandle: flowsDown ? "bottom" : "top",
      targetHandle: flowsDown ? "top" : "bottom",
    };
  });

const estimatedNodeHeight = (
  node: Node<WorkflowNodeData>,
  fallback: number
) => {
  if (node.measured?.height) {
    return node.measured.height;
  }
  if (node.height) {
    return node.height;
  }
  return node.data.wide ? fallback * 2.4 : fallback;
};

const mobileStackedNodeX = () => WORKFLOW_MOBILE_HORIZONTAL_PAD;

/** Rough single-column positions before React Flow measures node DOM sizes. */
export const estimateMobileStackedNodes = (
  nodes: Node<WorkflowNodeData>[],
  originY: number,
  estimatedRowHeight: number
): Node<WorkflowNodeData>[] => {
  let y = originY;
  return sortByStep(nodes).map((node) => {
    const position = {
      x: mobileStackedNodeX(),
      y,
    };
    const height = estimatedNodeHeight(node, estimatedRowHeight);
    y += height + WORKFLOW_MOBILE_STACK_GAP;
    return { ...node, position };
  });
};

/** Reflow stack using measured widths/heights and center within the canvas. */
export const measureMobileStackedNodes = (
  nodes: Node<WorkflowNodeData>[],
  _canvasWidth: number,
  originY: number,
  fallbackRowHeight: number
): Node<WorkflowNodeData>[] => {
  let y = originY;

  return sortByStep(nodes).map((node) => {
    const height = estimatedNodeHeight(node, fallbackRowHeight);
    const x = mobileStackedNodeX();
    const positioned = { ...node, position: { x, y } };
    y += height + WORKFLOW_MOBILE_STACK_GAP;
    return positioned;
  });
};

export const mobileStackPositionsChanged = (
  current: Node<WorkflowNodeData>[],
  next: Node<WorkflowNodeData>[]
) => {
  const currentById = new Map(current.map((node) => [node.id, node]));
  return next.some((node) => {
    const prev = currentById.get(node.id);
    if (!prev) {
      return true;
    }
    return (
      prev.position.x !== node.position.x || prev.position.y !== node.position.y
    );
  });
};
