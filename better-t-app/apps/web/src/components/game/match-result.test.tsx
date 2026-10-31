import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MatchResult, MatchResultCard } from "./match-result";

describe("対局結果", () => {
	test("勝敗とターン数、盤面確認・ダッシュボードへの操作を表示する", () => {
		const victory = renderToStaticMarkup(<MatchResultCard onClose={() => {}} turnNumber={7} winnerSide="human" />);
		expect(victory).toContain("勝利！");
		expect(victory).toContain("VICTORY");
		expect(victory).toContain("7ターン目");
		expect(victory).toContain("盤面を確認");
		expect(victory).toContain('href="/dashboard"');
		const defeat = renderToStaticMarkup(<MatchResultCard onClose={() => {}} turnNumber={3} winnerSide="cpu" />);
		expect(defeat).toContain("敗北");
		expect(defeat).toContain("CPUの勝利です");
		const unknown = renderToStaticMarkup(<MatchResultCard onClose={() => {}} turnNumber={3} winnerSide={null} />);
		expect(unknown).toContain("対局終了");
		expect(unknown).not.toContain("敗北");
	});

	test("攻撃演出中は結果ダイアログを待ち、終了後に表示する", () => {
		const waiting = renderToStaticMarkup(<MatchResult ready={false} turnNumber={1} winnerSide="human" />);
		expect(waiting).not.toContain("<dialog");
		const ready = renderToStaticMarkup(<MatchResult ready turnNumber={1} winnerSide="human" />);
		expect(ready).toContain("<dialog");
		expect(ready).toContain('aria-labelledby="match-result-title"');
		expect(ready).toContain("結果を表示");
	});
});