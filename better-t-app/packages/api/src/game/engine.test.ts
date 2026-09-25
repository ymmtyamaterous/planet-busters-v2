import { describe, expect, test } from "bun:test";

import { chooseCpuAction } from "./cpu";
import {
	applyAction,
	calculateAccuracy,
	canAttackTarget,
	findPath,
	getReachablePositions,
	hasClearLineOfSight,
	resolveAttack,
	startTurn,
} from "./engine";
import { type MapDefinition, NEBULA_CROSSROADS_MAP } from "./map";
import type {
	GameUnitSnapshot,
	MatchSnapshot,
	RandomNumberGenerator,
} from "./types";

const fixedRandom = (value: number): RandomNumberGenerator => ({
	nextInt: () => value,
});

const testMap: MapDefinition = {
	key: "test",
	name: "テスト",
	size: { width: 6, height: 5 },
	asteroids: [],
	planets: { human: { x: 0, y: 2 }, cpu: { x: 5, y: 2 } },
	initialUnits: [],
};

function createState(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
	return {
		id: "match-1",
		status: "active",
		mode: "cpu",
		turnSide: "human",
		turnNumber: 1,
		mapKey: testMap.key,
		version: 1,
		winnerSide: null,
		planets: [
			{ id: "human-planet", side: "human", position: { x: 0, y: 2 }, hp: 30 },
			{ id: "cpu-planet", side: "cpu", position: { x: 5, y: 2 }, hp: 30 },
		],
		units: [
			{
				id: "human-fighter",
				side: "human",
				kind: "fighter",
				position: { x: 1, y: 1 },
				hp: 5,
				hasActed: false,
				isDestroyed: false,
			},
			{
				id: "cpu-battleship",
				side: "cpu",
				kind: "battleship",
				position: { x: 4, y: 2 },
				hp: 12,
				hasActed: false,
				isDestroyed: false,
			},
		],
		recentActions: [],
		...overrides,
	};
}

function humanFighter(): GameUnitSnapshot {
	return {
		id: "human-fighter",
		side: "human",
		kind: "fighter",
		position: { x: 1, y: 1 },
		hp: 5,
		hasActed: false,
		isDestroyed: false,
	};
}

function cpuBattleship(): GameUnitSnapshot {
	return {
		id: "cpu-battleship",
		side: "cpu",
		kind: "battleship",
		position: { x: 4, y: 2 },
		hp: 12,
		hasActed: false,
		isDestroyed: false,
	};
}

describe("移動", () => {
	test("小惑星を迂回する最短経路を幅優先探索する", () => {
		const map = { ...testMap, asteroids: [{ x: 2, y: 1 }] };
		const state = createState();
		const path = findPath(state, map, { x: 1, y: 1 }, { x: 3, y: 1 });
		expect(path).toHaveLength(4);
		expect(path?.at(-1)).toEqual({ x: 3, y: 1 });
	});

	test("他ユニット、主惑星および小惑星のマスへ移動できない", () => {
		const map = { ...testMap, asteroids: [{ x: 2, y: 1 }] };
		const state = createState();
		expect(findPath(state, map, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
		expect(findPath(state, map, { x: 1, y: 1 }, { x: 4, y: 2 })).toBeNull();
		expect(findPath(state, map, { x: 1, y: 1 }, { x: 0, y: 2 })).toBeNull();
	});

	test("移動力を超える到達可能マスは候補に含めない", () => {
		const state = createState();
		const fighter = humanFighter();
		expect(getReachablePositions(state, testMap, fighter)).not.toContainEqual({
			x: 5,
			y: 0,
		});
	});
});

describe("攻撃", () => {
	test("射程外、遮蔽、味方および撃破済み対象を拒否する", () => {
		const attacker = humanFighter();
		const state = createState({
			units: [
				attacker,
				{
					id: "far",
					side: "cpu",
					kind: "fighter",
					position: { x: 4, y: 1 },
					hp: 5,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "ally",
					side: "human",
					kind: "fighter",
					position: { x: 2, y: 1 },
					hp: 5,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "destroyed",
					side: "cpu",
					kind: "fighter",
					position: { x: 3, y: 1 },
					hp: 0,
					hasActed: false,
					isDestroyed: true,
				},
			],
		});
		expect(
			canAttackTarget(state, testMap, attacker, {
				type: "unit",
				unitId: "far",
			}),
		).toBe(false);
		expect(
			canAttackTarget(
				state,
				{ ...testMap, asteroids: [{ x: 2, y: 1 }] },
				attacker,
				{ type: "unit", unitId: "far" },
			),
		).toBe(false);
		expect(
			canAttackTarget(state, testMap, attacker, {
				type: "unit",
				unitId: "ally",
			}),
		).toBe(false);
		expect(
			canAttackTarget(state, testMap, attacker, {
				type: "unit",
				unitId: "destroyed",
			}),
		).toBe(false);
	});

	test("小惑星だけが直線射撃の射線を遮る", () => {
		expect(hasClearLineOfSight(testMap, { x: 1, y: 1 }, { x: 4, y: 1 })).toBe(
			true,
		);
		expect(
			hasClearLineOfSight(
				{ ...testMap, asteroids: [{ x: 2, y: 1 }] },
				{ x: 1, y: 1 },
				{ x: 4, y: 1 },
			),
		).toBe(false);
		expect(hasClearLineOfSight(testMap, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(
			false,
		);
	});

	test("miss、hit、critical の境界値とダメージを決定的に解決する", () => {
		const state = createState({
			units: [
				{
					id: "attacker",
					side: "human",
					kind: "battleship",
					position: { x: 1, y: 2 },
					hp: 12,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "target",
					side: "cpu",
					kind: "fighter",
					position: { x: 4, y: 2 },
					hp: 12,
					hasActed: false,
					isDestroyed: false,
				},
			],
		});
		const target = { type: "unit", unitId: "target" } as const;
		expect(
			resolveAttack(state, testMap, "attacker", target, fixedRandom(0))
				.attackResult,
		).toMatchObject({ result: "critical", damage: 8 });
		expect(
			resolveAttack(state, testMap, "attacker", target, fixedRandom(10))
				.attackResult,
		).toMatchObject({ result: "hit", damage: 4 });
		expect(
			resolveAttack(state, testMap, "attacker", target, fixedRandom(60))
				.attackResult,
		).toMatchObject({ result: "miss", damage: 0 });
		expect(calculateAccuracy("battleship", "fighter")).toBe(60);
	});

	test("主惑星を撃破すると即時に終了する", () => {
		const state = createState({
			units: [
				{
					id: "attacker",
					side: "human",
					kind: "battleship",
					position: { x: 1, y: 2 },
					hp: 12,
					hasActed: false,
					isDestroyed: false,
				},
			],
			planets: [
				{ id: "human-planet", side: "human", position: { x: 0, y: 2 }, hp: 30 },
				{ id: "cpu-planet", side: "cpu", position: { x: 4, y: 2 }, hp: 8 },
			],
		});
		const result = resolveAttack(
			state,
			testMap,
			"attacker",
			{ type: "planet", side: "cpu" },
			fixedRandom(0),
		);
		expect(result.state).toMatchObject({
			status: "completed",
			winnerSide: "human",
		});
		expect(result.state.planets[1]?.hp).toBe(0);
	});

	test("HP が 0 になったユニットを撃破済みにする", () => {
		const state = createState({
			units: [
				{
					id: "attacker",
					side: "human",
					kind: "battleship",
					position: { x: 1, y: 2 },
					hp: 12,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "target",
					side: "cpu",
					kind: "fighter",
					position: { x: 4, y: 2 },
					hp: 4,
					hasActed: false,
					isDestroyed: false,
				},
			],
		});
		const result = resolveAttack(
			state,
			testMap,
			"attacker",
			{ type: "unit", unitId: "target" },
			fixedRandom(10),
		);
		expect(result.state.units[1]).toMatchObject({ hp: 0, isDestroyed: true });
	});
});

describe("ターンとCPU", () => {
	test("ターン開始時に対象陣営の生存ユニットだけを未行動に戻す", () => {
		const state = createState({
			units: [
				{ ...humanFighter(), hasActed: true },
				{ ...cpuBattleship(), hasActed: true },
				{
					id: "destroyed",
					side: "human",
					kind: "fighter",
					position: { x: 1, y: 3 },
					hp: 0,
					hasActed: true,
					isDestroyed: true,
				},
			],
		});
		const next = startTurn(state, "human");
		expect(next.units.map((unit) => unit.hasActed)).toEqual([
			false,
			true,
			true,
		]);
		expect(next.turnNumber).toBe(2);
	});

	test("移動と待機はユニットを行動済みにする", () => {
		const state = createState();
		const moved = applyAction(
			state,
			testMap,
			{
				type: "move",
				unitId: "human-fighter",
				destination: { x: 2, y: 1 },
			},
			fixedRandom(0),
		).state;
		expect(moved.units[0]).toMatchObject({
			position: { x: 2, y: 1 },
			hasActed: true,
		});
	});

	test("CPUは主惑星攻撃を他の選択肢より優先する", () => {
		const state = createState({
			turnSide: "cpu",
			units: [
				{
					id: "cpu-a",
					side: "cpu",
					kind: "battleship",
					position: { x: 4, y: 2 },
					hp: 12,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "human-a",
					side: "human",
					kind: "fighter",
					position: { x: 3, y: 2 },
					hp: 1,
					hasActed: false,
					isDestroyed: false,
				},
			],
		});
		expect(chooseCpuAction(state, testMap)).toEqual({
			type: "attack",
			unitId: "cpu-a",
			target: { type: "planet", side: "human" },
		});
	});

	test("CPUは撃破可能な敵をHPと座標順で選ぶ", () => {
		const state = createState({
			turnSide: "cpu",
			units: [
				{
					id: "cpu-a",
					side: "cpu",
					kind: "fighter",
					position: { x: 3, y: 1 },
					hp: 5,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "human-b",
					side: "human",
					kind: "fighter",
					position: { x: 1, y: 1 },
					hp: 2,
					hasActed: false,
					isDestroyed: false,
				},
				{
					id: "human-a",
					side: "human",
					kind: "fighter",
					position: { x: 3, y: 2 },
					hp: 2,
					hasActed: false,
					isDestroyed: false,
				},
			],
		});
		expect(chooseCpuAction(state, testMap)).toEqual({
			type: "attack",
			unitId: "cpu-a",
			target: { type: "unit", unitId: "human-b" },
		});
	});

	test("CPUは固定マップでも合法手を選択する", () => {
		const state = createState({
			mapKey: NEBULA_CROSSROADS_MAP.key,
			turnSide: "cpu",
			units: NEBULA_CROSSROADS_MAP.initialUnits.map((unit) => ({
				...unit,
				hp: 5,
				hasActed: false,
				isDestroyed: false,
			})),
			planets: [
				{
					id: "human",
					side: "human",
					position: NEBULA_CROSSROADS_MAP.planets.human,
					hp: 30,
				},
				{
					id: "cpu",
					side: "cpu",
					position: NEBULA_CROSSROADS_MAP.planets.cpu,
					hp: 30,
				},
			],
		});
		const action = chooseCpuAction(state, NEBULA_CROSSROADS_MAP);
		expect(action?.type).toBe("move");
	});
});
