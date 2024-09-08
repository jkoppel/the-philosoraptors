import React, { useRef, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Sidebar from "./sidebar";
import { DnDProvider, useDnD } from "./context";
import { ModuleGraph } from "@/backend/types";
import { convertModuleGraphToReactFlow } from "@/lib/utils";

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = ({
  initialNodes,
  initialEdges,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
}) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      // check if the dropped element is valid
      if (!type) {
        return;
      }

      // project was renamed to screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type]
  );

  return (
    <div className="dndflow" style={{ width: "50vw", height: "50vh" }}>
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
        </ReactFlow>
      </div>
      <Sidebar />
    </div>
  );
};

export default ({ graph }: { graph: ModuleGraph }) => {
  const { nodes, edges } = convertModuleGraphToReactFlow(graph);
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow initialNodes={nodes} initialEdges={edges} />
      </DnDProvider>
    </ReactFlowProvider>
  );
};
