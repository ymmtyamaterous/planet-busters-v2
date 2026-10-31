import {
	type AttackTarget,
	type GameUnitSnapshot,
	type GridPosition,
	type MapDefinition,
	type MatchSnapshot,
	resolveMap,
	resolveRules,
} from "@better-t-app/api/game";

export type BoardPresentation = Readonly<{
	map: MapDefinition;
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
	const target = presentation.attackTargets.find((candidate) =>
		isAtPosition(candidate.position),
	)?.target;
	if (target) return { type: "attack", target };
	if (mode === "attack") {
		return null;
	}
	if (presentation.reachablePositions.some(isAtPosition)) {
		return { type: "move", destination: position };
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

export function confirmAttack(
	presentation: BoardPresentation,
	target: AttackTarget,
	disabled: boolean,
	confirm: (message: string) => boolean,
): boolean {
	const unit = presentation.selectedUnit;
	const candidate = presentation.attackTargets.find(({ target: available }) =>
		available.type === "unit" && target.type === "unit"
			? available.unitId === target.unitId
			: available.type === "planet" && target.type === "planet" && available.side === target.side,
	);
	if (disabled || !unit || !candidate) return false;
	const unitName = unit.kind === "battleship" ? "戦艦" : "戦闘機";
	const targetName = target.type === "planet" ? "敵主惑星" : "敵ユニット";
	return confirm(
		`${unitName}で (${candidate.position.x}, ${candidate.position.y}) の${targetName}を攻撃しますか？\n攻撃すると、このターンは移動できません。`,
	);
}

export function requestMove(
	presentation: BoardPresentation,
	destination: GridPosition,
	disabled: boolean,
	confirm: (message: string) => boolean,
	submit: (unitId: string, destination: GridPosition) => void,
): void {
	const unit = presentation.selectedUnit;
	if (
		disabled ||
		!unit ||
		!presentation.reachablePositions.some(
			(position) => position.x === destination.x && position.y === destination.y,
		)
	) return;
	const name = unit.kind === "battleship" ? "戦艦" : "戦闘機";
	if (
		confirm(
			`${name}を (${unit.position.x}, ${unit.position.y}) から (${destination.x}, ${destination.y}) に移動しますか？\n移動すると、このターンは攻撃できません。`,
		)
	) {
		submit(unit.id, destination);
	}
}

export function getBoardPresentation(
	match: MatchSnapshot,
	selectedUnitId: string | null,
): BoardPresentation {
	const map = resolveMap(match.mapKey, match.mapVersion);
	const rules = resolveRules(match.rulesVersion);
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
					rules.canAttackTarget(match, map, selectedUnit, {
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
				rules.canAttackTarget(match, map, selectedUnit, {
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
		reachablePositions: rules.getReachablePositions(match, map, selectedUnit),
		attackTargets,
	};
}
