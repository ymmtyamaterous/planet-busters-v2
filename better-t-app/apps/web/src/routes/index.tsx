import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crosshair, RotateCcw, Swords } from "lucide-react";

import { StrategyGameBoard } from "@/components/game/strategy-game-board";
import { UnitGuide } from "@/components/game/unit-guide";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<main className="w-full overflow-y-auto">
			<div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-16">
				<section className="grid items-center gap-8 lg:grid-cols-[1fr_0.85fr]">
					<div className="space-y-6">
						<p className="font-semibold text-primary text-xs tracking-[0.3em]">
							PLANET BUSTERS
						</p>
						<h1 className="font-bold text-4xl tracking-tight sm:text-5xl">
							艦隊を率いて、<br />
							星を守れ。
						</h1>
						<p className="max-w-lg text-muted-foreground leading-relaxed">
							戦艦と戦闘機を指揮するターン制の戦略スペースバトル。
							自分の主惑星を守りながら、CPU の主惑星を目指しましょう。
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<Link
								className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
								to="/dashboard"
							>
								<Swords aria-hidden="true" className="size-4" />
								ゲームを始める
								<ArrowRight aria-hidden="true" className="size-4" />
							</Link>
							<p className="text-muted-foreground text-xs">
								初めての方はアカウント登録が必要です
							</p>
						</div>
					</div>
					<aside className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
						<p className="font-semibold text-muted-foreground text-xs tracking-[0.2em]">
							HOW TO PLAY
						</p>
						<h2 className="mt-3 font-semibold text-xl">対局までの流れ</h2>
						<ol className="mt-5 space-y-4 text-sm">
							<li className="flex gap-3">
								<span className="font-semibold text-primary">01</span>
								<span>登録またはログインする</span>
							</li>
							<li className="flex gap-3">
								<span className="font-semibold text-primary">02</span>
								<span>司令室で「CPU 戦を開始」を選ぶ</span>
							</li>
							<li className="flex gap-3">
								<span className="font-semibold text-primary">03</span>
								<span>艦隊を動かし、敵の主惑星を撃破する</span>
							</li>
						</ol>
						<p className="mt-6 flex items-start gap-2 border-t pt-4 text-muted-foreground text-xs leading-relaxed">
							<RotateCcw aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
							進行中の対局は司令室から再開できます。
						</p>
					</aside>
				</section>
				<UnitGuide />
				<section className="space-y-4">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<p className="flex items-center gap-2 font-semibold text-primary text-xs tracking-[0.2em]">
								<Crosshair aria-hidden="true" className="size-4" /> MAP PREVIEW
							</p>
							<h2 className="mt-2 font-semibold text-2xl">星雲の交差点</h2>
						</div>
						<p className="max-w-lg text-muted-foreground text-sm leading-relaxed">
							初期配置のプレビューです。ここでは操作できません。青がプレイヤー、赤が CPU、丸が主惑星、四角が戦艦、三角が戦闘機です。
						</p>
					</div>
					<div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
						<StrategyGameBoard />
					</div>
				</section>
			</div>
		</main>
	);
}
