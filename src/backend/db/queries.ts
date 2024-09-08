import { db } from './conn';
import { FileDependencyMap } from '../types';
import { Repo } from './types';

/**********************************************
 ************* Repos queries ******************
 **********************************************/

export async function insertRepo(name: string, localPath: string): Promise<number> {
  const result = await db
    .insertInto('repo')
    .values({
      name: name,
      local_path: localPath,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return result.id;
}

export async function getRepoByName(name: string) {
  const result = await db
    .selectFrom('repo')
    .selectAll()
    .where('name', '=', name)
    .executeTakeFirst();

  if (!result) {
    throw new Error(`getRepoByName: No repo found with name ${name}`);
  }

  return result;
}

/**********************************************
 ************* Import Graph queries ***********
 **********************************************/

export async function insertFileDependencyGraph(repoId: number, dependencyMap: FileDependencyMap): Promise<void> {
  await db
    .insertInto('repo_import_graph')
    .values({
      repo_id: repoId,
      import_graph_json: JSON.stringify(dependencyMap),
    })
    .execute();
}

export async function getFileDependencyGraph(repoId: number): Promise<FileDependencyMap> {
  const result = await db
    .selectFrom('repo_import_graph')
    .select('import_graph_json')
    .where('repo_id', '=', repoId)
    .executeTakeFirst();

  if (result && result.import_graph_json) {
    return JSON.parse(result.import_graph_json) as FileDependencyMap;
  }

  throw new Error(`getFileDependencyGraph: No import graph found for repo ${repoId}`);
}
