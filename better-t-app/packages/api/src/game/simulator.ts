import { chooseCpuAction } from "./cpu";
import { applyAction, canAttackTarget, findPath } from "./engine";
import { NEBULA_CROSSROADS_MAP, type MapDefinition } from "./map";
import { PLANET_HP, UNIT_STATS } from "./rules";
import type {
	AttackResolution,
	DomainGameAction,
	GameSide,
	MatchSnapshot,
	RandomNumberGenerator,
} from "./types";

export type SimulationEvent = Readonly<{
	turn: number;
	side: GameSide;
	action: DomainGameAction;
	attackResult?: AttackResolution;
}>;

export type SimulationResult = Readonly<{
	seed: number;
	state: MatchSnapshot;
	reason: "victory" | "unreachable" | "action_limit" | "no_action";
	initialUnreachableSides: readonly GameSide[];
	events: readonly SimulationEvent[];
}>;

export function createSimulationState(map: MapDefinition): MatchSnapshot {
	return {
		id: "simulation",
		status: "active",
		mode: "cpu",
		turnSide: "human",
		turnNumber: 1,
		mapKey: map.key,
		version: 1,
		winnerSide: null,
		planets: (["human", "cpu"] as const).map((side) => ({
			id: side,
			side,
			position: map.planets[side],
			hp: PLANET_HP,
		})),
		units: map.initialUnits.map((unit) => ({
			...unit,
			hp: UNIT_STATS[unit.kind].hp,
			hasActed: false,
			isDestroyed: false,
		})),
		recentActions: [],
	};
}

// Reproducible simulation only; production combat uses cryptographic randomness.
export function seededRandom(seed: number): RandomNumberGenerator {
	let value = (seed + 0x9e3779b9) >>> 0;
	value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
	value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
	value = (value ^ (value >>> 15)) >>> 0;
	return {
		nextInt(maxExclusive) {
			value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
			return Math.floor((value / 0x100000000) * maxExclusive);
		},
	};
}

// Ignore other units: this proves impossibility only when terrain alone blocks all
// surviving units. Temporary unit blockages must not be reported as unreachable.
export function canEventuallyAttackPlanet(
	state: MatchSnapshot,
	map: MapDefinition,
	side: GameSide,
): boolean {
	const enemy: GameSide = side === "human" ? "cpu" : "human";
	const emptyState = { ...state, units: [] };
	return state.units.some((unit) => {
		if (unit.side !== side || unit.isDestroyed) return false;
		for (let y = 0; y < map.size.height; y++) {
			for (let x = 0; x < map.size.width; x++) {
				const position = { x, y };
				if (
					canAttackTarget(emptyState, map, { ...unit, position }, {
						type: "planet",
						side: enemy,
					}) &&
					findPath(emptyState, map, unit.position, position) !== null
				) return true;
			}
		}
		return false;
	});
}

export function simulateMatch(options: {
	seed: number;
	map?: MapDefinition;
	initialState?: MatchSnapshot;
	maxActions?: number;
}): SimulationResult {
	const map = options.map ?? NEBULA_CROSSROADS_MAP;
	const maxActions = options.maxActions ?? 2000;
	if (!Number.isSafeInteger(maxActions) || maxActions < 1) {
		throw new RangeError("maxActions は正の整数である必要があります");
	}
	let state = options.initialState ?? createSimulationState(map);
	const initialUnreachableSides = (["human", "cpu"] as const).filter(
		(side) => !canEventuallyAttackPlanet(state, map, side),
	);
	const random = seededRandom(options.seed);
	const events: SimulationEvent[] = [];
	let reason: SimulationResult["reason"] = "action_limit";
	while (state.status === "active" && events.length < maxActions) {
		// Recheck after a unit dies; both sides being unable to attack a planet
		// means no sequence of legal actions can produce a winner.
		if (
			(events.length === 0 || events.at(-1)?.attackResult?.targetRemainingHp === 0) &&
			!canEventuallyAttackPlanet(state, map, "human") &&
			!canEventuallyAttackPlanet(state, map, "cpu")
		) {
			reason = "unreachable";
			break;
		}
		const action = chooseCpuAction(state, map, state.turnSide);
		if (!action) {
			reason = "no_action";
			break;
		}
		const result = applyAction(state, map, action, random);
		events.push({
			turn: state.turnNumber,
			side: state.turnSide,
			action,
			attackResult: result.attackResult,
		});
		state = result.state;
	}
	if (state.status === "completed") reason = "victory";
	return { seed: options.seed, state, reason, initialUnreachableSides, events };
}