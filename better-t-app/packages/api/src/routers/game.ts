import type { Database } from "@better-t-app/db";
import {
	gameAction,
	gameMatch,
	gameParticipant,
	gameUnit,
} from "@better-t-app/db/schema/game";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
	type AttackResolution,
	applyAction,
	chooseCpuAction,
	DEFAULT_MAP_KEY,
	type DomainGameAction,
	GAME_MAPS,
	type GameActionSnapshot,
	type GameSide,
	type MatchSnapshot,
	startTurn,
	UNIT_STATS,
} from "../game";
import { protectedProcedure } from "../index";

const createCpuMatchInput = z.object({
	mapKey: z.string().optional(),
});

const matchIdInput = z.object({ matchId: z.string().min(1) });

const submitActionInput = z.object({
	matchId: z.string().min(1),
	expectedVersion: z.int().min(1),
	action: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("move"),
			unitId: z.string().min(1),
			destination: z.object({ x: z.int(), y: z.int() }),
		}),
		z.object({
			type: z.literal("attack"),
			unitId: z.string().min(1),
			target: z.discriminatedUnion("type", [
				z.object({ type: z.literal("unit"), unitId: z.string().min(1) }),
				z.object({ type: z.literal("planet"), side: z.enum(["human", "cpu"]) }),
			]),
		}),
		z.object({ type: z.literal("wait"), unitId: z.string().min(1) }),
		z.object({ type: z.literal("endTurn") }),
	]),
});

const listMatchesInput = z.object({
	status: z.enum(["active", "completed", "abandoned"]).optional(),
});

type PersistedMatch = typeof gameMatch.$inferSelect;
type PersistedParticipant = typeof gameParticipant.$inferSelect;
type PersistedUnit = typeof gameUnit.$inferSelect;
type PersistedAction = typeof gameAction.$inferSelect;

export const gameRouter = {
	createCpuMatch: protectedProcedure
		.input(createCpuMatchInput)
		.handler(async ({ context, input }) => {
			const map = getMap(input.mapKey ?? DEFAULT_MAP_KEY);
			const matchId = crypto.randomUUID();
			const humanParticipantId = crypto.randomUUID();
			const cpuParticipantId = crypto.randomUUID();

			await context.db.transaction(async (tx) => {
				await tx.insert(gameMatch).values({ id: matchId, mapKey: map.key });
				await tx.insert(gameParticipant).values([
					{
						id: humanParticipantId,
						matchId,
						side: "human",
						userId: context.session.user.id,
						planetX: map.planets.human.x,
						planetY: map.planets.human.y,
						planetHp: 30,
					},
					{
						id: cpuParticipantId,
						matchId,
						side: "cpu",
						planetX: map.planets.cpu.x,
						planetY: map.planets.cpu.y,
						planetHp: 30,
					},
				]);
				await tx.insert(gameUnit).values(
					map.initialUnits.map((unit) => ({
						id: `${matchId}:${unit.id}`,
						matchId,
						participantId:
							unit.side === "human" ? humanParticipantId : cpuParticipantId,
						kind: unit.kind,
						x: unit.position.x,
						y: unit.position.y,
						hp: UNIT_STATS[unit.kind].hp,
					})),
				);
			});

			return loadOwnedMatch(context.db, matchId, context.session.user.id);
		}),
	listMatches: protectedProcedure
		.input(listMatchesInput)
		.handler(async ({ context, input }) => {
			const matches = await context.db
				.select({
					id: gameMatch.id,
					status: gameMatch.status,
					turnSide: gameMatch.turnSide,
					turnNumber: gameMatch.turnNumber,
					mapKey: gameMatch.mapKey,
					winnerSide: gameMatch.winnerSide,
					finishReason: gameMatch.finishReason,
					updatedAt: gameMatch.updatedAt,
				})
				.from(gameParticipant)
				.innerJoin(gameMatch, eq(gameParticipant.matchId, gameMatch.id))
				.where(
					and(
						eq(gameParticipant.side, "human"),
						eq(gameParticipant.userId, context.session.user.id),
						input.status ? eq(gameMatch.status, input.status) : undefined,
					),
				)
				.orderBy(desc(gameMatch.updatedAt));
			return { matches, nextCursor: null };
		}),
	getMatch: protectedProcedure
		.input(matchIdInput)
		.handler(({ context, input }) =>
			loadOwnedMatch(context.db, input.matchId, context.session.user.id),
		),
	submitAction: protectedProcedure
		.input(submitActionInput)
		.handler(async ({ context, input }) => {
			const snapshot = await loadOwnedMatch(
				context.db,
				input.matchId,
				context.session.user.id,
			);
			if (snapshot.version !== input.expectedVersion) {
				throw gameError("STALE_MATCH_VERSION", "対局の状態が更新されています");
			}
			if (snapshot.turnSide !== "human") {
				throw gameError("NOT_YOUR_TURN", "現在はCPUのターンです");
			}

			const map = getMap(snapshot.mapKey);
			let result: ReturnType<typeof applyAction>;
			try {
				result = applyAction(snapshot, map, input.action, secureRandom);
			} catch (error) {
				throw gameError(
					"INVALID_ACTION",
					error instanceof Error ? error.message : "不正な操作です",
				);
			}

			const actionRecords = [
				toActionRecord(snapshot, input.action, result.attackResult),
			];
			let finalState = result.state;
			if (
				finalState.status === "active" &&
				(input.action.type === "endTurn" ||
					finalState.units
						.filter((unit) => unit.side === "human" && !unit.isDestroyed)
						.every((unit) => unit.hasActed))
			) {
				finalState = runCpuTurn(finalState, map, actionRecords);
			}

			await persistState(context.db, snapshot, finalState, actionRecords);
			return {
				match: await loadOwnedMatch(
					context.db,
					input.matchId,
					context.session.user.id,
				),
				attackResult: result.attackResult,
			};
		}),
	surrender: protectedProcedure
		.input(
			z.object({ matchId: z.string().min(1), expectedVersion: z.int().min(1) }),
		)
		.handler(async ({ context, input }) => {
			const snapshot = await loadOwnedMatch(
				context.db,
				input.matchId,
				context.session.user.id,
			);
			if (snapshot.version !== input.expectedVersion) {
				throw gameError("STALE_MATCH_VERSION", "対局の状態が更新されています");
			}
			if (snapshot.status !== "active") {
				throw gameError("MATCH_FINISHED", "対局はすでに終了しています");
			}
			const finalState: MatchSnapshot = {
				...snapshot,
				status: "completed",
				winnerSide: "cpu",
			};
			await persistState(context.db, snapshot, finalState, [
				{
					actorUnitId: null,
					kind: "surrender",
					side: "human",
					turnNumber: snapshot.turnNumber,
					payload: { summary: "人間陣営が降参しました" },
				},
			]);
			return loadOwnedMatch(context.db, input.matchId, context.session.user.id);
		}),
};

type ActionRecord = Readonly<{
	actorUnitId: string | null;
	kind: "move" | "attack" | "wait" | "end_turn" | "surrender";
	side: GameSide;
	turnNumber: number;
	payload: Record<string, unknown>;
}>;

const secureRandom = {
	nextInt: (maxExclusive: number) => {
		const values = crypto.getRandomValues(new Uint32Array(1));
		return (values[0] ?? 0) % maxExclusive;
	},
};

function getMap(key: string) {
	const map = GAME_MAPS.find((candidate) => candidate.key === key);
	if (!map) throw gameError("INVALID_ACTION", "指定されたマップは存在しません");
	return map;
}

async function loadOwnedMatch(
	db: Database,
	matchId: string,
	userId: string,
): Promise<MatchSnapshot> {
	const [match] = await db
		.select()
		.from(gameMatch)
		.where(eq(gameMatch.id, matchId))
		.limit(1);
	if (!match) throw gameError("MATCH_NOT_FOUND", "対局が見つかりません");
	const participants = await db
		.select()
		.from(gameParticipant)
		.where(eq(gameParticipant.matchId, matchId));
	const human = participants.find(
		(participant) => participant.side === "human",
	);
	if (!human || human.userId !== userId) {
		throw gameError("MATCH_FORBIDDEN", "この対局を操作する権限がありません");
	}
	const [units, actions] = await Promise.all([
		db.select().from(gameUnit).where(eq(gameUnit.matchId, matchId)),
		db
			.select()
			.from(gameAction)
			.where(eq(gameAction.matchId, matchId))
			.orderBy(desc(gameAction.createdAt))
			.limit(10),
	]);
	return toSnapshot(match, participants, units, actions.reverse());
}

function toSnapshot(
	match: PersistedMatch,
	participants: PersistedParticipant[],
	units: PersistedUnit[],
	actions: PersistedAction[],
): MatchSnapshot {
	return {
		id: match.id,
		status: match.status,
		mode: match.mode,
		turnSide: match.turnSide,
		turnNumber: match.turnNumber,
		mapKey: match.mapKey,
		version: match.version,
		winnerSide: match.winnerSide,
		planets: participants.map((participant) => ({
			id: participant.id,
			side: participant.side,
			position: { x: participant.planetX, y: participant.planetY },
			hp: participant.planetHp,
		})),
		units: units.map((unit) => {
			const participant = participants.find(
				(candidate) => candidate.id === unit.participantId,
			);
			if (!participant) throw new Error("ユニットの参加者が存在しません");
			return {
				id: unit.id,
				side: participant.side,
				kind: unit.kind,
				position: { x: unit.x, y: unit.y },
				hp: unit.hp,
				hasActed: unit.hasActed,
				isDestroyed: unit.isDestroyed,
			};
		}),
		recentActions: actions.map(toActionSnapshot),
	};
}

function toActionSnapshot(action: PersistedAction): GameActionSnapshot {
	const payload = JSON.parse(action.payload) as { summary?: unknown };
	return {
		id: action.id,
		kind: action.kind === "end_turn" ? "endTurn" : action.kind,
		side: action.side,
		turnNumber: action.turnNumber,
		createdAt: action.createdAt.toISOString(),
		summary:
			typeof payload.summary === "string" ? payload.summary : "行動しました",
	};
}

function runCpuTurn(
	initialState: MatchSnapshot,
	map: (typeof GAME_MAPS)[number],
	actionRecords: ActionRecord[],
): MatchSnapshot {
	let state =
		initialState.turnSide === "cpu"
			? initialState
			: startTurn(initialState, "cpu");
	while (state.status === "active") {
		const action = chooseCpuAction(state, map);
		if (!action) break;
		const result = applyAction(state, map, action, secureRandom);
		actionRecords.push(toActionRecord(state, action, result.attackResult));
		state = result.state;
		if (action.type === "endTurn") return state;
	}
	return state;
}

function toActionRecord(
	state: MatchSnapshot,
	action: DomainGameAction,
	attackResult?: AttackResolution,
): ActionRecord {
	const actorUnitId = "unitId" in action ? action.unitId : null;
	const kind = action.type === "endTurn" ? "end_turn" : action.type;
	return {
		actorUnitId,
		kind,
		side: state.turnSide,
		turnNumber: state.turnNumber,
		payload: {
			summary: actionSummary(action, attackResult),
			action,
			attackResult,
		},
	};
}

function actionSummary(
	action: DomainGameAction,
	attackResult?: AttackResolution,
): string {
	if (action.type === "move") return "ユニットが移動しました";
	if (action.type === "wait") return "ユニットが待機しました";
	if (action.type === "endTurn") return "ターンを終了しました";
	return attackResult
		? `攻撃は${attackResult.result}、${attackResult.damage}ダメージ`
		: "ユニットが攻撃しました";
}

async function persistState(
	db: Database,
	previous: MatchSnapshot,
	next: MatchSnapshot,
	actions: ActionRecord[],
): Promise<void> {
	await db.transaction(async (tx) => {
		const updated = await tx
			.update(gameMatch)
			.set({
				status: next.status,
				turnSide: next.turnSide,
				turnNumber: next.turnNumber,
				version: previous.version + 1,
				winnerSide: next.winnerSide,
				finishReason:
					next.status === "completed"
						? next.winnerSide === "cpu" &&
							actions.some((action) => action.kind === "surrender")
							? "surrender"
							: "planet_destroyed"
						: null,
				finishedAt: next.status === "completed" ? new Date() : null,
			})
			.where(
				and(
					eq(gameMatch.id, previous.id),
					eq(gameMatch.version, previous.version),
				),
			)
			.returning({ id: gameMatch.id });
		if (updated.length !== 1) {
			throw gameError("STALE_MATCH_VERSION", "対局の状態が更新されています");
		}
		for (const planet of next.planets) {
			await tx
				.update(gameParticipant)
				.set({
					planetX: planet.position.x,
					planetY: planet.position.y,
					planetHp: planet.hp,
				})
				.where(
					and(
						eq(gameParticipant.matchId, next.id),
						eq(gameParticipant.side, planet.side),
					),
				);
		}
		for (const unit of next.units) {
			await tx
				.update(gameUnit)
				.set({
					x: unit.position.x,
					y: unit.position.y,
					hp: unit.hp,
					hasActed: unit.hasActed,
					isDestroyed: unit.isDestroyed,
				})
				.where(eq(gameUnit.id, unit.id));
		}
		if (actions.length > 0) {
			await tx.insert(gameAction).values(
				actions.map((action) => ({
					id: crypto.randomUUID(),
					matchId: next.id,
					actorUnitId: action.actorUnitId,
					turnNumber: action.turnNumber,
					side: action.side,
					kind: action.kind,
					payload: JSON.stringify(action.payload),
				})),
			);
		}
	});
}

function gameError(
	code: string,
	message: string,
): ORPCError<"BAD_REQUEST", { code: string }> {
	return new ORPCError("BAD_REQUEST", { message, data: { code } });
}
