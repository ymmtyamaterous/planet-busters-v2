import { NEBULA_CROSSROADS_MAP, validateMapDefinition } from "./map";
import { simulateMatch, swapStartingSides } from "./simulator";

const count = Number(process.argv[2] ?? 100);
const firstSeed = Number(process.argv[3] ?? 1);
if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(firstSeed) || firstSeed < 0 || firstSeed + count - 1 > 0xffffffff) {
	throw new RangeError("対局数は正の整数、シードは 0〜4294967295 の整数で指定してください");
}

for (const placement of ["original", "swapped"] as const) {
	const map = placement === "original" ? NEBULA_CROSSROADS_MAP : swapStartingSides(NEBULA_CROSSROADS_MAP);
	const errors = validateMapDefinition(map);
	if (errors.length) throw new Error(errors.join(", "));
	for (const firstSide of ["human", "cpu"] as const) {
		const results = Array.from({ length: count }, (_, i) => simulateMatch({ seed: firstSeed + i, map, firstSide }));
		const wins = results.filter((result) => result.state.winnerSide === firstSide).length;
		const unfinished = results.filter((result) => result.reason !== "victory");
		const unreachable = results.filter((result) => result.initialUnreachableSides.length > 0);
		console.log(JSON.stringify({ placement, firstSide, count, firstSeed, firstSideWins: wins, firstSideWinRate: count === unfinished.length ? null : wins / (count - unfinished.length), averageTurns: results.reduce((sum, result) => sum + result.state.turnNumber, 0) / count, maximumTurns: Math.max(...results.map((result) => result.state.turnNumber)), unfinished: unfinished.map(({ seed, reason }) => ({ seed, reason })), unreachable: unreachable.map(({ seed, initialUnreachableSides }) => ({ seed, sides: initialUnreachableSides })) }));
		if (unfinished.length || unreachable.length) process.exitCode = 1;
	}
}