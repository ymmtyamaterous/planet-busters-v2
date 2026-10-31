import { describe, expect, test } from "bun:test";
import { chooseCpuAction } from "./cpu";
import { NEBULA_CROSSROADS_MAP } from "./map";
import { canEventuallyAttackPlanet, createSimulationState, seededRandom, simulateMatch, swapStartingSides } from "./simulator";

describe("CPU 対戦シミュレーション", () => {
	test("同じシードでは同じ行動と結果になる", () => {
		expect(simulateMatch({ seed: 42, maxActions: 30 })).toEqual(simulateMatch({ seed: 42, maxActions: 30 }));
		const first = seededRandom(42);
		const second = seededRandom(43);
		expect(first.nextInt(100000)).not.toBe(second.nextInt(100000));
	});

	test("両陣営が同じCPU判断を使い、初期配置から敵惑星に到達できる", () => {
		const state = createSimulationState(NEBULA_CROSSROADS_MAP);
		expect(chooseCpuAction(state, NEBULA_CROSSROADS_MAP, "human")).not.toBeNull();
		expect(chooseCpuAction(state, NEBULA_CROSSROADS_MAP)).toBeNull();
		expect(canEventuallyAttackPlanet(state, NEBULA_CROSSROADS_MAP, "human")).toBe(true);
		expect(canEventuallyAttackPlanet(state, NEBULA_CROSSROADS_MAP, "cpu")).toBe(true);
	});

	test("双方に攻撃可能なユニットがない場合を検出する", () => {
		const state = createSimulationState(NEBULA_CROSSROADS_MAP);
		const result = simulateMatch({ seed: 1, initialState: { ...state, units: [] } });
		expect(result.reason).toBe("unreachable");
		expect(result.events).toHaveLength(0);
	});

	test("地形で主惑星に到達できない場合を検出する", () => {
		const map = {
			...NEBULA_CROSSROADS_MAP,
			asteroids: Array.from({ length: 8 }, (_, y) => ({ x: 6, y })),
		};
		const state = createSimulationState(map);
		expect(canEventuallyAttackPlanet(state, map, "human")).toBe(false);
		expect(canEventuallyAttackPlanet(state, map, "cpu")).toBe(false);
		expect(simulateMatch({ seed: 1, map }).reason).toBe("unreachable");
	});

	test("片側だけ初期到達不能でも検出する", () => {
		const state = createSimulationState(NEBULA_CROSSROADS_MAP);
		const result = simulateMatch({ seed: 1, maxActions: 1, initialState: { ...state, units: state.units.filter((unit) => unit.side === "cpu") } });
		expect(result.initialUnreachableSides).toEqual(["human"]);
		expect(result.reason).toBe("action_limit");
	});

	test("行動回数上限で停止し、不正な上限を拒否する", () => {
		expect(simulateMatch({ seed: 1, maxActions: 1 }).reason).toBe("action_limit");
		expect(() => simulateMatch({ seed: 1, maxActions: 0 })).toThrow();
	});

	test("先手と物理的な初期配置を独立して入れ替えられる", () => {
		const map = swapStartingSides(NEBULA_CROSSROADS_MAP);
		expect(map.asteroids).toEqual(NEBULA_CROSSROADS_MAP.asteroids);
		expect(map.planets.human).toEqual(NEBULA_CROSSROADS_MAP.planets.cpu);
		expect(map.initialUnits.filter((unit) => unit.side === "human").map((unit) => unit.position)).toEqual(
			NEBULA_CROSSROADS_MAP.initialUnits.filter((unit) => unit.side === "cpu").map((unit) => unit.position),
		);
		for (const firstSide of ["human", "cpu"] as const) {
			const result = simulateMatch({ seed: 42, map, firstSide, maxActions: 1 });
			expect(result.events[0]?.side).toBe(firstSide);
			expect(result.initialUnreachableSides).toEqual([]);
			expect(result).toEqual(simulateMatch({ seed: 42, map, firstSide, maxActions: 1 }));
		}
		expect(() => simulateMatch({ seed: 1, initialState: createSimulationState(map), firstSide: "cpu" })).toThrow();
	});
});