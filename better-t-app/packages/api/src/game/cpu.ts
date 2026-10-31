// Ver1 の CPU 判断。新しいルールは別モジュールとして追加する。
import {
	canAttackTarget,
	getPlanetBySide,
	getReachablePositions,
	manhattanDistance,
} from "./engine";
import type { MapDefinition } from "./map";
import { UNIT_STATS } from "./rules";
import type {
	AttackTarget,
	DomainGameAction,
	GameSide,
	GameUnitSnapshot,
	GridPosition,
	MatchSnapshot,
} from "./types";

export function chooseCpuAction(
	state: MatchSnapshot,
	map: MapDefinition,
	side: GameSide = "cpu",
): DomainGameAction | null {
	if (state.status !== "active" || state.turnSide !== side) return null;
	const enemySide: GameSide = side === "cpu" ? "human" : "cpu";
	const unit = state.units
		.filter(
			(candidate) =>
				candidate.side === side &&
				!candidate.isDestroyed &&
				!candidate.hasActed,
		)
		.sort(compareUnits)[0];
	if (!unit) return { type: "endTurn" };

	const enemyPlanet = getPlanetBySide(state, enemySide);
	if (!enemyPlanet) return { type: "wait", unitId: unit.id };
	const planetTarget: AttackTarget = { type: "planet", side: enemySide };
	if (canAttackTarget(state, map, unit, planetTarget)) {
		return { type: "attack", unitId: unit.id, target: planetTarget };
	}

	const attackableUnits = state.units
		.filter((target) => target.side === enemySide && !target.isDestroyed)
		.filter((target) =>
			canAttackTarget(state, map, unit, { type: "unit", unitId: target.id }),
		)
		.sort(compareTargets);
	const killableUnit = attackableUnits.find(
		(target) => UNIT_STATS[unit.kind].attack >= target.hp,
	);
	if (killableUnit) {
		return attackUnit(unit, killableUnit.id);
	}
	if (attackableUnits[0]) return attackUnit(unit, attackableUnits[0].id);

	const reachable = getReachablePositions(state, map, unit);
	const attackPosition = reachable
		.filter((position) =>
			canAttackFromPosition(state, map, unit, position, planetTarget),
		)
		.sort((left, right) =>
			comparePositionDistance(left, right, enemyPlanet.position),
		)[0];
	if (attackPosition)
		return { type: "move", unitId: unit.id, destination: attackPosition };

	const closestPosition = [...reachable].sort((left, right) =>
		comparePositionDistance(left, right, enemyPlanet.position),
	)[0];
	return closestPosition
		? { type: "move", unitId: unit.id, destination: closestPosition }
		: { type: "wait", unitId: unit.id };
}

function attackUnit(unit: GameUnitSnapshot, unitId: string): DomainGameAction {
	return { type: "attack", unitId: unit.id, target: { type: "unit", unitId } };
}

function canAttackFromPosition(
	state: MatchSnapshot,
	map: MapDefinition,
	unit: GameUnitSnapshot,
	position: GridPosition,
	target: AttackTarget,
): boolean {
	return canAttackTarget(state, map, { ...unit, position }, target);
}

function compareUnits(left: GameUnitSnapshot, right: GameUnitSnapshot): number {
	return left.id.localeCompare(right.id);
}

function compareTargets(
	left: GameUnitSnapshot,
	right: GameUnitSnapshot,
): number {
	return (
		left.hp - right.hp ||
		comparePosition(left.position, right.position) ||
		left.id.localeCompare(right.id)
	);
}

function comparePositionDistance(
	left: GridPosition,
	right: GridPosition,
	target: GridPosition,
): number {
	return (
		manhattanDistance(left, target) - manhattanDistance(right, target) ||
		comparePosition(left, right)
	);
}

function comparePosition(left: GridPosition, right: GridPosition): number {
	return left.x - right.x || left.y - right.y;
}
