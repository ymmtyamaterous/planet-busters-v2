import type { Scene } from "phaser";

type UnitVisual = {
	kind: "battleship" | "fighter";
	side: "human" | "cpu";
};

export function drawUnit(
	scene: Scene,
	unit: UnitVisual,
	point: { x: number; y: number },
	options: { selected?: boolean; hp?: number } = {},
) {
	const color = unit.side === "human" ? 0x80c7ff : 0xff9aa5;
	const shape =
		unit.kind === "battleship"
			? scene.add.rectangle(point.x, point.y, 38, 24, color)
			: scene.add.triangle(point.x, point.y, 15, 0, 30, 32, 0, 32, color);
	shape.setStrokeStyle(
		options.selected ? 4 : 2,
		options.selected ? 0xfacc15 : 0xffffff,
	);

	if (options.hp !== undefined) {
		scene.add
			.text(
				point.x,
				point.y,
				`${unit.kind === "battleship" ? "艦" : "機"}\n${options.hp}`,
				{
					align: "center",
					color: "#ffffff",
					fontSize: "11px",
					fontStyle: "bold",
					stroke: "#101827",
					strokeThickness: 3,
				},
			)
			.setOrigin(0.5);
	}
}