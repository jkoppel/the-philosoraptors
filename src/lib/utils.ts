import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ModuleGraph, EdgeData, ModuleName } from "@/backend/types";
import { Node, Edge } from "@xyflow/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertModuleGraphToReactFlow(
  moduleGraph: ModuleGraph,
  correctnessInfo: { [key: ModuleName]: boolean } = {}
): { nodes: Node[]; edges: Edge<EdgeData>[] } {
  const nodes: Node[] = [];
  const edges: Edge<EdgeData>[] = [];
  let nodeId = 1;

  for (const [moduleName, dependencies] of Object.entries(moduleGraph)) {
    nodes.push({
      id: nodeId.toString(),
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { label: moduleName },
    });

    for (const dependency of dependencies) {
      const targetNodeId = (nodeId + 1).toString();
      edges.push({
        id: `e${nodeId}-${targetNodeId}`,
        source: nodeId.toString(),
        target: targetNodeId,
        type: "custom-edge",
        data: { correct: correctnessInfo[moduleName] },
      });
    }

    nodeId++;
  }

  return { nodes, edges };
}

export function convertReactFlowToModuleGraph(
  nodes: Node[],
  edges: Edge<EdgeData>[]
): ModuleGraph {
  const moduleGraph: ModuleGraph = {};

  // Create a mapping of node IDs to module names
  const idToModuleName = new Map(
    nodes.map((node) => [node.id, node.data.label])
  );

  // Initialize the module graph with empty dependency arrays
  nodes.forEach((node) => {
    moduleGraph[node.data.label] = [];
  });

  // Populate the dependencies
  edges.forEach((edge) => {
    const sourceModule = idToModuleName.get(edge.source);
    const targetModule = idToModuleName.get(edge.target);
    if (sourceModule && targetModule) {
      moduleGraph[sourceModule].push(targetModule);
    }
  });

  return moduleGraph;
}
