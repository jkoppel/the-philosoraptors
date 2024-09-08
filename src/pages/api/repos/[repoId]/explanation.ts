// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getRepoById } from "@/backend/db/queries"
import type { NextApiRequest, NextApiResponse } from "next"
import path from "path"
import { match, P } from "ts-pattern"
import fs from "fs"
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config'
import { z } from "zod"
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type Data =
  | {
      explanation: string[]
    }
  | {
      error: string
    }

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  return match(req)
    .with({ method: "GET", query: { repoId: P.string } }, async (getReq) => {
      const repoId = parseInt(getReq.query.repoId)
      const repo = await getRepoById(repoId)
      if (!repo) {
        res.status(404).json({ error: "repo not found" })
        return
      }
      const { local_path, name } = repo

      // TODO:
      // - Use repoPath to get files.
      // - Use files to get explanation.
      res.status(200).json({ explanation: await getExplanations(local_path) })
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" })
    })
}


async function getFileSummary(file: string, content: string) {
  const message = await client.messages.create({
      max_tokens: 2048,
      messages: [{ role: 'user', content: `Please summarize the following file's purpose and functionality in a single sentence.\n\nFile: ${file}\n\nContent:\n${content}` }],
      model: 'claude-3-5-sonnet-20240620',
  });
  return message.content
      .filter(block => block.type === 'text')
      .flatMap(block => (block.type === 'text' ? block.text.split('\n') : []))
      .filter(line => line.trim() !== '');
}


async function getRepoExplanation(fileSummaries: string[]) {
  const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: `Please summarize the following github repository's purpose and generate a number of sentences explaining the core functionality and components of the repository based on these important files and their functions:\n\n${fileSummaries.join('\n')}. Please return your answers in the following format: <explanation_renders>Sentence 1 is very descriptive. \n Sentence 2 is more detailed. \n Sentence 3 is even more detailed.</explanation_renders>. Vary your answers by length and complexity in order to educated the user properly. ONLY RETURN THE SENTENCES INSIDE <explanation_renders> separated by new lines. NOTHING ELSE.` }],
      model: 'claude-3-5-sonnet-20240620',
  });
  console.log("cats: ", message.content);
  const text = (message.content[0] as any).text;
  const parsedContent = text.replace(/<explanation_renders>|<\/explanation_renders>/g, '');
  console.log("parsedContent: ", parsedContent);
  return parsedContent.split('\n');
}

async function getMostImportantFiles(projectStructure: string) {
  const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: `Given the following project structure, please list the 10 most important files that are likely to be crucial for understanding the core functionality of the project. Only provide the file names, one per line.\n\n${projectStructure}` }],
      model: 'claude-3-5-sonnet-20240620',
  });

  const fileNameRegex = /(?:^|\s|\/)([\w-]+(?:\/[\w-]+)*\.\w+)(?=\s|$)/g;
  const fileNames = message.content
      .filter(block => block.type === 'text')
      .flatMap(block => {
          if (block.type === 'text') {
              const matches = [...block.text.matchAll(fileNameRegex)];
              return matches.map(match => match[1]);
          }
          return [];
      })
      .filter(fileName => fileName && fileName.includes('.'));

  return fileNames;
}

function getFileList(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
          fileList = getFileList(filePath, fileList);
      } else {
          fileList.push(filePath);
      }
  });
  return fileList;
}

function getProjectStructure(dir: string, prefix = ''): string {
  let structure = '';
  const files = fs.readdirSync(dir);
  files.forEach((file, index) => {
      const filePath = path.join(dir, file);
      const isLast = index === files.length - 1;
      const marker = isLast ? '└── ' : '├── ';
      structure += prefix + marker + file + '\n';
      if (fs.statSync(filePath).isDirectory()) {
          structure += getProjectStructure(filePath, prefix + (isLast ? '    ' : '│   '));
      }
  });
  return structure;
}

async function getModuleNames(projectStructure: string, repoExplanation: string[]) {
  const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: `Please generate a number of high-level modules based on the given project structure. These should represent the most improtant building blocks of the application and be high-level features like "Parsing Tool" and "Live Queries". Here is the project structure: ${projectStructure} and here is the repo explanation: ${repoExplanation}. Please only return your features in a list, one per line.` }],
      model: 'claude-3-5-sonnet-20240620',
  });
  return message.content;
}

// returns repo Explanation object
async function getExplanations(repo_filepath: string) {
  const pgliteFolder = repo_filepath ;
  const fileList = getFileList(pgliteFolder);
  const projectStructure = getProjectStructure(pgliteFolder);

  // console.log('Project Structure:');
  // console.log(projectStructure);

  const importantFiles = await getMostImportantFiles(projectStructure);
  // console.log('Most Important Files:');
  // console.log(importantFiles.join('\n'));

  const fileSummaries: string[] = [];
  for (const file of importantFiles) {
      const filePath = path.join(pgliteFolder, file);
      if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const summary = await getFileSummary(file, content);
          fileSummaries.push(`${file}: ${summary}`);
          // console.log(`File Summary: ${file}`);
          // console.log(summary);
          // console.log('---');
      } else {
          console.log(`File not found: ${file}`);
      }
  }
  
  const repoExplanationStrings = await getRepoExplanation(fileSummaries);
  const moduleNames = await getModuleNames(projectStructure, repoExplanationStrings);
  console.log('Module Names:', moduleNames);
  
  console.log('Repository Explanation:');
  console.log(repoExplanationStrings);
  return repoExplanationStrings; 
}