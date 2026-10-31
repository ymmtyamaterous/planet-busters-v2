import {
	calculateAccuracy,
	CRITICAL_CHANCE,
	UNIT_STATS,
	type UnitKind,
} from "@better-t-app/api/game";
import { BookOpen } from "lucide-react";

const UNIT_NAMES: Record<UnitKind, string> = {
	battleship: "戦艦",
	fighter: "戦闘機",
};

export function UnitGuide() {
	return (
		<details className="rounded-xl border bg-card p-4 shadow-sm">
			<summary className="flex cursor-pointer items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
				<BookOpen aria-hidden="true" className="size-4 text-primary" />
				戦闘機・戦艦の動きと攻撃
			</summary>
			<div className="mt-4 space-y-4 text-sm leading-relaxed">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
					{(["fighter", "battleship"] as const).map((kind) => (
						<UnitGuideCard key={kind} kind={kind} />
					))}
				</div>
				<div className="space-y-2 border-t pt-3 text-muted-foreground">
					<p>移動は上下左右に進みます。小惑星、主惑星、他のユニットのいるマスは通れません。迂回する場合も移動したマス数を数えます。</p>
					<p>攻撃は上下左右の直線上にいる敵ユニットまたは敵主惑星が対象です。斜めには攻撃できず、小惑星が射線を遮ります。他のユニットや主惑星は射線を遮りません。</p>
					<p>命中率にはクリティカルを含みます。クリティカルは {CRITICAL_CHANCE}% の確率で発生し、ダメージは2倍になります。</p>
					<p>各ユニットは1ターンに移動・攻撃・待機のいずれか1回だけ行えます。移動後に同じターンで攻撃することはできません。</p>
				</div>
			</div>
		</details>
	);
}

function UnitGuideCard({ kind }: { kind: UnitKind }) {
	const stats = UNIT_STATS[kind];
	return (
		<section className="rounded-lg border bg-muted/30 p-3">
			<h3 className="font-semibold">{UNIT_NAMES[kind]}</h3>
			<p className="mt-1 text-muted-foreground">
				HP {stats.hp} · 移動 {stats.movement}マス · 射程 {stats.attackRange}マス · 攻撃力 {stats.attack}
			</p>
			<p className="mt-2 text-xs">
				命中率：対戦闘機 {calculateAccuracy(kind, "fighter")}% / 対戦艦 {calculateAccuracy(kind, "battleship")}% / 対主惑星 {calculateAccuracy(kind, "planet")}%
			</p>
		</section>
	);
}