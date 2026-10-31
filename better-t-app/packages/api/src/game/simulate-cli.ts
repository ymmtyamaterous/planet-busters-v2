import { simulateMatch } from "./simulator";

const count = Number(process.argv[2] ?? 100);
const firstSeed = Number(process.argv[3] ?? 1);
const traceSeed = process.argv[4] === undefined ? undefined : Number(process.argv[4]);
if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(firstSeed) || firstSeed < 0 || firstSeed + count - 1 > 0xffffffff) {
	throw new RangeError("対局数は正の整数、シードは 0〜4294967295 の整数で指定してください");
}
if (traceSeed !== undefined && (!Number.isSafeInteger(traceSeed) || traceSeed < firstSeed || traceSeed >= firstSeed + count)) {
	throw new RangeError("ログを出力するシードは対局の範囲内に指定してください");
}
const results = Array.from({ length: count }, (_, index) =>
	simulateMatch({ seed: firstSeed + index }),
);
const victories = results.filter((result) => result.reason === "victory");
const humanWins = victories.filter((result) => result.state.winnerSide === "human").length;
const failures = results.filter((result) => result.reason !== "victory");
const unreachableStarts = results.filter((result) => result.initialUnreachableSides.length > 0);
const attacks = results.flatMap((result) => result.events.flatMap((event) => event.attackResult ? [event.attackResult] : []));
const report = {
	count,
	firstSeed,
	humanWins,
	cpuWins: victories.length - humanWins,
	humanWinRate: victories.length ? humanWins / victories.length : null,
	averageTurns: results.reduce((sum, result) => sum + result.state.turnNumber, 0) / count,
	maximumTurns: Math.max(...results.map((result) => result.state.turnNumber)),
	unreachableStarts: unreachableStarts.map(({ seed, initialUnreachableSides }) => ({ seed, sides: initialUnreachableSides })),
	attacks: {
		total: attacks.length,
		miss: attacks.filter((attack) => attack.result === "miss").length,
		hit: attacks.filter((attack) => attack.result === "hit").length,
		critical: attacks.filter((attack) => attack.result === "critical").length,
	},
	failures: failures.map(({ seed, reason, state, events }) => ({ seed, reason, turn: state.turnNumber, events })),
	trace: traceSeed === undefined ? undefined : results.find((result) => result.seed === traceSeed),
};
console.log(JSON.stringify(report, null, 2));
const extremeWinRate = victories.length >= 30 && (humanWins / victories.length < 0.1 || humanWins / victories.length > 0.9);
if (failures.length > 0 || unreachableStarts.length > 0 || extremeWinRate) {
	console.error("未完了、初期到達不能、または極端な勝率を検出しました");
	process.exitCode = 1;
}