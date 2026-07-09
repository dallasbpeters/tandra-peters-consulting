import type { Edge, Node, NodeProps } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "../styles/workflow-page.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContactBanner } from "../components/contact-banner";
import { SitePageChrome } from "../components/site-page-chrome";
import { WorkflowEditControls } from "../components/workflow-edit-controls";
import { WorkflowEditorPopover } from "../components/workflow-editor-popover";
import { useIsMobile } from "../hooks/is-mobile";
import { useOptionalGoogleAuthGate } from "../hooks/use-google-auth-gate";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityWorkflowPage } from "../hooks/use-sanity-workflow-page";
import { useWorkflowEditor } from "../hooks/use-workflow-editor";
import {
  CONTACT_BANNER_FREE_INSPECTION,
  CONTACT_BANNER_WORKFLOW_FAQ,
} from "../lib/contact-banner-presets";
import {
  estimateMobileStackedNodes,
  measureMobileStackedNodes,
  mobileStackPositionsChanged,
  remapWorkflowEdgesForVerticalStack,
  WORKFLOW_MOBILE_HORIZONTAL_PAD,
} from "../lib/workflow-mobile-layout";
import type { WorkflowNodeData } from "../sanity/map-sanity-workflow";
import {
  mapWorkflowDiagram,
  mapWorkflowPageCopy,
} from "../sanity/map-sanity-workflow";

const WORKFLOW_CANVAS_BOTTOM_PAD = 64;
const WORKFLOW_MOBILE_ZOOM = 1;

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
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
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

  // ReactFlow measures handles on mount; toggling edit mode adds new handles that
  // stay unregistered unless we re-trigger measurement (error #008).
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);

  return (
    <div
      className={
        data.wide ? "workflow-node workflow-node--wide" : "workflow-node"
      }
    >
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
  const { getNodesBounds, getNodes, setNodes, setViewport } = useReactFlow<
    Node<WorkflowNodeData>,
    Edge
  >();
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
    const bounds = getNodesBounds(layoutNodes);

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
    getNodes,
    getNodesBounds,
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
}: InsuranceWorkflowDiagramProps) => {
  const isMobile = useIsMobile(768);
  const auth = useOptionalGoogleAuthGate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { getNodesBounds } = useReactFlow<Node<WorkflowNodeData>, Edge>();

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

  const activeZoom = isMobile ? WORKFLOW_MOBILE_ZOOM : viewportZoom;
  const canEditWorkflow = Boolean(auth?.isAuthenticated) && !isMobile;

  const {
    nodes,
    edges,
    isEditMode,
    setIsEditMode,
    hasUnsavedChanges,
    saveStatus,
    saveMessage,
    editor,
    setEditor,
    selectedNodeIds,
    onConnect,
    onReconnect,
    onEdgeDoubleClick,
    onNodeDoubleClick,
    removeSelectedNodes,
    handleNodesChange,
    handleEdgesChange,
    saveWorkflow,
    closeEditor,
    saveEditor,
  } = useWorkflowEditor({
    authToken: auth?.token ?? undefined,
    canEditWorkflow,
    layoutEdges,
    layoutNodes,
  });

  const [canvasHeight, setCanvasHeight] = useState(() =>
    measureCanvasHeight(
      getNodesBounds(layoutNodes),
      activeZoom,
      viewportAnchorY,
      originY
    )
  );

  return (
    <section
      aria-label="Insurance claim workflow diagram"
      className={
        isEditMode
          ? "workflow-page__canvas workflow-page__canvas--edit"
          : "workflow-page__canvas"
      }
      ref={canvasRef}
      style={{ height: canvasHeight }}
    >
      {!isMobile && canEditWorkflow && (
        <WorkflowEditControls
          hasUnsavedChanges={hasUnsavedChanges}
          isEditMode={isEditMode}
          onRemoveSelected={removeSelectedNodes}
          onSave={saveWorkflow}
          onToggleEditMode={() => setIsEditMode((c) => !c)}
          saveStatus={saveStatus}
          selectedNodeIds={selectedNodeIds}
        />
      )}
      {isEditMode && saveMessage && (
        <p
          className={`workflow-page__save-status workflow-page__save-status--${saveStatus}`}
          role={saveStatus === "error" ? "alert" : undefined}
        >
          {saveMessage}
        </p>
      )}
      {isEditMode && editor && (
        <WorkflowEditorPopover
          editor={editor}
          onChange={setEditor}
          onClose={closeEditor}
          onSave={saveEditor}
        />
      )}
      {!isMobile && (
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
    description: copy.seoDescription,
    title: copy.seoTitle,
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
