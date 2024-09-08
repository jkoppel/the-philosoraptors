import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ModuleGraph } from "@/backend/types";
import { Node, Edge } from "@xyflow/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertModuleGraphToReactFlow(moduleGraph: ModuleGraph): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
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
      });
    }

    nodeId++;
  }

  return { nodes, edges };
}
