import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import "../styles/workflow-page.css";

import { useCallback, useEffect } from "react";

import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityWorkflowPage } from "../hooks/useSanityWorkflowPage";
import {
  mapWorkflowDiagram,
  mapWorkflowPageCopy,
  type WorkflowNodeData,
} from "../sanity/mapSanityWorkflow";
import { layoutClass } from "../styles/layoutClasses";

const handleClass = "!w-2 !h-2 !border-0 !bg-transparent !opacity-0";

const WorkflowStepNode = ({ data }: NodeProps<Node<WorkflowNodeData>>) => (
  <div className={`workflow-node${data.wide ? " workflow-node--wide" : ""}`}>
    <h3 className="workflow-node__title">{data.title}</h3>
    <p className="workflow-node__body">{data.body}</p>
    {data.subsections?.map((section) => (
      <div key={section.title}>
        <h4 className="workflow-node__subtitle">{section.title}</h4>
        <p className="workflow-node__body">{section.body}</p>
      </div>
    ))}
    <Handle id="top" type="target" position={Position.Top} className={handleClass} />
    <Handle id="bottom" type="source" position={Position.Bottom} className={handleClass} />
    <Handle id="left" type="target" position={Position.Left} className={handleClass} />
    <Handle id="right" type="source" position={Position.Right} className={handleClass} />
  </div>
);

const nodeTypes = { workflowStep: WorkflowStepNode };

type InsuranceWorkflowDiagramProps = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  viewportZoom: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  originX: number;
  remountKey: string;
};

const InsuranceWorkflowDiagramInner = ({
  nodes: initialNodes,
  edges: initialEdges,
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  originX,
}: InsuranceWorkflowDiagramProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<Node<WorkflowNodeData>, Edge>) => {
      const alignToTopLeft = () => {
        const anchor = instance.getNode("1");
        if (!anchor) return;

        instance.setViewport({
          x: viewportAnchorX - anchor.position.x * viewportZoom,
          y: viewportAnchorY - anchor.position.y * viewportZoom,
          zoom: viewportZoom,
        });
      };

      requestAnimationFrame(() => {
        alignToTopLeft();
        requestAnimationFrame(alignToTopLeft);
      });
    },
    [viewportAnchorX, viewportAnchorY, viewportZoom],
  );

  return (
    <div className="workflow-page__canvas" aria-label="Insurance claim workflow diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={handleInit}
        defaultViewport={{
          x: viewportAnchorX - originX * viewportZoom,
          y: viewportAnchorY - 12 * viewportZoom,
          zoom: viewportZoom,
        }}
        minZoom={viewportZoom}
        maxZoom={1.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#c8c8c4" variant={BackgroundVariant.Lines} />
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
      <main className={`workflow-page ${layoutClass.pageMain} site-main-route`}>
        <header className="workflow-page__intro">
          <h1 className="workflow-page__title">{copy.pageTitle}</h1>
          <p className="workflow-page__lede">{copy.pageLede}</p>
        </header>
        {loading && !page ? (
          <p className="workflow-page__lede" style={{ textAlign: "center" }}>
            Loading workflow…
          </p>
        ) : (
          <InsuranceWorkflowDiagram {...diagram} />
        )}
      </main>
    </SitePageChrome>
  );
};
