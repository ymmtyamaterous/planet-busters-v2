import { describe, expect, mock, test } from "bun:test";
import type { Scene } from "phaser";

import { drawUnit } from "./unit-visual";

function createScene() {
	const setStrokeStyle = mock(() => {});
	const setOrigin = mock(() => {});
	const triangle = mock(() => ({ setStrokeStyle }));
	const rectangle = mock(() => ({ setStrokeStyle }));
	const text = mock(() => ({ setOrigin }));
	const scene = { add: { triangle, rectangle, text } } as unknown as Scene;
	return { scene, triangle, rectangle, text, setStrokeStyle, setOrigin };
}

describe("drawUnit", () => {
	test("戦闘機と読みやすいラベルをマスの中心に描画する", () => {
		const { scene, triangle, text, setStrokeStyle, setOrigin } = createScene();
		drawUnit(
			scene,
			{ kind: "fighter", side: "human" },
			{ x: 95, y: 165 },
			{ selected: true, hp: 5 },
		);

		// Phaser は頂点の座標から形状の幅・高さの半分を原点として差し引く。
		expect(triangle).toHaveBeenCalledWith(
			95, 165, 15, 0, 30, 32, 0, 32, 0x80c7ff,
		);
		expect(setStrokeStyle).toHaveBeenCalledWith(4, 0xfacc15);
		expect(text).toHaveBeenCalledWith(95, 165, "機\n5", {
			align: "center",
			color: "#ffffff",
			fontSize: "11px",
			fontStyle: "bold",
			stroke: "#101827",
			strokeThickness: 3,
		});
		expect(setOrigin).toHaveBeenCalledWith(0.5);
	});

	test("戦艦のラベルとプレビュー表示を描画する", () => {
		const { scene, rectangle, text, setStrokeStyle } = createScene();
		drawUnit(
			scene,
			{ kind: "battleship", side: "cpu" },
			{ x: 100, y: 200 },
			{ hp: 0 },
		);
		expect(rectangle).toHaveBeenCalledWith(100, 200, 38, 24, 0xff9aa5);
		expect(setStrokeStyle).toHaveBeenCalledWith(2, 0xffffff);
		expect(text).toHaveBeenCalledWith(
			100,
			200,
			"艦\n0",
			expect.objectContaining({ color: "#ffffff" }),
		);

		text.mockClear();
		drawUnit(scene, { kind: "fighter", side: "cpu" }, { x: 100, y: 200 });
		expect(text).not.toHaveBeenCalled();
	});
});