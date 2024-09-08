import path from 'path';


import { db } from './db/conn';
import { ReflexionModel, FileDependencyMap, ModuleGraph, ModuleName, ModulesDefinition } from './types';
import { getFileDependencyGraph, getRepoById, getRepoByName } from './db/queries';
import { z } from 'zod';
import { getAllFiles, getFileTree, getReadme, renderFileTree } from './repos/fileStructure';
import { easyRunLlmValidated } from './llm/execution';


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


 const promptModuleNames = `
   You are an expert software engineer. Your ability to distill complex concepts into simple explanations is remarkable.
   You are able to easily look at complex systems and understand the components.
   You are a proficient mentor and teacher.

   You are to be given the file tree for a repo, and will be asked to group the files into high-level modules.
   Choose a categorization that makes the most sense for the repo. The files within a module should be those that are most closely related.
   They should have high cohesion and call each other more than they call other files outside of their module.

   Here is the README for the repo:
   {readme}

   Here is the file tree for the repo:
   {fileTree}

   Include only *.ts and *.tsx files in the file tree.
 ` as const;

 const zodModuleNames = z.object({
  modules: z.array(z.object({
    name: z.string({ description: "The name of the module" }),
    files: z.array(z.string(), { description: "The files that are part of this module" }),
  })),
 });

 export type ModuleNamesResult = z.infer<typeof zodModuleNames>;

 export async function generateModuleNames(repoId: number): Promise<ModuleNamesResult> {
  const repoData = await getRepoById(repoId);
  const fileTree = await getFileTree(repoData!.id);
  const readme = await getReadme(repoData!.id);

  let output = await easyRunLlmValidated({
    prompt: promptModuleNames,
    zodParser: zodModuleNames,
  }, {
    readme: readme,
    fileTree: renderFileTree(fileTree),
  });

  const retryCount = 3;
  let unseenFiles: Set<string> = new Set();
  for (let i = 0; i < retryCount; i++) {
    unincludedFiles: {
      const allTsFiles = getAllFiles(fileTree, (file) => file.endsWith('.ts') || file.endsWith('.tsx'));
      unseenFiles = new Set(allTsFiles);
      for (const module of output.modules) {
        for (const file of module.files) {
          unseenFiles.delete(file);
        }
      }

      if (unseenFiles.size == 0) {
        break;
      }

      const correctionPrompt = `
        You are an expert software engineer. Your ability to distill complex concepts into simple explanations is remarkable.
        You are able to easily look at complex systems and understand the components.
        You are a proficient mentor and teacher.

        You are given a list of high-level modules for a repo and the corresponding files that are a conceptual part of each module.
        You will be given some files that are not included in any module.

        Please adjust the module names and file assignments so that all files are included in a module and only the files that are most closely related to each module are included in the module.
        Choose a categorization that makes the most sense for the repo. The files within a module should be those that are most closely related.
        They should have high cohesion and call each other more than they call other files outside of their module.

        Here is the list of modules and the files that are part of each module:
        {modules}

        Here is the list of files that are not included in any module:
        {unseenFiles}
      ` as const;

      output = await easyRunLlmValidated({
        prompt: correctionPrompt,
        zodParser: zodModuleNames,        
      }, {
        modules: output,
        unseenFiles: Array.from(unseenFiles).join('\n'),
      });
    }
  }

  if (unseenFiles.size > 0) {
    throw new Error(`generateModuleNames: Could not find modules for ${unseenFiles.size} files`);
  }

  return output;
}