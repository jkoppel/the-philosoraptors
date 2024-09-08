// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
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
      // TODO:
      // - Use repoId to get files.
      // - Use files to get explanation.
      res.status(200).json({ explanation: [] })
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" })
    })
}
