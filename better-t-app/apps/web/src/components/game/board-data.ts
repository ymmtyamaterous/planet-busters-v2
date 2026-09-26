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
