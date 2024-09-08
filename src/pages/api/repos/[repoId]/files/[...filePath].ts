import { NextApiRequest, NextApiResponse } from "next"
import { readFile } from "fs/promises"
import path from "path"
import { getRepoById } from "@/backend/db/queries"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { repoId, filePath } = req.query
  console.log("repoId", repoId, "filePath", filePath)

  if (!repoId || !filePath) {
    return res.status(400).json({ error: "Missing repoId or filePath" })
  }

  try {
    const repo = await getRepoById(Number(repoId))
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" })
    }

    const fullPath = path.join(
      repo.local_path,
      ...(Array.isArray(filePath) ? filePath : [filePath])
    )
    const fileContent = await readFile(fullPath, "utf-8")

    res.status(200).json({ content: fileContent })
  } catch (error) {
    console.error("Error reading file:", error)
    res.status(500).json({ error: "Error reading file" })
  }
}
