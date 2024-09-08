import { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { getRepoById } from "@/backend/db/queries";
import { match, P } from "ts-pattern";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("req.query", req.query);
  return match(req)
    .with(
      {
        method: "GET",
        query: { repoId: P.string, filePath: P.array(P.string) },
      },
      async (getReq) => {
        const repoId = parseInt(getReq.query.repoId);
        const filePath = getReq.query.filePath;
        try {
          const repo = await getRepoById(Number(repoId));
          if (!repo) {
            return res.status(404).json({ error: "Repository not found" });
          }

          const fullPath = path.join(repo.local_path, ...filePath);
          console.log("fullPath", fullPath);
          const fileContent = await readFile(fullPath, "utf-8");

          res.status(200).json({ content: fileContent });
        } catch (error) {
          console.error("Error reading file:", error);
          res.status(500).json({ error: "Error reading file" });
        }
      }
    )
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" });
    });
}
