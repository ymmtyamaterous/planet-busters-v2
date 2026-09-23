import { describe, expect, test } from "bun:test";

import { getSurveyLabel } from "./game-text";

describe("getSurveyLabel", () => {
	test("shows the initial survey count", () => {
		expect(getSurveyLabel(0)).toBe("クリックして惑星を調査 · 0");
	});

	test("shows the updated survey count", () => {
		expect(getSurveyLabel(3)).toBe("クリックして惑星を調査 · 3");
	});
});
