import type { GameSide, GridPosition, GridSize, UnitKind } from "./types";

export const DEFAULT_MAP_KEY = "nebula-crossroads";
export const GAME_GRID_SIZE: GridSize = { width: 12, height: 8 };

export type InitialUnitPlacement = Readonly<{
	id: string;
	side: GameSide;
	kind: UnitKind;
	position: GridPosition;
}>;

export type MapDefinition = Readonly<{
	key: string;
	name: string;
	size: GridSize;
	asteroids: readonly GridPosition[];
	planets: Readonly<Record<GameSide, GridPosition>>;
	initialUnits: readonly InitialUnitPlacement[];
}>;

export const NEBULA_CROSSROADS_MAP: MapDefinition = {
	key: DEFAULT_MAP_KEY,
	name: "星雲の交差点",
	size: GAME_GRID_SIZE,
	asteroids: [
		{ x: 4, y: 1 },
		{ x: 7, y: 1 },
		{ x: 2, y: 2 },
		{ x: 5, y: 3 },
		{ x: 8, y: 3 },
		{ x: 3, y: 5 },
		{ x: 6, y: 5 },
		{ x: 9, y: 5 },
		{ x: 4, y: 6 },
		{ x: 7, y: 6 },
	],
	planets: {
		human: { x: 0, y: 3 },
		cpu: { x: 11, y: 4 },
	},
	initialUnits: [
		{
			id: "human-battleship-1",
			side: "human",
			kind: "battleship",
			position: { x: 1, y: 2 },
		},
		{
			id: "human-battleship-2",
			side: "human",
			kind: "battleship",
			position: { x: 1, y: 5 },
		},
		{
			id: "human-fighter-1",
			side: "human",
			kind: "fighter",
			position: { x: 2, y: 1 },
		},
		{
			id: "human-fighter-2",
			side: "human",
			kind: "fighter",
			position: { x: 2, y: 3 },
		},
		{
			id: "human-fighter-3",
			side: "human",
			kind: "fighter",
			position: { x: 2, y: 6 },
		},
		{
			id: "cpu-battleship-1",
			side: "cpu",
			kind: "battleship",
			position: { x: 10, y: 2 },
		},
		{
			id: "cpu-battleship-2",
			side: "cpu",
			kind: "battleship",
			position: { x: 10, y: 5 },
		},
		{
			id: "cpu-fighter-1",
			side: "cpu",
			kind: "fighter",
			position: { x: 9, y: 1 },
		},
		{
			id: "cpu-fighter-2",
			side: "cpu",
			kind: "fighter",
			position: { x: 9, y: 4 },
		},
		{
			id: "cpu-fighter-3",
			side: "cpu",
			kind: "fighter",
			position: { x: 9, y: 6 },
		},
	],
};

export const GAME_MAPS = [NEBULA_CROSSROADS_MAP] as const;

export function isPositionInBounds(
	position: GridPosition,
	size: GridSize,
): boolean {
	return (
		position.x >= 0 &&
		position.x < size.width &&
		position.y >= 0 &&
		position.y < size.height
	);
}

export function validateMapDefinition(map: MapDefinition): readonly string[] {
	const errors: string[] = [];
	const occupiedPositions = new Map<string, string>();
	const addOccupiedPosition = (position: GridPosition, label: string) => {
		if (!isPositionInBounds(position, map.size)) {
			errors.push(`${label} がマップ範囲外です`);
			return;
		}

		const positionKey = `${position.x},${position.y}`;
		const existing = occupiedPositions.get(positionKey);
		if (existing) {
			errors.push(`${label} が ${existing} と同じマスを占有しています`);
			return;
		}
		occupiedPositions.set(positionKey, label);
	};

	for (const asteroid of map.asteroids) addOccupiedPosition(asteroid, "小惑星");
	addOccupiedPosition(map.planets.human, "人間陣営の主惑星");
	addOccupiedPosition(map.planets.cpu, "CPU 陣営の主惑星");
	for (const unit of map.initialUnits)
		addOccupiedPosition(unit.position, unit.id);

	for (const side of ["human", "cpu"] as const) {
		const units = map.initialUnits.filter((unit) => unit.side === side);
		const battleships = units.filter((unit) => unit.kind === "battleship");
		const fighters = units.filter((unit) => unit.kind === "fighter");
		if (battleships.length !== 2 || fighters.length !== 3) {
			errors.push(`${side} 陣営の初期編成が戦艦2隻・戦闘機3機ではありません`);
		}
	}

	return errors;
}
