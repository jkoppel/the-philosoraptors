// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { cloneAndSaveRepo } from "@/backend/repos";
import type { NextApiRequest, NextApiResponse } from "next";
import { match, P } from "ts-pattern";

type Data =
  | {
      id: number;
    }
  | {
      error: string;
    };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  return match(req)
    .with({ method: "POST", body: { repoUrl: P.string } }, async (postReq) => {
      const repoUrl = postReq.body.repoUrl;
      try {
        console.log(`Cloning and saving repository: ${repoUrl}`);
        const repoName = repoUrl.split("/").pop();
        if (!repoName) {
          res.status(400).json({ error: "Invalid repoUrl" });
          return;
        }
        const repoId = await cloneAndSaveRepo(repoUrl, repoName);
        console.log(
          `Repository ${repoName} (${repoUrl}) cloned and saved with ID: ${repoId}`
        );
        res.status(200).json({ id: repoId });
      } catch (error) {
        const e = error as Error;
        res.status(500).json({ error: `Error in main function: ${e.message}` });
      }
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" });
    });
}
