import simpleGit from 'simple-git';
import { mkdtemp } from 'fs/promises';
import path from 'path';
import os from 'os';
import { Project } from 'ts-morph';

import { FileDependencyMap } from '../types';
import { insertFileDependencyGraph, insertRepo } from '../db/queries';

/**********************************************************************************/

/**************************************************
 ************ File dependency graph ***************
 **************************************************/

function getFileDependencies(directoryPath: string): FileDependencyMap {
  const project = new Project();
  project.addSourceFilesAtPaths(`${directoryPath}/**/*.{ts,tsx,js,jsx}`);

  const dependencies: { [filename: string]: string[] } = {};
  project.getSourceFiles().forEach(sourceFile => {
    const sourceFilePath = sourceFile.getFilePath();
    const filePath = path.relative(directoryPath, sourceFilePath);
    dependencies[filePath] = [];

    sourceFile.getImportDeclarations().forEach(importDeclaration => {
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      if (moduleSpecifier && !dependencies[filePath].includes(moduleSpecifier)) {
        const pathRelativeToFile = importDeclaration.getModuleSpecifierValue();
        const resolvedPath = path.resolve(path.join(path.dirname(sourceFilePath), pathRelativeToFile));

        const relativePath = path.relative(directoryPath, resolvedPath);
        console.log(relativePath);
        dependencies[filePath].push(relativePath);
      }
    });
  });

  return { dependencies };
}

async function saveFileDependencyMapToDB(repoId: number, directoryPath: string): Promise<void> {
  try {
    // Get the file dependencies
    const fileDependencyMap = getFileDependencies(directoryPath);

    // Insert or update the dependency map in the database
    await insertFileDependencyGraph(repoId, fileDependencyMap);

    console.log(`saveFileDependencyMapToDB: File dependency map saved to DB for directory: ${directoryPath}`);
  } catch (error) {
    console.error('saveFileDependencyMapToDB: Error saving file dependency map to DB:', error);
    throw error;
  }
}


/**************************************************
 ********************* Ingestion ******************
 **************************************************/


 export async function cloneRepoToTempDir(repoUrl: string): Promise<string> {
  try {
    // Create a temporary directory
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'repo-'));

    // Initialize simple-git
    const git = simpleGit();

    // Clone the repository to the temporary directory
    await git.clone(repoUrl, tempDir);

    console.log(`cloneRepoToTempDir: Repository cloned successfully to ${tempDir}`);
    return tempDir;
  } catch (error) {
    console.error('cloneRepoToTempDir: Error cloning repository:', error);
    throw error;
  }
}


export async function cloneAndSaveRepo(repoUrl: string, repoName: string): Promise<number> {
  try {
    // Clone the repository
    const localPath = await cloneRepoToTempDir(repoUrl);

    // Insert the repo record into the database
    const repoId = await insertRepo(repoName, localPath);

    console.log(`cloneAndSaveRepo: Repository ${repoName} cloned and saved with ID ${repoId}`);

    await saveFileDependencyMapToDB(repoId, localPath);
    console.log(`cloneAndSaveRepo: File dependency map saved to DB for directory: ${localPath}`);

    return repoId;
  } catch (error) {
    console.error('cloneAndSaveRepo: Error cloning and saving repository:', error);
    throw error;
  }
}