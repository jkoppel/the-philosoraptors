import path from 'path';


import { db } from './db/conn';
import { ReflexionModel, FileDependencyMap, ModuleGraph, ModuleName, ModulesDefinition } from './types';
import { getFileDependencyGraph, getRepoByName } from './db/queries';


/**************************************************
 ********** Reflexion model differencing **********
 **************************************************/


function createModuleGraph(fileDependencyMap: FileDependencyMap, modulesDefinition: ModulesDefinition): ModuleGraph {
  const moduleGraph: ModuleGraph = {};
  const fileToModuleMap: { [filePath: string]: ModuleName } = {};

  // Create a reverse mapping of file paths to module names
  for (const [moduleName, filePaths] of Object.entries(modulesDefinition.moduleMapping)) {
    for (const filePath of filePaths) {
      fileToModuleMap[filePath] = moduleName;
    }
  }

  // Iterate through the file dependency map
  for (const [filePath, dependencies] of Object.entries(fileDependencyMap.dependencies)) {
    const sourceModule = fileToModuleMap[filePath];
    if (!sourceModule) continue; // Skip if the file is not in any module

    for (const dependency of dependencies) {
      const resolvedPath = path.resolve(path.dirname(filePath), dependency);
      const targetModule = fileToModuleMap[resolvedPath];
      if (targetModule && targetModule !== sourceModule) {
        if (!moduleGraph[sourceModule]) {
          moduleGraph[sourceModule] = [];
        }
        if (!moduleGraph[sourceModule].includes(targetModule)) {
          moduleGraph[sourceModule].push(targetModule);
        }
      }
    }
  }

  return moduleGraph;
}

export function compareModuleGraphs(graph1: ModuleGraph, graph2: ModuleGraph): {
  addedEdges: [ModuleName, ModuleName][];
  removedEdges: [ModuleName, ModuleName][];
} {
  const addedEdges: [ModuleName, ModuleName][] = [];
  const removedEdges: [ModuleName, ModuleName][] = [];

  // Helper function to check if an edge exists in a graph
  const hasEdge = (graph: ModuleGraph, from: ModuleName, to: ModuleName) =>
    graph[from]?.includes(to) || false;

  // Iterate through all modules in graph1
  for (const [fromModule, toModules] of Object.entries(graph1)) {
    for (const toModule of toModules) {
      if (!hasEdge(graph2, fromModule, toModule)) {
        removedEdges.push([fromModule, toModule]);
      }
    }
  }

  // Iterate through all modules in graph2
  for (const [fromModule, toModules] of Object.entries(graph2)) {
    for (const toModule of toModules) {
      if (!hasEdge(graph1, fromModule, toModule)) {
        addedEdges.push([fromModule, toModule]);
      }
    }
  }

  return { addedEdges, removedEdges };
}

export async function compareReflexionModelWithActual(reflexionModel: ReflexionModel, repoName: string): Promise<{
  addedEdges: [string, string][];
  removedEdges: [string, string][];
}> {
  // Fetch the repo ID and import graph from the database
  const repoData = await getRepoByName(repoName);
  const fileDependencyMap = await getFileDependencyGraph(repoData.id);

  // Create the actual module graph from the file dependencies
  const actualModuleGraph: ModuleGraph = createModuleGraph(
    fileDependencyMap,
    reflexionModel.modulesDefinition
  );

  // Compare the actual module graph with the one from the reflexion model
  return compareModuleGraphs(reflexionModel.moduleGraph, actualModuleGraph);
}


/**************************************************
 ******* AI-generated "ground-truth" diagram ******
 **************************************************/
