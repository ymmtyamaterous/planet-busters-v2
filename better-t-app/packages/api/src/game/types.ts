export const GAME_SIDES = ["human", "cpu"] as const;
export type GameSide = (typeof GAME_SIDES)[number];

export const UNIT_KINDS = ["battleship", "fighter"] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const MATCH_STATUSES = ["active", "completed", "abandoned"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_MODES = ["cpu"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const ACTION_KINDS = [
	"move",
	"attack",
	"wait",
	"endTurn",
	"surrender",
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export const ATTACK_RESULTS = ["miss", "hit", "critical"] as const;
export type AttackResultKind = (typeof ATTACK_RESULTS)[number];

export type GridPosition = Readonly<{
	x: number;
	y: number;
}>;

export type GridSize = Readonly<{
	width: number;
	height: number;
}>;

export type UnitStats = Readonly<{
	hp: number;
	movement: number;
	attackRange: number;
	attack: number;
	accuracyModifier: Readonly<Record<UnitKind | "planet", number>>;
}>;

export type GameUnitSnapshot = Readonly<{
	id: string;
	side: GameSide;
	kind: UnitKind;
	position: GridPosition;
	hp: number;
	hasActed: boolean;
	isDestroyed: boolean;
}>;

export type PlanetSnapshot = Readonly<{
	id: string;
	side: GameSide;
	position: GridPosition;
	hp: number;
}>;

export type GameActionSnapshot = Readonly<{
	id: string;
	kind: ActionKind;
	side: GameSide;
	turnNumber: number;
	createdAt: string;
	summary: string;
}>;

export type MatchSnapshot = Readonly<{
	id: string;
	status: MatchStatus;
	mode: MatchMode;
	turnSide: GameSide;
	turnNumber: number;
	mapKey: string;
	version: number;
	winnerSide: GameSide | null;
	planets: readonly PlanetSnapshot[];
	units: readonly GameUnitSnapshot[];
	recentActions: readonly GameActionSnapshot[];
}>;
