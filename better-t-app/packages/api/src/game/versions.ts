import { chooseCpuAction } from "./cpu";
import {
	applyAction,
	canAttackTarget,
	getReachablePositions,
	startTurn,
} from "./engine";
import { GAME_MAPS, type MapDefinition } from "./map";
import { PLANET_HP, UNIT_STATS } from "./rules";

export const DEFAULT_RULES_VERSION = "v1";
export const DEFAULT_MAP_VERSION = "v1";
export const CURRENT_RULES_VERSION = "v1";
export const CURRENT_MAP_VERSION = "v1";

// 各版は独立した実装を参照する。既存の版を上書きしない。
export type RulesDefinition = Readonly<{
	planetHp: number;
	unitStats: typeof UNIT_STATS;
	applyAction: typeof applyAction;
	startTurn: typeof startTurn;
	chooseCpuAction: typeof chooseCpuAction;
	canAttackTarget: typeof canAttackTarget;
	getReachablePositions: typeof getReachablePositions;
}>;

const rulesByVersion: ReadonlyMap<string, RulesDefinition> = new Map([
	["v1", { planetHp: PLANET_HP, unitStats: UNIT_STATS, applyAction, startTurn, chooseCpuAction, canAttackTarget, getReachablePositions }],
]);
const mapsByVersion: ReadonlyMap<string, readonly MapDefinition[]> = new Map([
	["v1", GAME_MAPS],
]);

export class UnsupportedGameDefinitionError extends Error {
	constructor(readonly definition: "rules" | "map", readonly version: string) {
		super(`未対応の${definition === "rules" ? "ルール" : "マップ"}バージョンです: ${version}`);
		this.name = "UnsupportedGameDefinitionError";
	}
}

export function resolveRules(version: string = DEFAULT_RULES_VERSION): RulesDefinition {
	const rules = rulesByVersion.get(version);
	if (!rules) throw new UnsupportedGameDefinitionError("rules", version);
	return rules;
}

export function resolveMap(key: string, version: string = DEFAULT_MAP_VERSION): MapDefinition {
	const maps = mapsByVersion.get(version);
	if (!maps) throw new UnsupportedGameDefinitionError("map", version);
	const map = maps.find((candidate) => candidate.key === key);
	if (!map) throw new Error("指定されたマップは存在しません");
	return map;
}