// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getRepoById } from "@/backend/db/queries"
import type { NextApiRequest, NextApiResponse } from "next"
import { match, P } from "ts-pattern"

type Data =
  | {
      explanation: {
        title: string
        text: string
        type: "short" | "medium" | "long"
      }[]
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
      res.status(200).json({ explanation: [] })
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" })
    })
}
