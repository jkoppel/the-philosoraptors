import path from 'path';
import {globSync} from 'glob';


import { db } from './db/conn';
import { ReflexionModel, FileDependencyMap, ModuleGraph, ModuleName, ModulesDefinition } from './types';
import { getFileDependencyGraph, getRepoById, getRepoByName } from './db/queries';
import { z } from 'zod';
import { filterFileTree, getAllFiles, getFileTree, getReadme, isSubstantiveJsOrTsFile, renderFileTree } from './repos/fileStructure';
import { easyRunLlm, easyRunLlmValidated } from './llm/execution';


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


      /***
       * Old piece of prompt output: 

          For example, if you are given this directory structure:

          src/
            components/
              HomeView.tsx
              LoginForm.tsx
            pages/
              Home.tsx
              Login.tsx

          Then here is an example output:
       
         {{
    "thought": "I will put all files related to home in the home module. I will put all files related to login in the login module.",
    "modules": [
            {{
              "name": "home",
              "files": [
                {{
                  "path": "src/pages/Home.tsx",
                  "rationale": "This file is the entry point for the home page"
                }},
                {{
                  "path": "src/components/HomeView.tsx",
                  "rationale": "This file is the view for the home page"
                }}
              ]
            }},
            {{
              "name": "login",
              "files": [
                {{
                  "path": "src/pages/Login.tsx",
                }},
                {{
                  "path": "src/components/LoginForm.tsx",
                  "rationale": "This file is the form for the login page"
                }}
              ]
            }}
          ]
        }}

           DO NOT USE ANY OF THE ABOVE AS PART OF YOUR RESPONSE.
   DO NOT USE THE PRECEDING FILES.
   YOU WILL BE PUNISHED IF YOU DO.

   YOU WILL BE GIVEN THE REAL FILES LATER.
   BASE YOUR MODULE NAMES AND FILE ASSIGNMENTS ON THE REAL FILES. 
      * 
      */

 const promptModuleNames = `
   You are an expert software engineer. Your ability to distill complex concepts into simple explanations is remarkable.
   You are able to easily look at complex systems and understand the components.
   You are a proficient mentor and teacher.

   You are to be given the file tree for a repo, and will be asked to group the files into high-level modules.
   Choose a categorization that makes the most sense for the repo. The files within a module should be those that are most closely related.
   They should have high cohesion and call each other more than they call other files outside of their module.

   Here is the README for the repo:

   README:
   {readme}

   Here is the file tree for the repo:

   FILE TREE:
   {fileTree}

   Include only *.ts, *.tsx, *.js, and *.jsx files in the file tree.

   Format your output like this:

   ModuleName: <modulename1>
   Thought: <Reason for picking this module name and the files that are part of it>
   FilePaths: <filepath1>, <filepath2>, <filepath3>

   ModuleName: <modulename2>
   Thought: <Reason for picking this module name and the files that are part of it>
   FilePaths: <filepath4>, <filepath5>, <filepath6>

   ...
 ` as const;

 /*
 const zodModuleNames = z.object({
  thought: z.string({ description: "Your thought process as you generate the module names" }),
  modules: z.array(z.object({
    name: z.string({ description: "The name of the module" }),
    files: z.array(z.object({
      rationale: z.string({ description: "The rationale for why this file is part of this module" }),
      path: z.string(), 
    })),
  })),
 });

 export type ModuleNamesResult = z.infer<typeof zodModuleNames>;
 */
 export type ModuleNamesResult = {
  name: string;
  files: string[];
 }[];

const stripLeadingRepoName = (repoName: string, filePath: string) => {
  return filePath.replace(new RegExp(`^${repoName}/`)  , "").replace(new RegExp(`^${repoName}.git/`), "");
}

const parseModuleOutput = (repoName: string, rawOutput: string): ModuleNamesResult => {
  const segments = rawOutput.split('\n\n');
  const result: ModuleNamesResult = [];
  for (const segment of segments) {
    if (!segment.startsWith("ModuleName:")) {
      continue;
    }

    const lines = segment.split('\n');
    const name = lines[0].split(':')[1].trim();
    //const thought = lines[1].split(':')[1].trim();
    const filesPossiblyWithGlob = lines[2].split(':')[1].trim().split(',').map(file => file.trim());

    // Expand file paths that might contain glob patterns
    const files = filesPossiblyWithGlob.flatMap(filePath => {
      // If the file path contains a glob pattern, expand it
      if (filePath.includes('*')) {
        return globSync(filePath).map((path) => stripLeadingRepoName(repoName, path));
      }
      // Otherwise, return the file path as is
      return [stripLeadingRepoName(repoName, filePath)];
    });

    result.push({ name, files });
  }
  return result;
}

 export async function generateModuleNames(repoId: number): Promise<ModuleNamesResult> {
  const repoData = await getRepoById(repoId);
  const fileTree = filterFileTree(await getFileTree(repoData!.id), isSubstantiveJsOrTsFile)!;
  const readme = await getReadme(repoData!.id);

  let rawOutput = await easyRunLlm({
    prompt: promptModuleNames,
  }, {
    readme: readme,
    fileTree: renderFileTree(fileTree),
  });

  let output = parseModuleOutput(repoData!.name, rawOutput);

  const retryCount = 3;
  let unseenFiles: Set<string> = new Set();
  for (let i = 0; i < retryCount; i++) {
    unincludedFiles: {
      const allTsFiles = getAllFiles(fileTree, isSubstantiveJsOrTsFile).map(file => stripLeadingRepoName(repoData!.name, file));
      unseenFiles = new Set(allTsFiles);
      for (const module of output) {
        for (const file of module.files) {
          unseenFiles.delete(stripLeadingRepoName(repoData!.name, file));
        }
      }

      if (unseenFiles.size == 0) {
        break;
      }


      console.log("generateModuleNames: Retrying");
      console.log("seen files", allTsFiles.filter(file => !unseenFiles.has(file)));
      console.log("unseenFiles", unseenFiles);


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

        MODULES:
        {modules}

        Here is the list of files that are not included in any module:

        UNSEEN_FILES:
        {unseenFiles}


        Format your output like this:

        ModuleName: <modulename1>
        Thought: <Reason for picking this module name and the files that are part of it>
        FilePaths: <filepath1>, <filepath2>, <filepath3>

        ModuleName: <modulename2>
        Thought: <Reason for picking this module name and the files that are part of it>
        FilePaths: <filepath4>, <filepath5>, <filepath6>

        ...

        Only use the existing module names.
        Do not make up new module names.
        Do not include existing files.
        Only include the 
      ` as const;

      const rawCorrectedOutput = await easyRunLlm({
        prompt: correctionPrompt,
      }, {
        modules: JSON.stringify(output),
        unseenFiles: Array.from(unseenFiles).join('\n'),
      });

      const correctedOutput = parseModuleOutput(repoData!.name, rawCorrectedOutput);

      // merge correctedOutput into output
      for (const correctedModule of correctedOutput) {
        const existingModule = output.find(module => module.name === correctedModule.name);
        if (existingModule) {
          existingModule.files.push(...correctedModule.files);
        } else {
          // skip
        }
      }
    }
  }

  if (unseenFiles.size > 0) {
    throw new Error(`generateModuleNames: Could not find modules for ${unseenFiles.size} files`);
  }

  return output;
}