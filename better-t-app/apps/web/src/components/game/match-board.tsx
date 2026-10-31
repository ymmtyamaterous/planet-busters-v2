import type {
	AttackTarget,
	GridPosition,
	MatchSnapshot,
} from "@better-t-app/api/game";
import { useEffect, useRef } from "react";

import {
	type BoardActionMode,
	getBoardAction,
	getBoardPresentation,
} from "./board-data";
import { drawUnit } from "./unit-visual";

const CELL_SIZE = 70;
const BOARD_PADDING = 60;

export type { BoardActionMode } from "./board-data";

type MatchBoardProps = {
	match: MatchSnapshot;
	selectedUnitId: string | null;
	actionMode: BoardActionMode;
	disabled: boolean;
	onSelectUnit: (unitId: string) => void;
	onMove: (destination: GridPosition) => void;
	onAttack: (target: AttackTarget) => void;
};

export function MatchBoard({
	match,
	selectedUnitId,
	actionMode,
	disabled,
	onSelectUnit,
	onMove,
	onAttack,
}: MatchBoardProps) {
	const mountRef = useRef<HTMLDivElement>(null);
	const presentation = getBoardPresentation(match, selectedUnitId);

	useEffect(() => {
		const parent = mountRef.current;
		if (!parent) return;

		let game: import("phaser").Game | undefined;
		let isDisposed = false;
		void import("phaser").then((Phaser) => {
			if (isDisposed) return;
			const { map, selectedUnit, reachablePositions, attackTargets } =
				presentation;
			const boardWidth = map.size.width * CELL_SIZE;
			const boardHeight = map.size.height * CELL_SIZE;
			const centerOf = ({ x, y }: GridPosition) => ({
				x: BOARD_PADDING + x * CELL_SIZE + CELL_SIZE / 2,
				y: BOARD_PADDING + y * CELL_SIZE + CELL_SIZE / 2,
			});
			class MatchBoardScene extends Phaser.Scene {
				constructor() {
					super("match-board");
				}

				create() {
					this.cameras.main.setBackgroundColor("#080d1d");
					const grid = this.add.graphics();
					grid.lineStyle(1, 0x30415f, 0.8);
					for (let x = 0; x <= map.size.width; x += 1) {
						grid.lineBetween(
							BOARD_PADDING + x * CELL_SIZE,
							BOARD_PADDING,
							BOARD_PADDING + x * CELL_SIZE,
							BOARD_PADDING + boardHeight,
						);
					}
					for (let y = 0; y <= map.size.height; y += 1) {
						grid.lineBetween(
							BOARD_PADDING,
							BOARD_PADDING + y * CELL_SIZE,
							BOARD_PADDING + boardWidth,
							BOARD_PADDING + y * CELL_SIZE,
						);
					}
					for (const position of actionMode === "attack" ? [] : reachablePositions) {
						const point = centerOf(position);
						this.add
							.rectangle(
								point.x,
								point.y,
								CELL_SIZE - 8,
								CELL_SIZE - 8,
								0x3b82f6,
								0.32,
							)
							.setStrokeStyle(2, 0x93c5fd);
						this.add.text(point.x - 25, point.y - 27, "+", { color: "#ffffff", fontSize: "18px" });
					}
					for (const { position } of attackTargets) {
						const point = centerOf(position);
						this.add
							.rectangle(
								point.x,
								point.y,
								CELL_SIZE - 8,
								CELL_SIZE - 8,
								0xef4444,
								0.32,
							)
							.setStrokeStyle(2, 0xfca5a5);
						this.add.text(point.x - 25, point.y - 27, "×", { color: "#ffffff", fontSize: "18px" });
					}
					for (const asteroid of map.asteroids) {
						const point = centerOf(asteroid);
						this.add
							.circle(point.x, point.y, 21, 0x69758a)
							.setStrokeStyle(2, 0xaab6c9);
					}
					for (const planet of match.planets) {
						const point = centerOf(planet.position);
						const color = planet.side === "human" ? 0x4ca8ff : 0xf06a7b;
						this.add
							.circle(point.x, point.y, 27, color)
							.setStrokeStyle(3, 0xf4f6ff);
						this.add
							.text(point.x, point.y + 34, `HP ${planet.hp}`, {
								color: "#f4f6ff",
								fontSize: "12px",
							})
							.setOrigin(0.5);
					}
					for (const unit of match.units.filter(
						(candidate) => !candidate.isDestroyed,
					)) {
						const point = centerOf(unit.position);
						drawUnit(this, unit, point, {
							selected: unit.id === selectedUnit?.id,
							hp: unit.hp,
						});
					}
					for (let y = 0; y < map.size.height; y += 1) {
						for (let x = 0; x < map.size.width; x += 1) {
							const position = { x, y };
							const action = getBoardAction(
								match,
								presentation,
								actionMode,
								position,
								disabled,
							);
							if (!action) continue;
							const point = centerOf(position);
							const zone = this.add
								.zone(point.x, point.y, CELL_SIZE, CELL_SIZE)
								.setInteractive({ useHandCursor: true });
							zone.on("pointerup", () => {
								if (action.type === "select") onSelectUnit(action.unitId);
								if (action.type === "move") onMove(action.destination);
								if (action.type === "attack") onAttack(action.target);
							});
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
					width: BOARD_PADDING * 2 + boardWidth,
					height: BOARD_PADDING * 2 + boardHeight,
				},
				scene: [MatchBoardScene],
			});
		});

		return () => {
			isDisposed = true;
			game?.destroy(true);
		};
	}, [actionMode, disabled, match, onAttack, onMove, onSelectUnit, presentation]);

	return (
		<div
			aria-label="戦略スペースバトルの対局マップ"
			className="min-w-[960px]"
			ref={mountRef}
			role="application"
		/>
	);
}
