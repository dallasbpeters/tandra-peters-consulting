import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from "@xyflow/react";
import {
  addEdge,
  MarkerType,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { WorkflowNodeData } from "../sanity/map-sanity-workflow";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type WorkflowEditorState =
  | { kind: "edge"; edgeId: string; label: string }
  | { kind: "node"; nodeId: string; title: string; body: string };

const EDGE_STYLE = {
  animated: false,
  labelBgBorderRadius: 6,
  labelBgPadding: [8, 6] as [number, number],
  labelShowBg: true,
  markerEnd: { color: "#8156f6", type: MarkerType.ArrowClosed },
  type: "smoothstep",
} as const;

const postWorkflowSave = async (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  token: string
): Promise<string | null> => {
  const response = await fetch("/api/workflow-save", {
    body: JSON.stringify({
      edges: edges.map((edge) => ({
        edgeId: edge.id,
        label: typeof edge.label === "string" ? edge.label : "",
        sourceHandle: edge.sourceHandle ?? "right",
        sourceStep: edge.source,
        targetHandle: edge.targetHandle ?? "left",
        targetStep: edge.target,
      })),
      nodes: nodes.map((node) => ({
        body: node.data.body,
        posX: node.position.x,
        posY: node.position.y,
        stepId: node.id,
        subsections: node.data.subsections ?? [],
        title: node.data.title,
        wide: node.data.wide === true,
      })),
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const raw = await response.text();
  if (response.ok) {
    return null;
  }
  let parsed: { error?: string } | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
  } catch {
    parsed = null;
  }
  const detail = raw.trim();
  return (
    parsed?.error ??
    (detail
      ? `Could not save workflow to Sanity (${response.status}): ${detail.slice(0, 180)}`
      : `Could not save workflow to Sanity (${response.status}).`)
  );
};

interface UseWorkflowEditorOptions {
  authToken: string | undefined;
  canEditWorkflow: boolean;
  layoutEdges: Edge[];
  layoutNodes: Node<WorkflowNodeData>[];
}

export const useWorkflowEditor = ({
  layoutNodes,
  layoutEdges,
  canEditWorkflow,
  authToken,
}: UseWorkflowEditorOptions) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editor, setEditor] = useState<WorkflowEditorState | null>(null);

  const selectedNodeIds = useMemo(
    () => nodes.filter((node) => node.selected).map((node) => node.id),
    [nodes]
  );

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setSaveStatus("idle");
    setSaveMessage(null);
  }, []);

  const openEdgeEditor = useCallback((edge: Edge) => {
    setEditor({
      edgeId: edge.id,
      kind: "edge",
      label: typeof edge.label === "string" ? edge.label : "",
    });
  }, []);

  const openNodeEditor = useCallback(
    (nodeId: string) => {
      const node = nodes.find((entry) => entry.id === nodeId);
      if (!node) {
        return;
      }
      setEditor({
        body: node.data.body,
        kind: "node",
        nodeId,
        title: node.data.title,
      });
    },
    [nodes]
  );

  const closeEditor = useCallback(() => setEditor(null), []);

  const saveEditor = useCallback(() => {
    if (!editor) {
      return;
    }
    if (editor.kind === "edge") {
      setEdges((prev) =>
        prev.map((e) =>
          e.id === editor.edgeId
            ? {
                ...e,
                ...EDGE_STYLE,
                label: editor.label.trim() || "Connection",
              }
            : e
        )
      );
      markDirty();
      closeEditor();
      return;
    }
    setNodes((prev) =>
      prev.map((n) =>
        n.id === editor.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                body: editor.body.trim() || n.data.body,
                title: editor.title.trim() || n.data.title,
              },
            }
          : n
      )
    );
    markDirty();
    closeEditor();
  }, [closeEditor, editor, markDirty, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isEditMode) {
        return;
      }
      const edgeId =
        connection.source && connection.target
          ? `${connection.source}-${connection.sourceHandle ?? "right"}-${connection.target}-${connection.targetHandle ?? "left"}-${Date.now()}`
          : `edge-${Date.now()}`;
      setEdges((prev) =>
        addEdge(
          { ...connection, ...EDGE_STYLE, id: edgeId, label: "Connection" },
          prev
        )
      );
      markDirty();
      setEditor({ edgeId, kind: "edge", label: "Connection" });
    },
    [isEditMode, markDirty, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!isEditMode) {
        return;
      }
      setEdges((prev) =>
        reconnectEdge({ ...oldEdge, ...EDGE_STYLE }, newConnection, prev)
      );
      markDirty();
    },
    [isEditMode, markDirty, setEdges]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (isEditMode) {
        openEdgeEditor(edge);
      }
    },
    [isEditMode, openEdgeEditor]
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (isEditMode) {
        openNodeEditor(node.id);
      }
    },
    [isEditMode, openNodeEditor]
  );

  const removeSelectedNodes = useCallback(() => {
    if (!isEditMode || selectedNodeIds.length === 0) {
      return;
    }
    const removed = new Set(selectedNodeIds);
    setNodes((prev) => prev.filter((n) => !removed.has(n.id)));
    setEdges((prev) => {
      const kept = prev.filter(
        (e) => !(removed.has(e.source) || removed.has(e.target))
      );
      setEditor((current) => {
        if (!current) {
          return null;
        }
        if (current.kind === "node" && removed.has(current.nodeId)) {
          return null;
        }
        if (
          current.kind === "edge" &&
          !kept.some((e) => e.id === current.edgeId)
        ) {
          return null;
        }
        return current;
      });
      return kept;
    });
    markDirty();
  }, [isEditMode, markDirty, selectedNodeIds, setEdges, setNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowNodeData>>[]) => {
      onNodesChange(changes);
      if (isEditMode && changes.some((c) => c.type !== "select")) {
        markDirty();
      }
      if (changes.some((c) => c.type === "remove")) {
        const removed = new Set(
          changes.filter((c) => c.type === "remove").map((c) => c.id)
        );
        setEditor((current) =>
          current?.kind === "node" && removed.has(current.nodeId)
            ? null
            : current
        );
      }
    },
    [isEditMode, markDirty, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);
      if (isEditMode && changes.some((c) => c.type !== "select")) {
        markDirty();
      }
      if (changes.some((c) => c.type === "remove")) {
        const removed = new Set(
          changes.filter((c) => c.type === "remove").map((c) => c.id)
        );
        setEditor((current) =>
          current?.kind === "edge" && removed.has(current.edgeId)
            ? null
            : current
        );
      }
    },
    [isEditMode, markDirty, onEdgesChange]
  );

  const saveWorkflow = useCallback(async () => {
    if (!(isEditMode && canEditWorkflow)) {
      return;
    }
    if (!authToken) {
      setSaveStatus("error");
      setSaveMessage("Sign in with Google to save workflow edits.");
      return;
    }
    setSaveStatus("saving");
    setSaveMessage(null);
    try {
      const errorMessage = await postWorkflowSave(nodes, edges, authToken);
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      setSaveMessage("Saved to Sanity.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Could not save workflow to Sanity."
      );
    }
  }, [authToken, canEditWorkflow, edges, isEditMode, nodes]);

  useEffect(() => {
    if (isEditMode || hasUnsavedChanges || saveStatus === "saved") {
      return;
    }
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    setHasUnsavedChanges(false);
    setSaveStatus("idle");
    setSaveMessage(null);
  }, [
    hasUnsavedChanges,
    isEditMode,
    layoutEdges,
    layoutNodes,
    saveStatus,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    if (!canEditWorkflow) {
      setIsEditMode(false);
    }
  }, [canEditWorkflow]);

  useEffect(() => {
    if (!isEditMode) {
      setEditor(null);
    }
  }, [isEditMode]);

  return {
    closeEditor,
    edges,
    editor,
    handleEdgesChange,
    handleNodesChange,
    hasUnsavedChanges,
    isEditMode,
    nodes,
    onConnect,
    onEdgeDoubleClick,
    onNodeDoubleClick,
    onReconnect,
    removeSelectedNodes,
    saveEditor,
    saveMessage,
    saveStatus,
    saveWorkflow,
    selectedNodeIds,
    setEditor,
    setIsEditMode,
  };
};
