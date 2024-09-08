import fs from "fs";
import path from "path";
import { getRepoById } from "../db/queries";

/**********************************************************************************/

/******************************************
 *************** README *******************
 ******************************************/

/***
 * HACKATHON ASSUMPTION: Every repo has a file named README.md at the root of the repo.
 */

export const getReadme = async (repoId: number): Promise<string> => {
  // get repo by id
  const repo = await getRepoById(repoId);
  const readmePath = path.join(repo!.local_path, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  return readme;
}


/******************************************
 ************* File tree ******************
 ******************************************/

 export type FileTree = {
    name: string;
    children: FileTree[];
 }

 export const getFileTree = async (repoId: number): Promise<FileTree> => {
    function dirToFileTree(filePath: string): FileTree {
        if (fs.statSync(filePath).isDirectory()) {
            const children = fs.readdirSync(filePath);
            return {
                name: path.basename(filePath),
                children: children.map(child => dirToFileTree(path.join(filePath, child))),
            };
        } else {
            return {
                name: path.basename(filePath),
                children: [],
            };
        }        
    }

    const repo = await getRepoById(repoId);
    return {...dirToFileTree(repo!.local_path), name: repo!.name};
 }

 export const renderFileTree = (fileTree: FileTree): string => {
    const renderTree = (tree: FileTree, indent: string): string => {
        return `${indent}${tree.name}\n` + tree.children.map((child:FileTree) => renderTree(child, indent + '  ')).join('\n');
    }
    return renderTree(fileTree, '');
 }

 export const getAllFiles = (
    fileTree: FileTree,
    filter: (file: string) => boolean = (_: string) => true,
    basePath: string = ''
): string[] => {

    const curPath = path.join(basePath, fileTree.name);

    return [
        ...(filter(curPath) ? [curPath] : []),
        ...fileTree.children.flatMap(child => getAllFiles(child, filter, curPath))
    ];
 }