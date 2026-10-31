// Only this isolated E2E process overrides game rolls; authentication retains
// its normal cryptographic randomness and production never loads this module.
if (process.env.NODE_ENV !== "test" || process.env.DATABASE_URL !== "file::memory:") {
	throw new Error("E2E サーバーは隔離されたインメモリDBでのみ起動できます");
}
const { secureRandom } = await import("../packages/api/src/routers/game");
const { db } = await import("../apps/server/src/services");
const { default: app } = await import("../apps/server/src/index");
secureRandom.nextInt = () => 50;

export default {
	hostname: "127.0.0.1",
	async fetch(request: Request) {
		const url = new URL(request.url);
		if (url.pathname === "/__e2e/prepare" && request.method === "POST") {
			const { matchId, side, targetHp } = await request.json() as { matchId: string; side: "human" | "cpu"; targetHp: number };
			await db.$client.execute({ sql: "UPDATE game_participant SET planet_hp = ? WHERE match_id = ? AND side = ?", args: [targetHp, matchId, side === "human" ? "cpu" : "human"] });
			await db.$client.execute({ sql: "UPDATE game_unit SET x = ?, y = ? WHERE id = ? AND match_id = ?", args: [side === "human" ? 10 : 1, side === "human" ? 4 : 3, `${matchId}:${side}-battleship-1`, matchId] });
			return new Response(null, { status: 204 });
		}
		return app.fetch(request);
	},
};