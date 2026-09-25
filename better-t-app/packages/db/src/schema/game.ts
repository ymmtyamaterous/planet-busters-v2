import { defineRelationsPart, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestamp = () =>
	integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull();

export const gameMatch = sqliteTable(
	"game_match",
	{
		id: text("id").primaryKey(),
		status: text("status", { enum: ["active", "completed", "abandoned"] })
			.notNull()
			.default("active"),
		mode: text("mode", { enum: ["cpu"] })
			.notNull()
			.default("cpu"),
		turnSide: text("turn_side", { enum: ["human", "cpu"] })
			.notNull()
			.default("human"),
		turnNumber: integer("turn_number").notNull().default(1),
		mapKey: text("map_key").notNull(),
		mapSeed: integer("map_seed"),
		version: integer("version").notNull().default(1),
		winnerSide: text("winner_side", { enum: ["human", "cpu"] }),
		finishReason: text("finish_reason", {
			enum: ["planet_destroyed", "surrender"],
		}),
		createdAt: timestamp(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
		finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("game_match_status_updated_at_idx").on(table.status, table.updatedAt),
	],
);

export const gameParticipant = sqliteTable(
	"game_participant",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => gameMatch.id, { onDelete: "cascade" }),
		side: text("side", { enum: ["human", "cpu"] }).notNull(),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		planetX: integer("planet_x").notNull(),
		planetY: integer("planet_y").notNull(),
		planetHp: integer("planet_hp").notNull(),
		createdAt: timestamp(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("game_participant_match_side_unique").on(table.matchId, table.side),
		index("game_participant_user_id_idx").on(table.userId),
	],
);

export const gameUnit = sqliteTable(
	"game_unit",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => gameMatch.id, { onDelete: "cascade" }),
		participantId: text("participant_id")
			.notNull()
			.references(() => gameParticipant.id, { onDelete: "cascade" }),
		kind: text("kind", { enum: ["battleship", "fighter"] }).notNull(),
		x: integer("x").notNull(),
		y: integer("y").notNull(),
		hp: integer("hp").notNull(),
		isDestroyed: integer("is_destroyed", { mode: "boolean" })
			.notNull()
			.default(false),
		hasActed: integer("has_acted", { mode: "boolean" })
			.notNull()
			.default(false),
		createdAt: timestamp(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("game_unit_match_id_idx").on(table.matchId)],
);

export const gameAction = sqliteTable(
	"game_action",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => gameMatch.id, { onDelete: "cascade" }),
		actorUnitId: text("actor_unit_id").references(() => gameUnit.id, {
			onDelete: "set null",
		}),
		turnNumber: integer("turn_number").notNull(),
		side: text("side", { enum: ["human", "cpu"] }).notNull(),
		kind: text("kind", {
			enum: ["move", "attack", "wait", "end_turn", "surrender"],
		}).notNull(),
		payload: text("payload").notNull(),
		createdAt: timestamp(),
	},
	(table) => [
		index("game_action_match_created_at_idx").on(
			table.matchId,
			table.createdAt,
		),
		index("game_action_match_turn_number_idx").on(
			table.matchId,
			table.turnNumber,
		),
	],
);

export const gameRelations = defineRelationsPart(
	{ gameMatch, gameParticipant, gameUnit, gameAction, user },
	(r) => ({
		gameMatch: {
			participants: r.many.gameParticipant({
				from: r.gameMatch.id,
				to: r.gameParticipant.matchId,
			}),
			units: r.many.gameUnit({
				from: r.gameMatch.id,
				to: r.gameUnit.matchId,
			}),
			actions: r.many.gameAction({
				from: r.gameMatch.id,
				to: r.gameAction.matchId,
			}),
		},
		gameParticipant: {
			match: r.one.gameMatch({
				from: r.gameParticipant.matchId,
				to: r.gameMatch.id,
			}),
			user: r.one.user({
				from: r.gameParticipant.userId,
				to: r.user.id,
			}),
			units: r.many.gameUnit({
				from: r.gameParticipant.id,
				to: r.gameUnit.participantId,
			}),
		},
		gameUnit: {
			match: r.one.gameMatch({
				from: r.gameUnit.matchId,
				to: r.gameMatch.id,
			}),
			participant: r.one.gameParticipant({
				from: r.gameUnit.participantId,
				to: r.gameParticipant.id,
			}),
		},
		gameAction: {
			match: r.one.gameMatch({
				from: r.gameAction.matchId,
				to: r.gameMatch.id,
			}),
			actorUnit: r.one.gameUnit({
				from: r.gameAction.actorUnitId,
				to: r.gameUnit.id,
			}),
		},
	}),
);
