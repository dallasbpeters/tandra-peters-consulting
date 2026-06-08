import {
  Background,
  BackgroundVariant,
  getNodesBounds,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import "../styles/workflow-page.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContactBanner } from "../components/ContactBanner";
import { SitePageChrome } from "../components/SitePageChrome";
import { useIsMobile } from "../hooks/isMobile";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityWorkflowPage } from "../hooks/useSanityWorkflowPage";
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

const measureCanvasHeight = (
  bounds: ReturnType<typeof getNodesBounds>,
  viewportZoom: number,
  viewportAnchorY: number,
  anchorY: number,
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

const isWorkflowHandleId = (value: string | null | undefined): value is WorkflowHandleId =>
  value === "top" || value === "bottom" || value === "left" || value === "right";

const WorkflowStepNode = ({ id, data }: NodeProps<Node<WorkflowNodeData>>) => {
  const edges = useStore((state) => state.edges);

  const { sourceHandles, targetHandles } = useMemo(() => {
    const source = new Set<WorkflowHandleId>();
    const target = new Set<WorkflowHandleId>();

    for (const edge of edges) {
      if (edge.source === id && isWorkflowHandleId(edge.sourceHandle)) {
        source.add(edge.sourceHandle);
      }
      if (edge.target === id && isWorkflowHandleId(edge.targetHandle)) {
        target.add(edge.targetHandle);
      }
    }

    return { sourceHandles: source, targetHandles: target };
  }, [edges, id]);

  return (
    <div className={`workflow-node${data.wide ? " workflow-node--wide" : ""}`}>
      <h3 className="workflow-node__title">{data.title}</h3>
      <p className="workflow-node__body">{data.body}</p>
      {data.subsections?.map((section) => (
        <div key={section.title}>
          <h4 className="workflow-node__subtitle">{section.title}</h4>
          <p className="workflow-node__body">{section.body}</p>
        </div>
      ))}
      {[...sourceHandles].map((handleId) => (
        <Handle
          key={`source-${handleId}`}
          id={handleId}
          type="source"
          position={WORKFLOW_HANDLE_POSITION[handleId]}
          className="workflow-node__handle workflow-node__handle--source"
        />
      ))}
      {[...targetHandles].map((handleId) => (
        <Handle
          key={`target-${handleId}`}
          id={handleId}
          type="target"
          position={WORKFLOW_HANDLE_POSITION[handleId]}
          className="workflow-node__handle workflow-node__handle--target"
        />
      ))}
    </div>
  );
};

const nodeTypes = { workflowStep: WorkflowStepNode };

type InsuranceWorkflowDiagramProps = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  viewportZoom: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  originX: number;
  originY: number;
  estimatedNodeHeight: number;
  remountKey: string;
};

type DiagramLayoutProps = {
  isMobile: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  viewportZoom: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  originX: number;
  originY: number;
  estimatedNodeHeight: number;
  onCanvasHeight: (height: number) => void;
};

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
    if (!nodeList.length) return;

    const canvasWidth = canvasRef.current?.clientWidth ?? 0;
    const zoom = isMobile ? WORKFLOW_MOBILE_ZOOM : viewportZoom;

    let layoutNodes = nodeList;
    if (isMobile && canvasWidth > 0) {
      const stacked = measureMobileStackedNodes(
        nodeList,
        canvasWidth,
        originY,
        estimatedNodeHeight,
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
    if (!nodesInitialized) return;
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
  const canvasRef = useRef<HTMLDivElement>(null);

  const layoutNodes = useMemo(
    () =>
      isMobile
        ? estimateMobileStackedNodes(desktopNodes, originY, estimatedNodeHeight)
        : desktopNodes,
    [desktopNodes, estimatedNodeHeight, isMobile, originY],
  );

  const layoutEdges = useMemo(
    () => (isMobile ? remapWorkflowEdgesForVerticalStack(desktopEdges) : desktopEdges),
    [desktopEdges, isMobile],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const activeZoom = isMobile ? WORKFLOW_MOBILE_ZOOM : viewportZoom;

  const [canvasHeight, setCanvasHeight] = useState(() =>
    measureCanvasHeight(getNodesBounds(layoutNodes), activeZoom, viewportAnchorY, originY),
  );

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutEdges, layoutNodes, setEdges, setNodes]);

  return (
    <div
      ref={canvasRef}
      className="workflow-page__canvas"
      style={{ height: canvasHeight }}
      aria-label="Insurance claim workflow diagram"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        minZoom={activeZoom}
        maxZoom={isMobile ? WORKFLOW_MOBILE_ZOOM : 1.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        selectionOnDrag={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#c8c8c4" variant={BackgroundVariant.Lines} />
        <WorkflowDiagramLayout
          isMobile={isMobile}
          canvasRef={canvasRef}
          viewportZoom={viewportZoom}
          viewportAnchorX={viewportAnchorX}
          viewportAnchorY={viewportAnchorY}
          originX={originX}
          originY={originY}
          estimatedNodeHeight={estimatedNodeHeight}
          onCanvasHeight={setCanvasHeight}
        />
      </ReactFlow>
    </div>
  );
};

const InsuranceWorkflowDiagram = (props: InsuranceWorkflowDiagramProps) => {
  const isMobile = useIsMobile(768);

  return (
    <ReactFlowProvider key={`${props.remountKey}-${isMobile ? "stack" : "grid"}`}>
      <InsuranceWorkflowDiagramInner {...props} />
    </ReactFlowProvider>
  );
};

export const WorkflowPage = () => {
  const { page, loading } = useSanityWorkflowPage();
  const copy = mapWorkflowPageCopy(page);
  const diagram = mapWorkflowDiagram(page);

  usePageMetadata({
    title: copy.seoTitle,
    description: copy.seoDescription,
  });

  return (
    <SitePageChrome>
      <>
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
            <ContactBanner />
          </>
        )}
      </>
    </SitePageChrome>
  );
};
