import { describe, expect, test } from "bun:test";

import { NEBULA_CROSSROADS_MAP, validateMapDefinition } from "./map";

describe("NEBULA_CROSSROADS_MAP", () => {
	test("uses the specified 12 by 8 board with one planet and five units per side", () => {
		expect(NEBULA_CROSSROADS_MAP.size).toEqual({ width: 12, height: 8 });
		expect(NEBULA_CROSSROADS_MAP.planets.human.x).toBeLessThan(
			NEBULA_CROSSROADS_MAP.planets.cpu.x,
		);
		expect(NEBULA_CROSSROADS_MAP.initialUnits).toHaveLength(10);
	});

	test("has no overlapping or out-of-bounds starting positions", () => {
		expect(validateMapDefinition(NEBULA_CROSSROADS_MAP)).toEqual([]);
	});
});
