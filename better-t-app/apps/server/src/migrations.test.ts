import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuth } from "@better-t-app/auth";
import { createDb, migrateDb } from "@better-t-app/db";
import { createProcedureClient } from "@orpc/server";
import { gameRouter } from "@better-t-app/api/routers/game";
import type { Context } from "@better-t-app/api/context";

const migrationsFolder = fileURLToPath(
  new URL("../../../packages/db/src/migrations", import.meta.url),
);
let db: ReturnType<typeof createDb>;

beforeEach(() => { db = createDb({ DATABASE_URL: "file::memory:" }); });
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
    expect(migrations.rows).toHaveLength(2);
    const tables = await db.$client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('game_match', 'game_unit', 'session', 'account')");
    expect(tables.rows).toHaveLength(4);
  });

  test("Ver1 対局を移行後に再開して終了できる", async () => {
    const oldMigrations = await mkdtemp(join(tmpdir(), "planet-busters-v1-"));
    try {
      await cp(join(migrationsFolder, "20260925061609_wet_scarlet_spider"), join(oldMigrations, "20260925061609_wet_scarlet_spider"), { recursive: true });
      await migrateDb(db, oldMigrations);
      await db.$client.execute("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('owner', 'Owner', 'owner@example.com', 0, 0, 0)");
      await db.$client.execute("INSERT INTO game_match (id, map_key) VALUES ('legacy', 'nebula-crossroads')");
      await db.$client.executeMultiple("INSERT INTO game_participant (id, match_id, side, user_id, planet_x, planet_y, planet_hp) VALUES ('human', 'legacy', 'human', 'owner', 0, 3, 30); INSERT INTO game_participant (id, match_id, side, planet_x, planet_y, planet_hp) VALUES ('cpu', 'legacy', 'cpu', 11, 4, 30); INSERT INTO game_unit (id, match_id, participant_id, kind, x, y, hp) VALUES ('fighter', 'legacy', 'human', 'fighter', 2, 1, 10);");
      await migrateDb(db, migrationsFolder);
      const context = { db, session: { user: { id: "owner" } } } as Context;
      const get = createProcedureClient(gameRouter.getMatch, { context });
      const submit = createProcedureClient(gameRouter.submitAction, { context });
      const surrender = createProcedureClient(gameRouter.surrender, { context });
      const match = await get({ matchId: "legacy" });
      expect(match).toMatchObject({ rulesVersion: "v1", mapVersion: "v1", status: "active" });
      const updated = await submit({ matchId: "legacy", expectedVersion: match.version, action: { type: "wait", unitId: "fighter" } });
      const finished = await surrender({ matchId: "legacy", expectedVersion: updated.match.version });
      expect(finished).toMatchObject({ status: "completed", winnerSide: "cpu" });
      expect(await get({ matchId: "legacy" })).toEqual(finished);
      await migrateDb(db, migrationsFolder);
    } finally {
      await rm(oldMigrations, { recursive: true, force: true });
    }
  });
});