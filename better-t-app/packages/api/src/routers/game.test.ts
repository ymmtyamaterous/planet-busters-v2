import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createDb, type Database } from "@better-t-app/db";
import { gameParticipant, gameUnit } from "@better-t-app/db/schema/game";
import { createProcedureClient, ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import type { Context } from "../context";
import { gameRouter } from "./game";

let db: Database;

beforeEach(async () => {
	db = createDb({ DATABASE_URL: "file::memory:" });
	await db.$client.executeMultiple(`
		CREATE TABLE user (id TEXT PRIMARY KEY);
		CREATE TABLE game_match (
			id TEXT PRIMARY KEY,
			status TEXT NOT NULL DEFAULT 'active',
			mode TEXT NOT NULL DEFAULT 'cpu',
			turn_side TEXT NOT NULL DEFAULT 'human',
			turn_number INTEGER NOT NULL DEFAULT 1,
			map_key TEXT NOT NULL,
			map_seed INTEGER,
			version INTEGER NOT NULL DEFAULT 1,
			winner_side TEXT,
			finish_reason TEXT,
			created_at INTEGER NOT NULL DEFAULT 0,
			updated_at INTEGER NOT NULL DEFAULT 0,
			finished_at INTEGER
		);
		CREATE TABLE game_participant (
			id TEXT PRIMARY KEY,
			match_id TEXT NOT NULL,
			side TEXT NOT NULL,
			user_id TEXT,
			planet_x INTEGER NOT NULL,
			planet_y INTEGER NOT NULL,
			planet_hp INTEGER NOT NULL,
			created_at INTEGER NOT NULL DEFAULT 0,
			updated_at INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE game_unit (
			id TEXT PRIMARY KEY,
			match_id TEXT NOT NULL,
			participant_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			hp INTEGER NOT NULL,
			is_destroyed INTEGER NOT NULL DEFAULT 0,
			has_acted INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL DEFAULT 0,
			updated_at INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE game_action (
			id TEXT PRIMARY KEY,
			match_id TEXT NOT NULL,
			actor_unit_id TEXT,
			turn_number INTEGER NOT NULL,
			side TEXT NOT NULL,
			kind TEXT NOT NULL,
			payload TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT 0
		);
	`);
});

afterEach(() => db.$client.close());

describe("game ORPC API", () => {
	test("未認証の呼び出しを拒否する", async () => {
		const client = createProcedureClient(gameRouter.createCpuMatch, {
			context: { db, session: null },
		});
		await expect(client({})).rejects.toBeInstanceOf(ORPCError);
	});

	test("対局を作成し、所有者だけが再取得できる", async () => {
		const owner = createGameClient("user-1");
		const match = await owner.create({});

		expect(match).toMatchObject({
			status: "active",
			turnSide: "human",
			turnNumber: 1,
			version: 1,
		});
		expect(match.planets).toHaveLength(2);
		expect(match.units).toHaveLength(10);

		const loaded = await owner.get({ matchId: match.id });
		expect(loaded).toEqual(match);

		const otherUser = createGameClient("user-2");
		await expect(otherUser.get({ matchId: match.id })).rejects.toBeInstanceOf(
			ORPCError,
		);
	});

	test("入力不正と古いバージョンの二重送信で状態を変更しない", async () => {
		const client = createGameClient("user-1");
		const match = await client.create({});
		const unit = match.units.find((candidate) => candidate.side === "human");
		if (!unit) throw new Error("人間ユニットが見つかりません");

		await expect(
			client.submit({
				matchId: match.id,
				expectedVersion: match.version,
				action: {
					type: "move",
					unitId: unit.id,
					destination: { x: -1, y: 0 },
				},
			}),
		).rejects.toBeInstanceOf(ORPCError);
		expect((await client.get({ matchId: match.id })).version).toBe(
			match.version,
		);

		await client.submit({
			matchId: match.id,
			expectedVersion: match.version,
			action: { type: "wait", unitId: unit.id },
		});
		await expect(
			client.submit({
				matchId: match.id,
				expectedVersion: match.version,
				action: { type: "wait", unitId: unit.id },
			}),
		).rejects.toBeInstanceOf(ORPCError);
	});

	test("ターン終了時にCPUの全行動をサーバーで確定する", async () => {
		const client = createGameClient("user-1");
		const match = await client.create({});
		const result = await client.submit({
			matchId: match.id,
			expectedVersion: match.version,
			action: { type: "endTurn" },
		});

		expect(result.match).toMatchObject({ turnSide: "human", turnNumber: 2 });
		expect(
			result.match.recentActions.some((action) => action.side === "cpu"),
		).toBe(true);
	});

	test("操作後に再開し、降参した対局を履歴から確認できる", async () => {
		const client = createGameClient("user-1");
		const other = createGameClient("user-2");
		const match = await client.create({});
		const unit = match.units.find((candidate) => candidate.side === "human");
		if (!unit) throw new Error("人間ユニットが見つかりません");
		const updated = await client.submit({ matchId: match.id, expectedVersion: match.version, action: { type: "wait", unitId: unit.id } });
		const resumed = await client.get({ matchId: match.id });
		expect(resumed).toEqual(updated.match);
		expect((await client.list({ status: "active" })).matches.map((item) => item.id)).toContain(match.id);
		expect((await other.list({})).matches).toHaveLength(0);
		await expect(client.surrender({ matchId: match.id, expectedVersion: match.version })).rejects.toBeInstanceOf(ORPCError);
		const finished = await client.surrender({ matchId: match.id, expectedVersion: resumed.version });
		expect(finished).toMatchObject({ status: "completed", winnerSide: "cpu" });
		expect(finished.recentActions.some((action) => action.kind === "surrender")).toBe(true);
		expect((await client.list({ status: "active" })).matches).toHaveLength(0);
		expect((await client.list({ status: "completed" })).matches[0]).toMatchObject({ id: match.id, finishReason: "surrender" });
		await expect(client.surrender({ matchId: match.id, expectedVersion: finished.version })).rejects.toBeInstanceOf(ORPCError);
	});

	test.each(["human", "cpu"] as const)("%s 陣営が惑星を破壊すると勝敗を保存する", async (winner) => {
		const client = createGameClient("user-1");
		const match = await client.create({});
		const attacker = match.units.filter((unit) => unit.side === winner).sort((a, b) => a.id.localeCompare(b.id))[0];
		if (!attacker) throw new Error("攻撃ユニットが見つかりません");
		const loser = winner === "human" ? "cpu" : "human";
		await db.update(gameParticipant).set({ planetHp: 1 }).where(and(eq(gameParticipant.matchId, match.id), eq(gameParticipant.side, loser)));
		await db.update(gameUnit).set(winner === "human" ? { x: 10, y: 4 } : { x: 1, y: 3 }).where(eq(gameUnit.id, attacker.id));
		const random = spyOn(crypto, "getRandomValues").mockImplementation((array) => {
			if (array instanceof Uint32Array) array[0] = 50;
			return array;
		});
		try {
			const response = await client.submit({
				matchId: match.id,
				expectedVersion: match.version,
				action: winner === "human" ? { type: "attack", unitId: attacker.id, target: { type: "planet", side: "cpu" } } : { type: "endTurn" },
			});
			expect(response.match).toMatchObject({ status: "completed", winnerSide: winner });
			expect(response.match.planets.find((planet) => planet.side === loser)?.hp).toBe(0);
			expect((await client.get({ matchId: match.id }))).toEqual(response.match);
			expect((await client.list({ status: "completed" })).matches[0]).toMatchObject({ finishReason: "planet_destroyed", winnerSide: winner });
			await expect(client.submit({ matchId: match.id, expectedVersion: response.match.version, action: { type: "endTurn" } })).rejects.toBeInstanceOf(ORPCError);
		} finally {
			random.mockRestore();
		}
	});

	test("古い画面の競合後は最新状態を再取得できる", async () => {
		const first = createGameClient("user-1");
		const second = createGameClient("user-1");
		const match = await first.create({});
		const unit = match.units.find((candidate) => candidate.side === "human");
		if (!unit) throw new Error("人間ユニットが見つかりません");
		const updated = await second.submit({ matchId: match.id, expectedVersion: match.version, action: { type: "wait", unitId: unit.id } });
		await expect(first.submit({ matchId: match.id, expectedVersion: match.version, action: { type: "endTurn" } })).rejects.toMatchObject({ data: { code: "STALE_MATCH_VERSION" } });
		expect(await first.get({ matchId: match.id })).toEqual(updated.match);
	});

	test("保存途中のエラーは対局と行動ログをロールバックする", async () => {
		const client = createGameClient("user-1");
		const match = await client.create({});
		const unit = match.units.find((candidate) => candidate.side === "human");
		if (!unit) throw new Error("人間ユニットが見つかりません");
		await db.$client.execute("CREATE TRIGGER fail_action BEFORE INSERT ON game_action BEGIN SELECT RAISE(ABORT, 'test failure'); END");
		await expect(client.submit({ matchId: match.id, expectedVersion: match.version, action: { type: "wait", unitId: unit.id } })).rejects.toThrow();
		expect(await client.get({ matchId: match.id })).toEqual(match);
	});
});

function createGameClient(userId: string) {
	const context = {
		db,
		session: { user: { id: userId } },
	} as Context;
	return {
		create: createProcedureClient(gameRouter.createCpuMatch, { context }),
		get: createProcedureClient(gameRouter.getMatch, { context }),
		submit: createProcedureClient(gameRouter.submitAction, { context }),
		list: createProcedureClient(gameRouter.listMatches, { context }),
		surrender: createProcedureClient(gameRouter.surrender, { context }),
	};
}
