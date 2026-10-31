import {
	type AttackTarget,
	canAttackTarget,
	GAME_MAPS,
	type GameUnitSnapshot,
	type GridPosition,
	getReachablePositions,
	type MatchSnapshot,
} from "@better-t-app/api/game";

export type BoardPresentation = Readonly<{
	map: (typeof GAME_MAPS)[number];
	selectedUnit: GameUnitSnapshot | null;
	reachablePositions: readonly GridPosition[];
	attackTargets: readonly Readonly<{
		target: AttackTarget;
		position: GridPosition;
	}>[];
}>;

export type BoardActionMode = "move" | "attack" | null;

export type BoardAction =
	| { type: "select"; unitId: string }
	| { type: "move"; destination: GridPosition }
	| { type: "attack"; target: AttackTarget };

export function getBoardAction(
	match: MatchSnapshot,
	presentation: BoardPresentation,
	mode: BoardActionMode,
	position: GridPosition,
	disabled: boolean,
): BoardAction | null {
	if (disabled || match.status !== "active" || match.turnSide !== "human")
		return null;
	const isAtPosition = (candidate: GridPosition) =>
		candidate.x === position.x && candidate.y === position.y;
	if (mode === "move") {
		return presentation.reachablePositions.some(isAtPosition)
			? { type: "move", destination: position }
			: null;
	}
	if (mode === "attack") {
		const target = presentation.attackTargets.find((candidate) =>
			isAtPosition(candidate.position),
		)?.target;
		return target ? { type: "attack", target } : null;
	}
	const unit = match.units.find(
		(candidate) =>
			isAtPosition(candidate.position) &&
			candidate.side === "human" &&
			!candidate.isDestroyed &&
			!candidate.hasActed,
	);
	return unit ? { type: "select", unitId: unit.id } : null;
}

export function getBoardPresentation(
	match: MatchSnapshot,
	selectedUnitId: string | null,
): BoardPresentation {
	const map = GAME_MAPS.find((candidate) => candidate.key === match.mapKey);
	if (!map) throw new Error("対局のマップが見つかりません");
	const selectedUnit =
		match.units.find(
			(unit) =>
				unit.id === selectedUnitId &&
				unit.side === "human" &&
				!unit.isDestroyed &&
				!unit.hasActed &&
				match.status === "active" &&
				match.turnSide === "human",
		) ?? null;
	if (!selectedUnit) {
		return {
			map,
			selectedUnit: null,
			reachablePositions: [],
			attackTargets: [],
		};
	}
	const attackTargets = [
		...match.units
			.filter(
				(unit) =>
					!unit.isDestroyed &&
					canAttackTarget(match, map, selectedUnit, {
						type: "unit",
						unitId: unit.id,
					}),
			)
			.map((unit) => ({
				target: { type: "unit" as const, unitId: unit.id },
				position: unit.position,
			})),
		...match.planets
			.filter((planet) =>
				canAttackTarget(match, map, selectedUnit, {
					type: "planet",
					side: planet.side,
				}),
			)
			.map((planet) => ({
				target: { type: "planet" as const, side: planet.side },
				position: planet.position,
			})),
	];
	return {
		map,
		selectedUnit,
		reachablePositions: getReachablePositions(match, map, selectedUnit),
		attackTargets,
	};
}
