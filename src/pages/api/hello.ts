// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { cloneAndSaveRepo } from "@/backend/repos";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const repoUrl = "https://github.com/functorism/minichat.git";
    const repoName = "minichat";

    console.log(`Cloning and saving repository: ${repoName}`);
    const repoId = await cloneAndSaveRepo(repoUrl, repoName);
    console.log(`Repository ${repoName} cloned and saved with ID: ${repoId}`);
  } catch (error) {
    console.error("Error in main function:", error);
  }

  res.status(200).json({ name: "John Doe" });
}
