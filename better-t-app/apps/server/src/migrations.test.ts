import { afterEach, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { createAuth } from "@better-t-app/auth";
import { createDb, migrateDb } from "@better-t-app/db";

const migrationsFolder = fileURLToPath(
  new URL("../../../packages/db/src/migrations", import.meta.url),
);
const db = createDb({ DATABASE_URL: "file::memory:" });

afterEach(() => db.$client.close());

describe("データベース初期化", () => {
  test("空のDBにマイグレーションを適用し、再実行しても登録済みユーザーを保持する", async () => {
    await migrateDb(db, migrationsFolder);
    const auth = createAuth({
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
      CORS_ORIGIN: "http://localhost:3001",
    }, db);
    const response = await auth.api.signUpEmail({
      body: { name: "司令官", email: "captain@example.com", password: "password123" },
    });
    expect(response.user.email).toBe("captain@example.com");

    await migrateDb(db, migrationsFolder);
    const users = await db.$client.execute("SELECT email FROM user");
    expect(users.rows).toHaveLength(1);
    expect(users.rows[0]?.email).toBe("captain@example.com");
    const migrations = await db.$client.execute("SELECT id FROM __drizzle_migrations");
    expect(migrations.rows).toHaveLength(1);
    const tables = await db.$client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('game_match', 'game_unit', 'session', 'account')");
    expect(tables.rows).toHaveLength(4);
  });
});