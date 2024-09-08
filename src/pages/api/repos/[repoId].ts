// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getFileDependencyGraph } from "@/backend/db/queries";
import { FileDependencyMap } from "@/backend/types";
import type { NextApiRequest, NextApiResponse } from "next";
import { match, P } from "ts-pattern";

type Data =
  | {
      files: FileDependencyMap;
    }
  | {
      error: string;
    };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  return match(req)
    .with({ method: "GET", query: { repoId: P.string } }, async (getReq) => {
      const repoId = parseInt(getReq.query.repoId);
      const fileDependencyMap = await getFileDependencyGraph(repoId);
      res.status(200).json({ files: fileDependencyMap });
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" });
    });
}
