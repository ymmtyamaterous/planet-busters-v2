import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AttackEffect } from "./attack-effect";

describe("攻撃演出のレイアウト", () => {
	test("演出領域の大きさを制限し、結果とスキップ操作の領域を確保する", () => {
		const html = renderToStaticMarkup(<AttackEffect effect={{
			attacker: "自軍の戦艦",
			target: "CPUの戦闘機",
			result: "critical",
			damage: 8,
			remainingHp: 0,
		}} onComplete={() => {}} />);

		expect(html).toContain("aspect-[51/22]");
		expect(html).toContain("max-w-[510px]");
		expect(html).toContain("発射中…");
		expect(html).toContain("演出をスキップ");
	});
});