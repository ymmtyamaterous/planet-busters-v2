import { describe, expect, test } from "bun:test";
import {
	calculateAccuracy,
	CRITICAL_CHANCE,
	UNIT_STATS,
} from "@better-t-app/api/game";
import { renderToStaticMarkup } from "react-dom/server";

import { UnitGuide } from "./unit-guide";

describe("UnitGuide", () => {
	test("両ユニットの能力と対象ごとの命中率をゲームルールから表示する", () => {
		const html = renderToStaticMarkup(<UnitGuide />);
		const text = html.replace(/<[^>]*>/g, "");

		for (const [kind, name] of [
			["fighter", "戦闘機"],
			["battleship", "戦艦"],
		] as const) {
			const stats = UNIT_STATS[kind];
			expect(text).toContain(name);
			expect(text).toContain(
				`HP ${stats.hp} · 移動 ${stats.movement}マス · 射程 ${stats.attackRange}マス · 攻撃力 ${stats.attack}`,
			);
			expect(text).toContain(
				`命中率：対戦闘機 ${calculateAccuracy(kind, "fighter")}% / 対戦艦 ${calculateAccuracy(kind, "battleship")}% / 対主惑星 ${calculateAccuracy(kind, "planet")}%`,
			);
		}
		expect(text).toContain(`クリティカルは ${CRITICAL_CHANCE}%`);
	});

	test("開閉できる説明に移動、射線、行動回数の制限を表示する", () => {
		const html = renderToStaticMarkup(<UnitGuide />);
		expect(html).toContain("<details");
		expect(html).toContain("<summary");
		expect(html).toContain("上下左右に進みます");
		expect(html).toContain("斜めには攻撃できず、小惑星が射線を遮ります");
		expect(html).toContain("移動後に同じターンで攻撃することはできません");
	});
});