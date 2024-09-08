import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {

  // #######################################
  //               Repos
  // #######################################

  await db.schema
    .createTable("repo")
    .addColumn("id", "integer", (col) =>
      col.notNull().primaryKey().autoIncrement(),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("local_path", "text", (col) => col.notNull())
    .execute();


  // #######################################
  //         Repo Import Graphs
  // #######################################

  await db.schema
    .createTable("repo_import_graph")
    .addColumn("id", "integer", (col) =>
      col.notNull().primaryKey().autoIncrement()
    )
    .addColumn("repo_id", "integer", (col) =>
      col.notNull().references("repo.id").onDelete("cascade")
    )
    .addColumn("import_graph_json", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("repo_import_graph").execute();
  await db.schema.dropTable("repo").execute();
}
