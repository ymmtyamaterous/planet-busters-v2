import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
  const client = createClient({
    url: env.DATABASE_URL,
  });

  return drizzle({ client, relations });
}

export type Database = ReturnType<typeof createDb>;

export async function migrateDb(db: Database, migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}
