import { describe, expect, test } from "bun:test";
import {
	type MatchSnapshot,
	NEBULA_CROSSROADS_MAP,
} from "@better-t-app/api/game";

import { getBoardPresentation } from "./board-data";

const match: MatchSnapshot = {
	id: "match-1",
	status: "active",
	mode: "cpu",
	turnSide: "human",
	turnNumber: 1,
	mapKey: NEBULA_CROSSROADS_MAP.key,
	version: 1,
	winnerSide: null,
	planets: [
		{
			id: "human-planet",
			side: "human",
			position: { x: 0, y: 3 },
			hp: 30,
		},
		{
			id: "cpu-planet",
			side: "cpu",
			position: { x: 11, y: 4 },
			hp: 30,
		},
	],
	units: [
		{
			id: "human-fighter",
			side: "human",
			kind: "fighter",
			position: { x: 2, y: 3 },
			hp: 5,
			hasActed: false,
			isDestroyed: false,
		},
		{
			id: "cpu-fighter",
			side: "cpu",
			kind: "fighter",
			position: { x: 4, y: 3 },
			hp: 5,
			hasActed: false,
			isDestroyed: false,
		},
	],
	recentActions: [],
};

describe("getBoardPresentation", () => {
	test("選択中の未行動自軍ユニットの移動候補と攻撃候補を描画用に変換する", () => {
		const presentation = getBoardPresentation(match, "human-fighter");
		expect(presentation.map).toBe(NEBULA_CROSSROADS_MAP);
		expect(presentation.selectedUnit?.id).toBe("human-fighter");
		expect(presentation.reachablePositions).toContainEqual({ x: 3, y: 3 });
		expect(presentation.attackTargets).toContainEqual({
			target: { type: "unit", unitId: "cpu-fighter" },
			position: { x: 4, y: 3 },
		});
	});

	test("CPU ターンまたは行動済みユニットは選択できない", () => {
		expect(
			getBoardPresentation({ ...match, turnSide: "cpu" }, "human-fighter")
				.selectedUnit,
		).toBeNull();
		expect(
			getBoardPresentation(
				{
					...match,
					units: match.units.map((unit) =>
						unit.id === "human-fighter" ? { ...unit, hasActed: true } : unit,
					),
				},
				"human-fighter",
			).selectedUnit,
		).toBeNull();
	});
});
