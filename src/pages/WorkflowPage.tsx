import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionLineType,
  ConnectionMode,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "../styles/workflow-page.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContactBanner } from "../components/ContactBanner";
import { SitePageChrome } from "../components/SitePageChrome";
import { useIsMobile } from "../hooks/isMobile";
import { useOptionalGoogleAuthGate } from "../hooks/useGoogleAuthGate";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityWorkflowPage } from "../hooks/useSanityWorkflowPage";
import {
  CONTACT_BANNER_FREE_INSPECTION,
  CONTACT_BANNER_WORKFLOW_FAQ,
} from "../lib/contactBannerPresets";
import {
  estimateMobileStackedNodes,
  measureMobileStackedNodes,
  mobileStackPositionsChanged,
  remapWorkflowEdgesForVerticalStack,
  WORKFLOW_MOBILE_HORIZONTAL_PAD,
} from "../lib/workflowMobileLayout";
import {
  mapWorkflowDiagram,
  mapWorkflowPageCopy,
  type WorkflowNodeData,
} from "../sanity/mapSanityWorkflow";

const WORKFLOW_CANVAS_BOTTOM_PAD = 64;
const WORKFLOW_MOBILE_ZOOM = 1;

type SaveStatus = "idle" | "saving" | "saved" | "error";
type WorkflowEditorState =
  | {
      kind: "edge";
      edgeId: string;
      label: string;
    }
  | {
      kind: "node";
      nodeId: string;
      title: string;
      body: string;
    };

interface BoundsRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

const measureCanvasHeight = (
  bounds: BoundsRect,
  viewportZoom: number,
  viewportAnchorY: number,
  anchorY: number
) =>
  viewportAnchorY +
  (bounds.y + bounds.height - anchorY) * viewportZoom +
  WORKFLOW_CANVAS_BOTTOM_PAD;

type WorkflowHandleId = "top" | "bottom" | "left" | "right";

const WORKFLOW_HANDLE_POSITION: Record<WorkflowHandleId, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

const WORKFLOW_HANDLE_IDS: WorkflowHandleId[] = [
  "top",
  "right",
  "bottom",
  "left",
];
const isWorkflowHandleId = (
  value: string | null | undefined
): value is WorkflowHandleId =>
  value === "top" ||
  value === "bottom" ||
  value === "left" ||
  value === "right";

const WorkflowStepNode = ({ id, data }: NodeProps<Node<WorkflowNodeData>>) => {
  const edges = useStore((state) => state.edges);
  const isEditMode = useStore((state) => state.nodesConnectable);
  const updateNodeInternals = useUpdateNodeInternals();

  const sourceHandles = useMemo(() => {
    if (isEditMode) {
      return WORKFLOW_HANDLE_IDS;
    }

    const handles = new Set<WorkflowHandleId>();
    for (const edge of edges) {
      if (edge.source === id && isWorkflowHandleId(edge.sourceHandle)) {
        handles.add(edge.sourceHandle);
      }
    }

    return [...handles];
  }, [edges, id, isEditMode]);

  const targetHandles = useMemo(() => {
    if (isEditMode) {
      return WORKFLOW_HANDLE_IDS;
    }

    const handles = new Set<WorkflowHandleId>();
    for (const edge of edges) {
      if (edge.target === id && isWorkflowHandleId(edge.targetHandle)) {
        handles.add(edge.targetHandle);
      }
    }

    return [...handles];
  }, [edges, id, isEditMode]);

  // ReactFlow measures a node's handles when it mounts. Toggling edit mode (or
  // adding an edge) changes which handles render on an already-mounted node, and
  // those new handles stay unregistered — so connections can't start from them
  // and new edges fail with "Couldn't create edge" (error #008). Re-measure
  // whenever the rendered handle set changes.
  const _sourceHandleKey = sourceHandles.join(",");
  const _targetHandleKey = targetHandles.join(",");
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);

  return (
    <div className={`workflow-node${data.wide ? "workflow-node--wide" : ""}`}>
      <h3 className="workflow-node__title">{data.title}</h3>
      <p className="workflow-node__body">{data.body}</p>
      {data.subsections?.map((section) => (
        <div key={section.title}>
          <h4 className="workflow-node__subtitle">{section.title}</h4>
          <p className="workflow-node__body">{section.body}</p>
        </div>
      ))}
      {sourceHandles.map((handleId) => (
        <Handle
          className="workflow-node__handle workflow-node__handle--source"
          id={handleId}
          key={`source-${handleId}`}
          position={WORKFLOW_HANDLE_POSITION[handleId]}
          type="source"
        />
      ))}
      {targetHandles.map((handleId) => (
        <Handle
          className="workflow-node__handle workflow-node__handle--target"
          id={handleId}
          key={`target-${handleId}`}
          position={WORKFLOW_HANDLE_POSITION[handleId]}
          type="target"
        />
      ))}
    </div>
  );
};

const nodeTypes = { workflowStep: WorkflowStepNode };

interface InsuranceWorkflowDiagramProps {
  edges: Edge[];
  estimatedNodeHeight: number;
  nodes: Node<WorkflowNodeData>[];
  originX: number;
  originY: number;
  remountKey: string;
  viewportAnchorX: number;
  viewportAnchorY: number;
  viewportZoom: number;
}

interface DiagramLayoutProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  estimatedNodeHeight: number;
  isMobile: boolean;
  onCanvasHeight: (height: number) => void;
  originX: number;
  originY: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  viewportZoom: number;
}

/** Runs inside ReactFlowProvider — syncs viewport + canvas height after nodes measure. */
const WorkflowDiagramLayout = ({
  isMobile,
  canvasRef,
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  originX,
  originY,
  estimatedNodeHeight,
  onCanvasHeight,
}: DiagramLayoutProps) => {
  const {
    getNodes,
    getNodesBounds: getMeasuredNodesBounds,
    setNodes,
    setViewport,
  } = useReactFlow<Node<WorkflowNodeData>, Edge>();
  const nodesInitialized = useNodesInitialized();

  const syncLayout = useCallback(() => {
    const nodeList = getNodes();
    if (!nodeList.length) {
      return;
    }

    const canvasWidth = canvasRef.current?.clientWidth ?? 0;
    const zoom = isMobile ? WORKFLOW_MOBILE_ZOOM : viewportZoom;

    let layoutNodes = nodeList;
    if (isMobile && canvasWidth > 0) {
      const stacked = measureMobileStackedNodes(
        nodeList,
        canvasWidth,
        originY,
        estimatedNodeHeight
      );
      if (mobileStackPositionsChanged(nodeList, stacked)) {
        setNodes(stacked);
      }
      layoutNodes = stacked;
    }

    const anchor = layoutNodes.find((node) => node.id === "1");
    const anchorY = anchor?.position.y ?? originY;
    const bounds = getMeasuredNodesBounds(layoutNodes);

    onCanvasHeight(measureCanvasHeight(bounds, zoom, viewportAnchorY, anchorY));

    setViewport({
      x: isMobile
        ? WORKFLOW_MOBILE_HORIZONTAL_PAD - bounds.x * zoom
        : viewportAnchorX - originX * zoom,
      y: viewportAnchorY - anchorY * zoom,
      zoom,
    });
  }, [
    canvasRef,
    estimatedNodeHeight,
    getMeasuredNodesBounds,
    getNodes,
    isMobile,
    onCanvasHeight,
    originX,
    originY,
    setNodes,
    setViewport,
    viewportAnchorX,
    viewportAnchorY,
    viewportZoom,
  ]);

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }
    syncLayout();
    requestAnimationFrame(syncLayout);
  }, [nodesInitialized, syncLayout]);

  useEffect(() => {
    const handleResize = () => syncLayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncLayout]);

  return null;
};

const InsuranceWorkflowDiagramInner = ({
  nodes: desktopNodes,
  edges: desktopEdges,
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  originX,
  originY,
  estimatedNodeHeight,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
}: InsuranceWorkflowDiagramProps) => {
  const isMobile = useIsMobile(768);
  const auth = useOptionalGoogleAuthGate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { getNodesBounds: getMeasuredNodesBounds } = useReactFlow<
    Node<WorkflowNodeData>,
    Edge
  >();

  const layoutNodes = useMemo(
    () =>
      isMobile
        ? estimateMobileStackedNodes(desktopNodes, originY, estimatedNodeHeight)
        : desktopNodes,
    [desktopNodes, estimatedNodeHeight, isMobile, originY]
  );

  const layoutEdges = useMemo(
    () =>
      isMobile
        ? remapWorkflowEdgesForVerticalStack(desktopEdges)
        : desktopEdges,
    [desktopEdges, isMobile]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const activeZoom = isMobile ? WORKFLOW_MOBILE_ZOOM : viewportZoom;
  const canEditWorkflow = Boolean(auth?.isAuthenticated) && !isMobile;
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editor, setEditor] = useState<WorkflowEditorState | null>(null);
  const selectedNodeIds = useMemo(
    () => nodes.filter((node) => node.selected).map((node) => node.id),
    [nodes]
  );

  const [canvasHeight, setCanvasHeight] = useState(() =>
    measureCanvasHeight(
      getMeasuredNodesBounds(layoutNodes),
      activeZoom,
      viewportAnchorY,
      originY
    )
  );

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setSaveStatus("idle");
    setSaveMessage(null);
  }, []);

  const openEdgeEditor = useCallback((edge: Edge) => {
    setEditor({
      kind: "edge",
      edgeId: edge.id,
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
        kind: "node",
        nodeId,
        title: node.data.title,
        body: node.data.body,
      });
    },
    [nodes]
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
  }, []);

  const saveEditor = useCallback(() => {
    if (!editor) {
      return;
    }

    if (editor.kind === "edge") {
      setEdges((existingEdges) =>
        existingEdges.map((existingEdge) =>
          existingEdge.id === editor.edgeId
            ? {
                ...existingEdge,
                label: editor.label.trim() || "Connection",
                labelShowBg: true,
                labelBgPadding: [8, 6],
                labelBgBorderRadius: 6,
              }
            : existingEdge
        )
      );
      markDirty();
      closeEditor();
      return;
    }

    setNodes((existingNodes) =>
      existingNodes.map((existingNode) =>
        existingNode.id === editor.nodeId
          ? {
              ...existingNode,
              data: {
                ...existingNode.data,
                title: editor.title.trim() || existingNode.data.title,
                body: editor.body.trim() || existingNode.data.body,
              },
            }
          : existingNode
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

      setEdges((existingEdges) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            label: "Connection",
            animated: false,
            labelShowBg: true,
            labelBgPadding: [8, 6],
            labelBgBorderRadius: 6,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#8156f6",
            },
          },
          existingEdges
        )
      );
      markDirty();
      setEditor({
        kind: "edge",
        edgeId,
        label: "Connection",
      });
    },
    [isEditMode, markDirty, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!isEditMode) {
        return;
      }

      setEdges((existingEdges) =>
        reconnectEdge(
          {
            ...oldEdge,
            animated: false,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#8156f6",
            },
            labelShowBg: true,
            labelBgPadding: [8, 6],
            labelBgBorderRadius: 6,
          },
          newConnection,
          existingEdges
        )
      );
      markDirty();
    },
    [isEditMode, markDirty, setEdges]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (!isEditMode) {
        return;
      }

      openEdgeEditor(edge);
    },
    [isEditMode, openEdgeEditor]
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (!isEditMode) {
        return;
      }

      openNodeEditor(node.id);
    },
    [isEditMode, openNodeEditor]
  );

  const removeSelectedNodes = useCallback(() => {
    if (!isEditMode || selectedNodeIds.length === 0) {
      return;
    }

    const removed = new Set(selectedNodeIds);
    setNodes((existingNodes) =>
      existingNodes.filter((node) => !removed.has(node.id))
    );
    setEdges((existingEdges) => {
      const kept = existingEdges.filter(
        (edge) => !(removed.has(edge.source) || removed.has(edge.target))
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
          !kept.some((edge) => edge.id === current.edgeId)
        ) {
          return null;
        }
        return current;
      });

      return kept;
    });
    markDirty();
  }, [isEditMode, markDirty, selectedNodeIds, setEdges, setNodes]);

  const handleNodesChange = useCallback<typeof onNodesChange>(
    (changes) => {
      onNodesChange(changes);
      if (isEditMode && changes.some((change) => change.type !== "select")) {
        markDirty();
      }

      if (changes.some((change) => change.type === "remove")) {
        const removedNodeIds = new Set(
          changes
            .filter((change) => change.type === "remove")
            .map((change) => change.id)
        );

        setEditor((current) =>
          current?.kind === "node" && removedNodeIds.has(current.nodeId)
            ? null
            : current
        );
      }
    },
    [isEditMode, markDirty, onNodesChange]
  );

  const handleEdgesChange = useCallback<typeof onEdgesChange>(
    (changes) => {
      onEdgesChange(changes);
      if (isEditMode && changes.some((change) => change.type !== "select")) {
        markDirty();
      }

      if (changes.some((change) => change.type === "remove")) {
        const removedEdgeIds = new Set(
          changes
            .filter((change) => change.type === "remove")
            .map((change) => change.id)
        );
        setEditor((current) =>
          current?.kind === "edge" && removedEdgeIds.has(current.edgeId)
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

    if (!auth?.token) {
      setSaveStatus("error");
      setSaveMessage("Sign in with Google to save workflow edits.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage(null);

    try {
      const response = await fetch("/api/workflow-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          nodes: nodes.map((node) => ({
            stepId: node.id,
            title: node.data.title,
            body: node.data.body,
            wide: node.data.wide === true,
            subsections: node.data.subsections ?? [],
            posX: node.position.x,
            posY: node.position.y,
          })),
          edges: edges.map((edge) => ({
            edgeId: edge.id,
            sourceStep: edge.source,
            targetStep: edge.target,
            sourceHandle: edge.sourceHandle ?? "right",
            targetHandle: edge.targetHandle ?? "left",
            label: typeof edge.label === "string" ? edge.label : "",
          })),
        }),
      });

      const raw = await response.text();
      const payload = (() => {
        try {
          return raw ? (JSON.parse(raw) as { error?: string }) : null;
        } catch {
          return null;
        }
      })();

      if (!response.ok) {
        const fallbackDetail = raw.trim();
        throw new Error(
          payload?.error ||
            (fallbackDetail
              ? `Could not save workflow to Sanity (${response.status}): ${fallbackDetail.slice(0, 180)}`
              : `Could not save workflow to Sanity (${response.status}).`)
        );
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
  }, [auth?.token, canEditWorkflow, edges, isEditMode, nodes]);

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

  return (
    <section
      aria-label="Insurance claim workflow diagram"
      className={`workflow-page__canvas${isEditMode ? "workflow-page__canvas--edit" : ""}`}
      ref={canvasRef}
      style={{ height: canvasHeight }}
    >
      {!isMobile && canEditWorkflow ? (
        <div className="workflow-page__edit-controls">
          <button
            aria-pressed={isEditMode}
            className="workflow-page__edit-toggle"
            onClick={() => setIsEditMode((current) => !current)}
            type="button"
          >
            {isEditMode ? "Editing on" : "Editing off"}
          </button>
          {isEditMode ? (
            <>
              <button
                className="workflow-page__save"
                disabled={saveStatus === "saving" || !hasUnsavedChanges}
                onClick={() => {
                  saveWorkflow();
                }}
                type="button"
              >
                {saveStatus === "saving" ? "Saving…" : "Save changes"}
              </button>
              <button
                className="workflow-page__remove-node"
                disabled={selectedNodeIds.length === 0}
                onClick={removeSelectedNodes}
                type="button"
              >
                Remove selected node
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {isEditMode && saveMessage ? (
        <p
          className={`workflow-page__save-status workflow-page__save-status--${saveStatus}`}
          role={saveStatus === "error" ? "alert" : undefined}
        >
          {saveMessage}
        </p>
      ) : null}
      {isEditMode && editor ? (
        <section
          aria-modal="false"
          className="workflow-page__editor-popover"
          role="dialog"
        >
          <h2 className="workflow-page__editor-title">
            {editor.kind === "edge"
              ? "Edit connection label"
              : "Edit workflow step"}
          </h2>

          {editor.kind === "edge" ? (
            <label className="workflow-page__editor-field">
              Label
              <input
                autoFocus
                className="workflow-page__editor-input"
                id="workflow-edge-label"
                name="workflow-edge-label"
                onChange={(event) =>
                  setEditor((current) =>
                    current?.kind === "edge"
                      ? { ...current, label: event.target.value }
                      : current
                  )
                }
                placeholder="Connection label"
                value={editor.label}
              />
            </label>
          ) : (
            <>
              <label className="workflow-page__editor-field">
                Title
                <input
                  autoFocus
                  className="workflow-page__editor-input"
                  id="workflow-step-title"
                  name="workflow-step-title"
                  onChange={(event) =>
                    setEditor((current) =>
                      current?.kind === "node"
                        ? { ...current, title: event.target.value }
                        : current
                    )
                  }
                  placeholder="Step title"
                  value={editor.title}
                />
              </label>
              <label className="workflow-page__editor-field">
                Body
                <textarea
                  className="workflow-page__editor-textarea"
                  id="workflow-step-body"
                  name="workflow-step-body"
                  onChange={(event) =>
                    setEditor((current) =>
                      current?.kind === "node"
                        ? { ...current, body: event.target.value }
                        : current
                    )
                  }
                  placeholder="Step details"
                  rows={5}
                  value={editor.body}
                />
              </label>
            </>
          )}

          <div className="workflow-page__editor-actions">
            <button
              className="workflow-page__editor-button"
              onClick={saveEditor}
              type="button"
            >
              Apply
            </button>
            <button
              className="workflow-page__editor-button workflow-page__editor-button--ghost"
              onClick={closeEditor}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
      {isMobile ? null : (
        <p aria-hidden className="workflow-page__pan-hint">
          {isEditMode ? (
            <>
              Edit mode: drag nodes or connect handles. Hold <kbd>Space</kbd>{" "}
              and drag to pan.
            </>
          ) : (
            <>
              Tip: Hold <kbd>Space</kbd> and drag to pan
              {canEditWorkflow
                ? " — enable editing to move and reconnect steps."
                : ""}
            </>
          )}
        </p>
      )}
      <ReactFlow
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={isEditMode ? ["Backspace", "Delete"] : null}
        edges={edges}
        edgesFocusable={isEditMode}
        edgesReconnectable={isEditMode}
        elementsSelectable={isEditMode}
        maxZoom={isMobile ? WORKFLOW_MOBILE_ZOOM : 1.1}
        minZoom={activeZoom}
        nodes={nodes}
        nodesConnectable={isEditMode}
        nodesDraggable={isEditMode}
        nodesFocusable={isEditMode}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgesChange={handleEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodesChange={handleNodesChange}
        onReconnect={onReconnect}
        panActivationKeyCode="Space"
        panOnDrag={!(isMobile || isEditMode)}
        panOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag={false}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
      >
        <Background
          color="#c8c8c4"
          gap={16}
          size={1}
          variant={BackgroundVariant.Lines}
        />
        <WorkflowDiagramLayout
          canvasRef={canvasRef}
          estimatedNodeHeight={estimatedNodeHeight}
          isMobile={isMobile}
          onCanvasHeight={setCanvasHeight}
          originX={originX}
          originY={originY}
          viewportAnchorX={viewportAnchorX}
          viewportAnchorY={viewportAnchorY}
          viewportZoom={viewportZoom}
        />
      </ReactFlow>
    </section>
  );
};

const InsuranceWorkflowDiagram = (props: InsuranceWorkflowDiagramProps) => {
  const isMobile = useIsMobile(768);

  return (
    <ReactFlowProvider
      key={`${props.remountKey}-${isMobile ? "stack" : "grid"}`}
    >
      <InsuranceWorkflowDiagramInner {...props} />
    </ReactFlowProvider>
  );
};

export const WorkflowPage = () => {
  const { page, loading } = useSanityWorkflowPage();
  const copy = useMemo(() => mapWorkflowPageCopy(page), [page]);
  const diagram = useMemo(() => mapWorkflowDiagram(page), [page]);
  usePageMetadata({
    title: copy.seoTitle,
    description: copy.seoDescription,
  });

  return (
    <SitePageChrome>
      <header className="workflow-page__intro">
        <h1 className="workflow-page__title">{copy.pageTitle}</h1>
        <p className="workflow-page__lede">{copy.pageLede}</p>
      </header>
      {loading && !page ? (
        <p className="workflow-page__lede" style={{ textAlign: "center" }}>
          Loading workflow…
        </p>
      ) : (
        <>
          <InsuranceWorkflowDiagram {...diagram} />
          <ContactBanner {...CONTACT_BANNER_WORKFLOW_FAQ} />
          <ContactBanner {...CONTACT_BANNER_FREE_INSPECTION} />
        </>
      )}
    </SitePageChrome>
  );
};
