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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import "../styles/workflow-page.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ContactBanner } from "../components/ContactBanner";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityWorkflowPage } from "../hooks/useSanityWorkflowPage";
import {
  mapWorkflowDiagram,
  mapWorkflowPageCopy,
  type WorkflowNodeData,
} from "../sanity/mapSanityWorkflow";

const WORKFLOW_CANVAS_BOTTOM_PAD = 48;

const measureCanvasHeight = (
  nodeList: Node<WorkflowNodeData>[],
  viewportZoom: number,
  viewportAnchorY: number,
  anchorY: number,
) => {
  const bounds = getNodesBounds(nodeList);
  return (
    viewportAnchorY +
    (bounds.y + bounds.height - anchorY) * viewportZoom +
    WORKFLOW_CANVAS_BOTTOM_PAD
  );
};

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
  remountKey: string;
};

type DiagramLayoutProps = {
  viewportZoom: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  originX: number;
  originY: number;
  onCanvasHeight: (height: number) => void;
};

/** Runs inside ReactFlowProvider — syncs viewport + canvas height after nodes measure. */
const WorkflowDiagramLayout = ({
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  originX,
  originY,
  onCanvasHeight,
}: DiagramLayoutProps) => {
  const { getNodes, setViewport } = useReactFlow<Node<WorkflowNodeData>, Edge>();
  const nodesInitialized = useNodesInitialized();

  const syncLayout = useCallback(() => {
    const nodeList = getNodes();
    if (!nodeList.length) return;

    const anchor = nodeList.find((node) => node.id === "1");
    const anchorY = anchor?.position.y ?? originY;

    onCanvasHeight(measureCanvasHeight(nodeList, viewportZoom, viewportAnchorY, anchorY));

    setViewport({
      x: viewportAnchorX - originX * viewportZoom,
      y: viewportAnchorY - anchorY * viewportZoom,
      zoom: viewportZoom,
    });
  }, [
    getNodes,
    onCanvasHeight,
    originX,
    originY,
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
  nodes: initialNodes,
  edges: initialEdges,
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  originX,
  originY,
}: InsuranceWorkflowDiagramProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [canvasHeight, setCanvasHeight] = useState(() =>
    measureCanvasHeight(initialNodes, viewportZoom, viewportAnchorY, originY),
  );

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<Node<WorkflowNodeData>, Edge>) => {
      requestAnimationFrame(() => {
        const nodeList = instance.getNodes();
        const anchor = nodeList.find((node) => node.id === "1");
        const anchorY = anchor?.position.y ?? originY;
        setCanvasHeight(measureCanvasHeight(nodeList, viewportZoom, viewportAnchorY, anchorY));
        instance.setViewport({
          x: viewportAnchorX - originX * viewportZoom,
          y: viewportAnchorY - anchorY * viewportZoom,
          zoom: viewportZoom,
        });
      });
    },
    [originX, originY, viewportAnchorX, viewportAnchorY, viewportZoom],
  );

  return (
    <div
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
        onInit={handleInit}
        minZoom={viewportZoom}
        maxZoom={1.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#c8c8c4" variant={BackgroundVariant.Lines} />
        <WorkflowDiagramLayout
          viewportZoom={viewportZoom}
          viewportAnchorX={viewportAnchorX}
          viewportAnchorY={viewportAnchorY}
          originX={originX}
          originY={originY}
          onCanvasHeight={setCanvasHeight}
        />
      </ReactFlow>
    </div>
  );
};

const InsuranceWorkflowDiagram = (props: InsuranceWorkflowDiagramProps) => (
  <ReactFlowProvider key={props.remountKey}>
    <InsuranceWorkflowDiagramInner {...props} />
  </ReactFlowProvider>
);

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
