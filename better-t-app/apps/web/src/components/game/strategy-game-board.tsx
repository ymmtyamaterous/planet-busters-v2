import { NEBULA_CROSSROADS_MAP } from "@better-t-app/api/game";
import { useEffect, useRef } from "react";

const CELL_SIZE = 70;
const BOARD_PADDING = 60;

export function StrategyGameBoard() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const parent = mountRef.current;
		if (!parent) return;

		let game: import("phaser").Game | undefined;
		let isDisposed = false;

		void import("phaser").then((Phaser) => {
			if (isDisposed) return;

			class StrategyBoardScene extends Phaser.Scene {
				constructor() {
					super("strategy-board-preview");
				}

				create() {
					const boardWidth = NEBULA_CROSSROADS_MAP.size.width * CELL_SIZE;
					const boardHeight = NEBULA_CROSSROADS_MAP.size.height * CELL_SIZE;
					this.cameras.main.setBackgroundColor("#080d1d");

					const grid = this.add.graphics();
					grid.lineStyle(1, 0x30415f, 0.8);
					for (let x = 0; x <= NEBULA_CROSSROADS_MAP.size.width; x += 1) {
						grid.lineBetween(
							BOARD_PADDING + x * CELL_SIZE,
							BOARD_PADDING,
							BOARD_PADDING + x * CELL_SIZE,
							BOARD_PADDING + boardHeight,
						);
					}
					for (let y = 0; y <= NEBULA_CROSSROADS_MAP.size.height; y += 1) {
						grid.lineBetween(
							BOARD_PADDING,
							BOARD_PADDING + y * CELL_SIZE,
							BOARD_PADDING + boardWidth,
							BOARD_PADDING + y * CELL_SIZE,
						);
					}

					const centerOf = ({ x, y }: { x: number; y: number }) => ({
						x: BOARD_PADDING + x * CELL_SIZE + CELL_SIZE / 2,
						y: BOARD_PADDING + y * CELL_SIZE + CELL_SIZE / 2,
					});

					for (const asteroid of NEBULA_CROSSROADS_MAP.asteroids) {
						const position = centerOf(asteroid);
						this.add
							.circle(position.x, position.y, 21, 0x69758a)
							.setStrokeStyle(2, 0xaab6c9);
					}

					for (const [side, planet] of Object.entries(
						NEBULA_CROSSROADS_MAP.planets,
					)) {
						const position = centerOf(planet);
						const color = side === "human" ? 0x4ca8ff : 0xf06a7b;
						this.add
							.circle(position.x, position.y, 27, color)
							.setStrokeStyle(3, 0xf4f6ff);
					}

					for (const unit of NEBULA_CROSSROADS_MAP.initialUnits) {
						const position = centerOf(unit.position);
						const color = unit.side === "human" ? 0x80c7ff : 0xff9aa5;
						if (unit.kind === "battleship") {
							this.add
								.rectangle(position.x, position.y, 38, 24, color)
								.setStrokeStyle(2, 0xffffff);
						} else {
							this.add
								.triangle(
									position.x,
									position.y,
									0,
									-17,
									15,
									15,
									-15,
									15,
									color,
								)
								.setStrokeStyle(2, 0xffffff);
						}
					}
				}
			}

			game = new Phaser.Game({
				type: Phaser.AUTO,
				parent,
				backgroundColor: "#080d1d",
				scale: {
					mode: Phaser.Scale.FIT,
					width:
						BOARD_PADDING * 2 + NEBULA_CROSSROADS_MAP.size.width * CELL_SIZE,
					height:
						BOARD_PADDING * 2 + NEBULA_CROSSROADS_MAP.size.height * CELL_SIZE,
				},
				scene: [StrategyBoardScene],
			});
		});

		return () => {
			isDisposed = true;
			game?.destroy(true);
		};
	}, []);

	return (
		<div
			aria-label="星雲の交差点の戦略マッププレビュー"
			className="min-w-[960px]"
			ref={mountRef}
			role="img"
		/>
	);
}
