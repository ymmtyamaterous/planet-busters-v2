import { describe, expect, mock, test } from "bun:test";
import type { AttackResolution, MatchSnapshot } from "@better-t-app/api/game";

import { attackWindowFeatures, deliverAttackEffect, isEffectMessage, openAttackWindow, performAttack, RESULT_LABELS, toAttackEffectData } from "./attack-effect-data";

const match: MatchSnapshot = {
	id: "match", status: "active", mode: "cpu", turnSide: "human", turnNumber: 1,
	mapKey: "map", version: 1, winnerSide: null, planets: [], recentActions: [],
	units: [
		{ id: "attacker", side: "human", kind: "battleship", position: { x: 0, y: 0 }, hp: 12, hasActed: false, isDestroyed: false },
		{ id: "target", side: "cpu", kind: "fighter", position: { x: 1, y: 0 }, hp: 5, hasActed: false, isDestroyed: false },
	],
};
const resolution: AttackResolution = { attackerId: "attacker", target: { type: "unit", unitId: "target" }, accuracy: 60, roll: 0, result: "critical", damage: 8, targetRemainingHp: 0 };
const effect = toAttackEffectData(match, resolution);

describe("攻撃演出", () => {
	test("利用可能なモニター領域の中央にポップアップを配置する", () => {
		expect(attackWindowFeatures({ availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1080 }))
			.toBe("popup=yes,width=620,height=620,left=650,top=230");
		expect(attackWindowFeatures({ availLeft: -1920, availTop: 40, availWidth: 1920, availHeight: 1040 }))
			.toBe("popup=yes,width=620,height=620,left=-1270,top=250");
		expect(attackWindowFeatures({ availLeft: 100, availTop: 50, availWidth: 400, availHeight: 300 }))
			.toBe("popup=yes,width=620,height=620,left=100,top=50");
		expect(attackWindowFeatures({ availWidth: 1920, availHeight: 1080 }))
			.toBe("popup=yes,width=620,height=620,left=650,top=230");
	});

	test("攻撃前の状態と確定結果から撃破後も表示可能なデータを作る", () => {
		expect(effect).toEqual({ attacker: "自軍の戦艦", target: "CPUの戦闘機", result: "critical", damage: 8, remainingHp: 0 });
		expect(toAttackEffectData(match, { ...resolution, target: { type: "planet", side: "cpu" } }).target).toBe("CPUの主惑星");
		expect(Object.values(RESULT_LABELS)).toEqual(["MISS", "HIT", "CRITICAL"]);
	});

	test("ポップアップが拒否された場合や送信に失敗した場合はモーダルへ切り替える", () => {
		const fallback = mock(() => {});
		expect(openAttackWindow(() => null)).toBeNull();
		expect(openAttackWindow(() => { throw new Error("blocked"); })).toBeNull();
		deliverAttackEffect(null, effect, "token", "https://example.com", fallback);
		deliverAttackEffect({ closed: false, postMessage: () => { throw new Error("closed"); } }, effect, "token", "https://example.com", fallback);
		expect(fallback).toHaveBeenCalledTimes(2);
	});

	test("送信先を同一オリジンに固定し、送信元とトークンを検証する", () => {
		const postMessage = mock(() => {});
		const fallback = mock(() => {});
		deliverAttackEffect({ closed: false, postMessage }, effect, "token", "https://example.com", fallback);
		expect(postMessage).toHaveBeenCalledWith({ type: "attack-effect", token: "token", effect }, "https://example.com");
		expect(fallback).not.toHaveBeenCalled();
		const source = {} as Window;
		const event = { origin: "https://example.com", source, data: { type: "attack-effect", token: "token", effect } };
		expect(isEffectMessage(event, event.origin, source, "token")).toBe(true);
		expect(isEffectMessage({ ...event, origin: "https://other.example" }, event.origin, source, "token")).toBe(false);
		expect(isEffectMessage(event, event.origin, {} as Window, "token")).toBe(false);
		expect(isEffectMessage(event, event.origin, source, "other")).toBe(false);
	});

	test("演出表示や二重操作で攻撃が二重送信されない", async () => {
		let locked = false;
		let resolve!: (value: AttackResolution) => void;
		const submit = mock(() => new Promise<AttackResolution>((done) => { resolve = done; }));
		const present = mock((value: AttackResolution) => { expect(value).toEqual(resolution); });
		const options = { begin: () => { if (locked) return false; locked = true; return true; }, submit, present, abort: mock(() => {}), onFailure: mock(async () => {}) };
		const first = performAttack(options);
		await performAttack(options);
		expect(submit).toHaveBeenCalledTimes(1);
		resolve(resolution);
		await first;
		expect(present).toHaveBeenCalledTimes(1);
		expect(submit).toHaveBeenCalledTimes(1);
	});

	test("通信失敗時は演出を閉じて対局状態を再取得する", async () => {
		const abort = mock(() => {});
		const onFailure = mock(async () => {});
		const present = mock(() => {});
		await performAttack({ begin: () => true, submit: async () => { throw new Error("network"); }, present, abort, onFailure });
		expect(abort).toHaveBeenCalledTimes(1);
		expect(onFailure).toHaveBeenCalledTimes(1);
		expect(present).not.toHaveBeenCalled();
	});
});