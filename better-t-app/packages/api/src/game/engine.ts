import type { MapDefinition } from "./map";
import {
	BASE_ACCURACY,
	CRITICAL_CHANCE,
	MAX_ACCURACY,
	MIN_ACCURACY,
	UNIT_STATS,
} from "./rules";
import type {
	AttackResolution,
	AttackResultKind,
	AttackTarget,
	DomainGameAction,
	GameSide,
	GameUnitSnapshot,
	GridPosition,
	MatchSnapshot,
	PlanetSnapshot,
	RandomNumberGenerator,
	UnitKind,
} from "./types";

const DIRECTIONS: readonly GridPosition[] = [
	{ x: 0, y: -1 },
	{ x: -1, y: 0 },
	{ x: 1, y: 0 },
	{ x: 0, y: 1 },
];

export type DomainActionResult = Readonly<{
	state: MatchSnapshot;
	attackResult?: AttackResolution;
}>;

export class InvalidGameActionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidGameActionError";
	}
}

export function arePositionsEqual(
	left: GridPosition,
	right: GridPosition,
): boolean {
	return left.x === right.x && left.y === right.y;
}

export function manhattanDistance(
	left: GridPosition,
	right: GridPosition,
): number {
	return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

export function getUnitById(
	state: MatchSnapshot,
	unitId: string,
): GameUnitSnapshot | undefined {
	return state.units.find((unit) => unit.id === unitId);
}

export function getPlanetBySide(
	state: MatchSnapshot,
	side: GameSide,
): PlanetSnapshot | undefined {
	return state.planets.find((planet) => planet.side === side);
}

export function isPositionBlocked(
	state: MatchSnapshot,
	map: MapDefinition,
	position: GridPosition,
): boolean {
	return (
		map.asteroids.some((asteroid) => arePositionsEqual(asteroid, position)) ||
		state.planets.some((planet) =>
			arePositionsEqual(planet.position, position),
		) ||
		state.units.some(
			(unit) => !unit.isDestroyed && arePositionsEqual(unit.position, position),
		)
	);
}

export function findPath(
	state: MatchSnapshot,
	map: MapDefinition,
	start: GridPosition,
	destination: GridPosition,
): readonly GridPosition[] | null {
	if (arePositionsEqual(start, destination)) return [];
	if (
		destination.x < 0 ||
		destination.x >= map.size.width ||
		destination.y < 0 ||
		destination.y >= map.size.height ||
		isPositionBlocked(state, map, destination)
	) {
		return null;
	}

	const queue: { position: GridPosition; path: readonly GridPosition[] }[] = [
		{ position: start, path: [] },
	];
	const visited = new Set([positionKey(start)]);
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		for (const direction of DIRECTIONS) {
			const next = {
				x: current.position.x + direction.x,
				y: current.position.y + direction.y,
			};
			if (
				next.x < 0 ||
				next.x >= map.size.width ||
				next.y < 0 ||
				next.y >= map.size.height ||
				isPositionBlocked(state, map, next)
			) {
				continue;
			}
			const key = positionKey(next);
			if (visited.has(key)) continue;
			const path = [...current.path, next];
			if (arePositionsEqual(next, destination)) return path;
			visited.add(key);
			queue.push({ position: next, path });
		}
	}
	return null;
}

export function getReachablePositions(
	state: MatchSnapshot,
	map: MapDefinition,
	unit: GameUnitSnapshot,
): readonly GridPosition[] {
	const positions: GridPosition[] = [];
	for (let y = 0; y < map.size.height; y += 1) {
		for (let x = 0; x < map.size.width; x += 1) {
			const position = { x, y };
			const path = findPath(state, map, unit.position, position);
			if (
				path &&
				path.length > 0 &&
				path.length <= UNIT_STATS[unit.kind].movement
			) {
				positions.push(position);
			}
		}
	}
	return positions;
}

export function hasClearLineOfSight(
	map: MapDefinition,
	from: GridPosition,
	to: GridPosition,
): boolean {
	if (from.x !== to.x && from.y !== to.y) return false;
	const distance = manhattanDistance(from, to);
	if (distance === 0) return false;
	const stepX = Math.sign(to.x - from.x);
	const stepY = Math.sign(to.y - from.y);
	for (let step = 1; step < distance; step += 1) {
		const position = { x: from.x + stepX * step, y: from.y + stepY * step };
		if (
			map.asteroids.some((asteroid) => arePositionsEqual(asteroid, position))
		) {
			return false;
		}
	}
	return true;
}

export function canAttackTarget(
	state: MatchSnapshot,
	map: MapDefinition,
	attacker: GameUnitSnapshot,
	target: AttackTarget,
): boolean {
	if (attacker.isDestroyed) return false;
	const targetEntity = getTargetEntity(state, target);
	if (!targetEntity || targetEntity.side === attacker.side) return false;
	const distance = manhattanDistance(attacker.position, targetEntity.position);
	return (
		distance > 0 &&
		distance <= UNIT_STATS[attacker.kind].attackRange &&
		hasClearLineOfSight(map, attacker.position, targetEntity.position)
	);
}

export function calculateAccuracy(
	attackerKind: UnitKind,
	targetKind: UnitKind | "planet",
): number {
	const accuracy =
		BASE_ACCURACY + UNIT_STATS[attackerKind].accuracyModifier[targetKind];
	return Math.min(MAX_ACCURACY, Math.max(MIN_ACCURACY, accuracy));
}

export function resolveAttack(
	state: MatchSnapshot,
	map: MapDefinition,
	attackerId: string,
	target: AttackTarget,
	random: RandomNumberGenerator,
): DomainActionResult {
	const attacker = getActionableUnit(state, attackerId);
	if (!canAttackTarget(state, map, attacker, target)) {
		throw new InvalidGameActionError("攻撃対象が不正です");
	}
	const targetEntity = getTargetEntity(state, target);
	if (!targetEntity) throw new InvalidGameActionError("攻撃対象が存在しません");
	const targetKind =
		target.type === "unit" ? getUnitById(state, target.unitId)?.kind : "planet";
	if (!targetKind) throw new InvalidGameActionError("攻撃対象が存在しません");
	const accuracy = calculateAccuracy(attacker.kind, targetKind);
	const roll = random.nextInt(100);
	if (!Number.isInteger(roll) || roll < 0 || roll >= 100) {
		throw new RangeError("乱数生成器は 0 から 99 の整数を返す必要があります");
	}
	const result: AttackResultKind =
		roll < CRITICAL_CHANCE ? "critical" : roll < accuracy ? "hit" : "miss";
	const damage =
		result === "miss"
			? 0
			: UNIT_STATS[attacker.kind].attack * (result === "critical" ? 2 : 1);
	const remainingHp = Math.max(0, targetEntity.hp - damage);
	let nextState = markUnitActed(state, attacker.id);
	if (target.type === "unit") {
		nextState = {
			...nextState,
			units: nextState.units.map((unit) =>
				unit.id === target.unitId
					? { ...unit, hp: remainingHp, isDestroyed: remainingHp === 0 }
					: unit,
			),
		};
	} else {
		nextState = {
			...nextState,
			planets: nextState.planets.map((planet) =>
				planet.side === target.side ? { ...planet, hp: remainingHp } : planet,
			),
		};
		if (remainingHp === 0) {
			nextState = {
				...nextState,
				status: "completed",
				winnerSide: attacker.side,
			};
		}
	}
	return {
		state: nextState,
		attackResult: {
			attackerId,
			target,
			accuracy,
			roll,
			result,
			damage,
			targetRemainingHp: remainingHp,
		},
	};
}

export function startTurn(state: MatchSnapshot, side: GameSide): MatchSnapshot {
	if (state.status !== "active") return state;
	return {
		...state,
		turnSide: side,
		turnNumber: side === "human" ? state.turnNumber + 1 : state.turnNumber,
		units: state.units.map((unit) =>
			unit.side === side && !unit.isDestroyed
				? { ...unit, hasActed: false }
				: unit,
		),
	};
}

export function endTurn(state: MatchSnapshot): MatchSnapshot {
	if (state.status !== "active") return state;
	return startTurn(state, state.turnSide === "human" ? "cpu" : "human");
}

export function areAllUnitsActed(
	state: MatchSnapshot,
	side = state.turnSide,
): boolean {
	return state.units
		.filter((unit) => unit.side === side && !unit.isDestroyed)
		.every((unit) => unit.hasActed);
}

export function applyAction(
	state: MatchSnapshot,
	map: MapDefinition,
	action: DomainGameAction,
	random: RandomNumberGenerator,
): DomainActionResult {
	if (state.status !== "active")
		throw new InvalidGameActionError("対局は終了しています");
	if (action.type === "endTurn") return { state: endTurn(state) };
	if (action.type === "attack")
		return resolveAttack(state, map, action.unitId, action.target, random);
	const unit = getActionableUnit(state, action.unitId);
	if (action.type === "wait") return { state: markUnitActed(state, unit.id) };
	const path = findPath(state, map, unit.position, action.destination);
	if (
		!path ||
		path.length === 0 ||
		path.length > UNIT_STATS[unit.kind].movement
	) {
		throw new InvalidGameActionError("移動先に到達できません");
	}
	return {
		state: markUnitActed(
			{
				...state,
				units: state.units.map((item) =>
					item.id === unit.id
						? { ...item, position: action.destination }
						: item,
				),
			},
			unit.id,
		),
	};
}

function getActionableUnit(
	state: MatchSnapshot,
	unitId: string,
): GameUnitSnapshot {
	const unit = getUnitById(state, unitId);
	if (
		!unit ||
		unit.isDestroyed ||
		unit.side !== state.turnSide ||
		unit.hasActed
	) {
		throw new InvalidGameActionError("このユニットは行動できません");
	}
	return unit;
}

function getTargetEntity(
	state: MatchSnapshot,
	target: AttackTarget,
): (GameUnitSnapshot | PlanetSnapshot) | undefined {
	if (target.type === "planet") return getPlanetBySide(state, target.side);
	const unit = getUnitById(state, target.unitId);
	return unit?.isDestroyed ? undefined : unit;
}

function markUnitActed(state: MatchSnapshot, unitId: string): MatchSnapshot {
	return {
		...state,
		units: state.units.map((unit) =>
			unit.id === unitId ? { ...unit, hasActed: true } : unit,
		),
	};
}

function positionKey(position: GridPosition): string {
	return `${position.x},${position.y}`;
}
