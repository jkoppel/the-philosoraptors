import {
    Migrator,
    MigrationResultSet,
    Migration,
    MigrationProvider,
  } from "kysely";
  import path from "path";
  import { db } from "./conn";
  import { program } from "commander";
  
  // #######################################
  //          Migration Provider
  // #######################################
  class TSFileMigrationProivder implements MigrationProvider {
    async getMigrations(): Promise<Record<string, Migration>> {
      // This is a glob pattern that matches all files in the migrations folder
      type RelativePath = string;
      const migrationsByPath: Record<RelativePath, Migration> = import.meta.glob(
        "./migrations/**.ts",
        { eager: true },
      );
  
      // Make the migration key that goes in the DB be the file name without a ending or path.
      type MigrationId = string;
      const migrationsById = Object.entries(migrationsByPath).reduce<
        Record<MigrationId, Migration>
      >((acc, [_path, migration]) => {
        const id = path.parse(_path).name;
        acc[id] = migration;
        return acc;
      }, {});
      return Promise.resolve(migrationsById);
    }
  }
  
  // #######################################
  //          Migration functions
  // #######################################
  
  async function aroundMigrate(
    migrationFunction: (m: Migrator) => Promise<MigrationResultSet>,
  ) {
    const migrator = new Migrator({
      db,
      provider: new TSFileMigrationProivder(),
    });
  
    const { error, results } = await migrationFunction(migrator);
  
    results?.forEach((it) => {
      if (it.status === "Success") {
        console.log(`Migration "${it.migrationName}" was executed successfully`);
      } else if (it.status === "Error") {
        console.error(`Failed to execute migration "${it.migrationName}"`);
      }
    });
  
    if (error) {
      console.error("Failed to migrate");
      console.error(error);
      process.exit(1);
    }
  
    await db.destroy();
  }
  
  async function migrateToLatest() {
    console.log("migrating to latest");
    await aroundMigrate((m) => m.migrateToLatest());
  }
  
  async function downgradeOne() {
    console.log("downgrading one migration");
    await aroundMigrate((m) => m.migrateDown());
  }
  
  // #######################################
  //               Driver
  // #######################################
  
  program.command("migrate").action(async () => {
    await migrateToLatest();
  });
  
  program.command("downgrade-one").action(async () => {
    await downgradeOne();
  });
  
  program.parse();
  