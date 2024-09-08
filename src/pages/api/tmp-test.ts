// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { generateModuleNames, ModuleNamesResult } from "@/backend/reflexion-backend";
import type { NextApiRequest, NextApiResponse } from "next";
import { match, P } from "ts-pattern";


export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModuleNamesResult>
) {
  return match(req)
    .with({ method: "POST", body: { repoId: P.number } }, async (postReq) => {
      const repoId = postReq.body.repoId;
      try {
        // get module names
        const moduleNames = await generateModuleNames(repoId);
        res.status(200).json(moduleNames);
      } catch (error) {
        const e = error as Error;
        res.status(500).json({ error: `Error in main function: ${e.message}` });
      }
    })
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" });
    });
}
