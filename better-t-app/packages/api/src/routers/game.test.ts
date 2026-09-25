import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createDb, type Database } from "@better-t-app/db";
import { createProcedureClient, ORPCError } from "@orpc/server";

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
	};
}
