// Ver1 の能力値。既存対局のため変更せず、新しい版は別定義にする。
import type { UnitKind, UnitStats } from "./types";

export const PLANET_HP = 30;
export const BASE_ACCURACY = 70;
export const CRITICAL_CHANCE = 10;
export const MIN_ACCURACY = 20;
export const MAX_ACCURACY = 95;

export const UNIT_STATS: Readonly<Record<UnitKind, UnitStats>> = {
	battleship: {
		hp: 12,
		movement: 2,
		attackRange: 4,
		attack: 4,
		accuracyModifier: { fighter: -10, battleship: 5, planet: 10 },
	},
	fighter: {
		hp: 5,
		movement: 4,
		attackRange: 2,
		attack: 2,
		accuracyModifier: { fighter: 20, battleship: 0, planet: -15 },
	},
};
