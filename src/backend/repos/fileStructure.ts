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

 export const filterFileTree = (
    fileTree: FileTree,
    filter: (file: string) => boolean,
    basePath: string = ''
): FileTree | null => {
    const currentPath = path.join(basePath, fileTree.name);

    // If it's a file (no children), apply the filter directly
    if (fileTree.children.length === 0) {
        return filter(currentPath) ? fileTree : null;
    }

    // For directories, filter children recursively
    const filteredChildren = fileTree.children
        .map(child => filterFileTree(child, filter, currentPath))
        .filter((child): child is FileTree => child !== null);

    // Keep the directory if it has any children left after filtering
    // or if it passes the filter itself
    if (filteredChildren.length > 0 || filter(currentPath)) {
        return {
            name: fileTree.name,
            children: filteredChildren
        };
    }

    // If no children are left and the directory doesn't pass the filter, remove it
    return null;
};

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



/***********************
 ************* Filters
 ***********************/

 export const isSubstantiveJsOrTsFile = (file: string): boolean => {
    const forbiddenFiles = [
        'vite.config.ts',
        'tailwind.config.ts',
        'postcss.config.ts',
        'postcss.config.js',
        'eslintrc.js',
        'eslintrc.d.ts',
        'eslintrc.d.tsx',
        'eslint.config.js',
        'eslint.config.ts',
    ];

    if (forbiddenFiles.includes(file)) {
        return false;
    }

    const forbiddenDirectories = [
        'node_modules',
        'dist',
        'build',
        'public',
        'scripts',
        'tests',
        'test',
        'docs',
    ];

    for (const dir of forbiddenDirectories) {
        if (file.includes(dir)) {
            return false;
        }
    }

    return file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx');
 }
 
 