import { describe, expect, test } from "bun:test";
import { recoverMutationFailure } from "./mutation-recovery";

describe("操作失敗からの復旧", () => {
	test("通信失敗では結果が不明なため状態を再取得する", async () => {
		const calls: string[] = [];
		await recoverMutationFailure({
			error: new Error("通信に失敗しました"),
			refresh: async () => { calls.push("refresh"); },
			notify: (message, kind) => calls.push(`${kind}:${message}`),
		});
		expect(calls).toEqual(["refresh", "error:通信に失敗しました"]);
	});

	test("競合時は状態を再取得し、通知する", async () => {
		const calls: string[] = [];
		await recoverMutationFailure({
			error: Object.assign(new Error("conflict"), { data: { code: "STALE_MATCH_VERSION" } }),
			refresh: async () => { calls.push("refresh"); },
			notify: (_message, kind) => calls.push(kind),
		});
		expect(calls).toEqual(["refresh", "info"]);
	});

	test("攻撃の失敗は演出側で再取得し、二重に取得しない", async () => {
		let refreshed = false;
		await recoverMutationFailure({
			error: new Error("通信エラー"),
			attack: true,
			refresh: async () => { refreshed = true; },
			notify: () => {},
		});
		expect(refreshed).toBe(false);
	});
});