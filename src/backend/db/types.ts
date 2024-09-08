/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Repo {
  created_at: Generated<string>;
  id: Generated<number>;
  local_path: string;
  name: string;
}

export interface RepoImportGraph {
  created_at: Generated<string>;
  id: Generated<number>;
  import_graph_json: string;
  repo_id: number;
}

export interface DB {
  repo: Repo;
  repo_import_graph: RepoImportGraph;
}
