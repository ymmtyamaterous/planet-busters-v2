import { describe, expect, mock, test } from "bun:test";
import {
	type MatchSnapshot,
	NEBULA_CROSSROADS_MAP,
} from "@better-t-app/api/game";

import { confirmAttack, getBoardAction, getBoardPresentation, requestMove } from "./board-data";

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

describe("getBoardAction", () => {
	const presentation = getBoardPresentation(match, "human-fighter");

	test("通常時は自軍ユニットを選択し、表示中の移動先を選べる", () => {
		expect(getBoardAction(match, presentation, null, { x: 2, y: 3 }, false)).toEqual({
			type: "select",
			unitId: "human-fighter",
		});
		expect(getBoardAction(match, presentation, null, { x: 4, y: 3 }, false)).toEqual({
			type: "attack",
			target: { type: "unit", unitId: "cpu-fighter" },
		});
		expect(getBoardAction(match, presentation, null, { x: 3, y: 3 }, false)).toEqual({
			type: "move",
			destination: { x: 3, y: 3 },
		});
		expect(getBoardAction(match, getBoardPresentation(match, null), null, { x: 3, y: 3 }, false)).toBeNull();
		const acted = { ...match, units: match.units.map((unit) => ({ ...unit, hasActed: true })) };
		expect(getBoardAction(acted, presentation, null, { x: 2, y: 3 }, false)).toBeNull();
	});

	test("移動先と攻撃対象は有効なマスだけを操作できる", () => {
		expect(getBoardAction(match, presentation, "move", { x: 3, y: 3 }, false)).toEqual({
			type: "move",
			destination: { x: 3, y: 3 },
		});
		expect(getBoardAction(match, presentation, "move", { x: 4, y: 3 }, false)).toEqual({
			type: "attack",
			target: { type: "unit", unitId: "cpu-fighter" },
		});
		expect(getBoardAction(match, presentation, "attack", { x: 4, y: 3 }, false)).toEqual({
			type: "attack",
			target: { type: "unit", unitId: "cpu-fighter" },
		});
		expect(getBoardAction(match, presentation, "attack", { x: 3, y: 3 }, false)).toBeNull();
	});

	test("表示された敵主惑星も直接選択できる", () => {
		const planetPresentation = {
			...presentation,
			attackTargets: [{ target: { type: "planet" as const, side: "cpu" as const }, position: { x: 11, y: 4 } }],
		};
		expect(getBoardAction(match, planetPresentation, null, { x: 11, y: 4 }, false)).toEqual({
			type: "attack",
			target: { type: "planet", side: "cpu" },
		});
		expect(getBoardAction(match, planetPresentation, null, { x: 11, y: 4 }, true)).toBeNull();
	});

	test("操作無効時、CPUターン、対局終了後は操作できない", () => {
		expect(getBoardAction(match, presentation, null, { x: 2, y: 3 }, true)).toBeNull();
		expect(getBoardAction({ ...match, turnSide: "cpu" }, presentation, "move", { x: 3, y: 3 }, false)).toBeNull();
		expect(getBoardAction({ ...match, status: "completed" }, presentation, "attack", { x: 4, y: 3 }, false)).toBeNull();
	});
});

describe("confirmAttack", () => {
	const presentation = getBoardPresentation(match, "human-fighter");
	const target = { type: "unit" as const, unitId: "cpu-fighter" };

	test("有効な対象を確認し、承認時のみ攻撃を許可する", () => {
		const confirm = mock((_message: string) => true);
		expect(confirmAttack(presentation, target, false, confirm)).toBe(true);
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(confirm.mock.calls[0]?.[0]).toContain("戦闘機で (4, 3) の敵ユニット");
		expect(confirmAttack(presentation, target, false, () => false)).toBe(false);
	});

	test("無効な状態や対象では確認せず攻撃を許可しない", () => {
		const confirm = mock(() => true);
		expect(confirmAttack(presentation, target, true, confirm)).toBe(false);
		expect(confirmAttack(getBoardPresentation(match, null), target, false, confirm)).toBe(false);
		expect(confirmAttack(presentation, { type: "unit", unitId: "other" }, false, confirm)).toBe(false);
		expect(confirmAttack(presentation, { type: "planet", side: "cpu" }, false, confirm)).toBe(false);
		expect(confirm).not.toHaveBeenCalled();
	});

	test("敵主惑星を対象とした確認を表示する", () => {
		const target = { type: "planet" as const, side: "cpu" as const };
		const planetPresentation = {
			...presentation,
			attackTargets: [{ target, position: { x: 11, y: 4 } }],
		};
		const confirm = mock((_message: string) => true);
		expect(confirmAttack(planetPresentation, target, false, confirm)).toBe(true);
		expect(confirm.mock.calls[0]?.[0]).toContain("(11, 4) の敵主惑星");
		expect(confirmAttack(planetPresentation, { type: "planet", side: "human" }, false, confirm)).toBe(false);
	});
});

describe("requestMove", () => {
	const presentation = getBoardPresentation(match, "human-fighter");
	const destination = { x: 3, y: 3 };

	test("確認した場合だけ選択ユニットと移動先を送信する", () => {
		const submit = mock(() => {});
		const confirm = mock((_message: string) => true);
		requestMove(presentation, destination, false, confirm, submit);
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(confirm.mock.calls[0]?.[0]).toContain("戦闘機を (2, 3) から (3, 3)");
		expect(submit).toHaveBeenCalledTimes(1);
		expect(submit).toHaveBeenCalledWith("human-fighter", destination);
	});

	test("キャンセルした場合は移動しない", () => {
		const submit = mock(() => {});
		const confirm = mock(() => false);
		requestMove(presentation, destination, false, confirm, submit);
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(submit).not.toHaveBeenCalled();
	});

	test("操作無効、ユニット未選択、移動不可のマスでは確認も送信もしない", () => {
		const submit = mock(() => {});
		const confirm = mock(() => true);
		requestMove(presentation, destination, true, confirm, submit);
		requestMove(getBoardPresentation(match, null), destination, false, confirm, submit);
		requestMove(presentation, { x: 4, y: 3 }, false, confirm, submit);
		expect(confirm).not.toHaveBeenCalled();
		expect(submit).not.toHaveBeenCalled();
	});
});
