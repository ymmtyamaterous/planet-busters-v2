import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { StrategyGameBoard } from "@/components/game/strategy-game-board";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-6 overflow-y-auto px-4 py-8 sm:px-6">
			<header className="space-y-2">
				<p className="font-semibold text-primary text-xs tracking-[0.28em]">
					PLANET BUSTERS · WEB
				</p>
				<h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
					戦略スペースバトル
				</h1>
				<p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
					フェーズ 0
					の固定マッププレビューです。盤面と初期配置は共有ゲーム定義から描画しています。
				</p>
			</header>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
				<section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
					<div className="min-h-64 w-full">
						<StrategyGameBoard />
					</div>
				</section>

				<aside className="flex flex-col gap-4">
					<section className="rounded-xl border bg-card p-5">
						<p className="mb-2 font-semibold text-muted-foreground text-xs tracking-widest">
							MAP LEGEND
						</p>
						<h2 className="font-semibold">初期配置</h2>
						<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
							青は人間陣営、赤は CPU
							陣営です。丸は主惑星、四角は戦艦、三角は戦闘機を表します。
						</p>
					</section>

					<section className="rounded-xl border bg-card p-5">
						<h2 className="mb-3 font-semibold">API Status</h2>
						<div className="flex items-center gap-2">
							<div
								className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
							/>
							<span className="text-muted-foreground text-sm">
								{healthCheck.isLoading
									? "Checking..."
									: healthCheck.data
										? "Connected"
										: "Disconnected"}
							</span>
						</div>
					</section>
				</aside>
			</div>
		</main>
	);
}
