import type { AttackResolution, MatchSnapshot } from "@better-t-app/api/game";

export type AttackEffectData = Readonly<{
	attacker: string;
	target: string;
	result: AttackResolution["result"];
	damage: number;
	remainingHp: number;
}>;

export const RESULT_LABELS = {
	miss: "MISS",
	hit: "HIT",
	critical: "CRITICAL",
} as const;

export function toAttackEffectData(
	match: MatchSnapshot,
	resolution: AttackResolution,
): AttackEffectData {
	const attacker = match.units.find((unit) => unit.id === resolution.attackerId);
	const target = resolution.target;
	const targetUnit = target.type === "unit"
		? match.units.find((unit) => unit.id === target.unitId)
		: undefined;
	const unitName = (kind: "fighter" | "battleship" | undefined) =>
		kind === "fighter" ? "戦闘機" : kind === "battleship" ? "戦艦" : "ユニット";
	return {
		attacker: `${attacker?.side === "cpu" ? "CPU" : "自軍"}の${unitName(attacker?.kind)}`,
		target: target.type === "planet"
			? `${target.side === "human" ? "自軍" : "CPU"}の主惑星`
			: `${targetUnit?.side === "human" ? "自軍" : "CPU"}の${unitName(targetUnit?.kind)}`,
		result: resolution.result,
		damage: resolution.damage,
		remainingHp: resolution.targetRemainingHp,
	};
}

export function attackWindowFeatures(screen: Pick<Screen, "availWidth" | "availHeight"> & { availLeft?: number; availTop?: number }): string {
	const width = 620;
	const height = 520;
	const left = (screen.availLeft ?? 0) + Math.max(0, Math.round((screen.availWidth - width) / 2));
	const top = (screen.availTop ?? 0) + Math.max(0, Math.round((screen.availHeight - height) / 2));
	return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
}

// The popup is opened before the asynchronous request, in the user gesture.
export function openAttackWindow(open: () => Window | null): Window | null {
	try {
		return open();
	} catch {
		return null;
	}
}

export function deliverAttackEffect(
	popup: Pick<Window, "closed" | "postMessage"> | null,
	effect: AttackEffectData,
	token: string,
	origin: string,
	onFallback: () => void,
) {
	try {
		if (popup && !popup.closed) {
			popup.postMessage({ type: "attack-effect", token, effect }, origin);
			return;
		}
	} catch {
		// A popup that cannot be reached is equivalent to a blocked popup.
	}
	onFallback();
}

export async function performAttack<T>(options: {
	begin: () => boolean;
	submit: () => Promise<T>;
	present: (response: T) => Promise<void> | void;
	abort: () => void;
	onFailure: () => Promise<void>;
}) {
	if (!options.begin()) return;
	try {
		const response = await options.submit();
		await options.present(response);
	} catch {
		options.abort();
		await options.onFailure();
	}
}

export function isEffectMessage(
	event: Pick<MessageEvent, "origin" | "source" | "data">,
	origin: string,
	source: Window,
	token: string,
): event is Pick<MessageEvent, "origin" | "source"> & { data: { type: "attack-effect"; token: string; effect: AttackEffectData } } {
	return event.origin === origin && event.source === source &&
		event.data?.type === "attack-effect" && event.data?.token === token;
}