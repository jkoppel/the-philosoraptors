// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { easyRunLlm } from "@/backend/llm/execution"
import type { NextApiRequest, NextApiResponse } from "next"
import { match, P } from "ts-pattern"

type Data =
  | {
      codeLevels: string[]
    }
  | {
      error: string
    }

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  return match(req)
    .with(
      { method: "POST", body: { sourceCode: P.string } },
      async (postReq) => {
        const sourceCode = postReq.body.sourceCode
        console.log("sourceCode", sourceCode.length)
        try {
          const codeLevels = await summarizeCodeLevels(sourceCode)
          res.status(200).json({ codeLevels })
        } catch (error) {
          console.error("error", error)
          const e = error as Error
          res
            .status(500)
            .json({ error: `Error in main function: ${e.message}` })
        }
      }
    )
    .otherwise(() => {
      res.status(405).json({ error: "invalid method or request structure" })
    })
}

const summarizeCodeLevels = async (sourceCode: string) => {
  const prompt = `
Rewrite the following code in 5 different levels of detail. Level 1 is the simplest and level 5 is the actual source code.

Please output the code in the 4 simpler levels of detail.

For level 1, start with just the main function declarations. Level 2 could add broad structure like loops and calls to other functions. Level 3 could add variable declarations. Level 4 could add import statements.

Use your judgement to pick these 4 levels of increasing detail.

Output 4 code blocks within <code> tags, from level 1 to level 4, which is simplest to most complex.

Original code (Level 5):
  $\{sourceCode\}`
  const res = await easyRunLlm(
    {
      prompt,
    },
    {
      sourceCode,
    }
  )
  console.log("res", res)

  // Parse the result to extract code blocks
  const codeLevels =
    res
      .match(/<code>([\s\S]*?)<\/code>/g)
      ?.map((block) => block.replace(/<\/?code>/g, "").trim()) || []

  return [...codeLevels, sourceCode]
}
