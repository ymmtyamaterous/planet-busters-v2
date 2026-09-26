import type {
	AttackTarget,
	DomainGameAction,
	GridPosition,
} from "@better-t-app/api/game";
import { Button } from "@better-t-app/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	Crosshair,
	Flag,
	Hourglass,
	Move,
	RotateCcw,
	Shield,
	SkipForward,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getBoardPresentation } from "@/components/game/board-data";
import {
	type BoardActionMode,
	MatchBoard,
} from "@/components/game/match-board";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/game/$matchId")({
	component: MatchRoute,
});

function MatchRoute() {
	const { matchId } = Route.useParams();
	const matchQuery = useQuery(
		orpc.game.getMatch.queryOptions({ input: { matchId } }),
	);
	const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
	const [actionMode, setActionMode] = useState<BoardActionMode>(null);
	const submitAction = useMutation(
		orpc.game.submitAction.mutationOptions({
			onSuccess: ({ match }) => {
				queryClient.setQueryData(
					orpc.game.getMatch.queryKey({ input: { matchId } }),
					match,
				);
				setSelectedUnitId(null);
				setActionMode(null);
			},
			onError: async (error) => {
				const code = (error as { data?: { code?: string } }).data?.code;
				if (code === "STALE_MATCH_VERSION") {
					await matchQuery.refetch();
					toast.info("対局の状態を更新しました。もう一度操作してください。");
					return;
				}
				toast.error(error.message);
			},
		}),
	);
	const surrender = useMutation(
		orpc.game.surrender.mutationOptions({
			onSuccess: (match) => {
				queryClient.setQueryData(
					orpc.game.getMatch.queryKey({ input: { matchId } }),
					match,
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (matchQuery.isLoading) return <MatchStatus message="対局を読み込み中…" />;
	if (!matchQuery.data)
		return <MatchStatus message="対局を読み込めませんでした。" />;
	const match = matchQuery.data;
	const presentation = getBoardPresentation(match, selectedUnitId);
	const isHumanTurn = match.status === "active" && match.turnSide === "human";
	const isSending = submitAction.isPending || surrender.isPending;
	const submit = (action: DomainGameAction) =>
		submitAction.mutate({ matchId, expectedVersion: match.version, action });
	const selectUnit = (unitId: string) => {
		setSelectedUnitId(unitId);
		setActionMode(null);
	};
	const move = (destination: GridPosition) => {
		if (presentation.selectedUnit) {
			submit({
				type: "move",
				unitId: presentation.selectedUnit.id,
				destination,
			});
		}
	};
	const attack = (target: AttackTarget) => {
		if (presentation.selectedUnit) {
			submit({
				type: "attack",
				unitId: presentation.selectedUnit.id,
				target,
			});
		}
	};

	return (
		<main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
			<header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<div>
					<p className="font-semibold text-primary text-xs tracking-[0.28em]">
						MATCH · TURN {match.turnNumber}
					</p>
					<h1 className="font-bold text-2xl">戦略スペースバトル</h1>
				</div>
				<Link
					className="inline-flex h-8 items-center justify-center border bg-background px-2.5 font-medium text-xs hover:bg-muted"
					to="/dashboard"
				>
					ダッシュボードへ戻る
				</Link>
			</header>

			{match.status === "completed" ? (
				<ResultBanner winnerSide={match.winnerSide} />
			) : null}
			{!isHumanTurn && match.status === "active" ? (
				<div className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-100/30 px-4 py-3 text-sm">
					<Hourglass aria-hidden="true" className="size-4" />
					CPU が行動中です。状態を更新しています…
				</div>
			) : null}
			{isSending ? (
				<div
					aria-live="polite"
					className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3 text-sm"
				>
					<RotateCcw aria-hidden="true" className="size-4 animate-spin" />
					操作を送信中…
				</div>
			) : null}

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
				<section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
					<MatchBoard
						actionMode={actionMode}
						match={match}
						onAttack={attack}
						onMove={move}
						onSelectUnit={selectUnit}
						selectedUnitId={selectedUnitId}
					/>
				</section>
				<aside className="flex flex-col gap-4">
					<PlanetPanel match={match} />
					<section className="rounded-xl border bg-card p-4">
						<h2 className="font-semibold">操作</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							{presentation.selectedUnit
								? `${presentation.selectedUnit.kind === "battleship" ? "戦艦" : "戦闘機"} / HP ${presentation.selectedUnit.hp}`
								: "自軍の未行動ユニットを選択してください。"}
						</p>
						<div className="mt-4 grid grid-cols-2 gap-2">
							<Button
								aria-label="移動先を選択"
								disabled={
									!presentation.selectedUnit || !isHumanTurn || isSending
								}
								onClick={() => setActionMode("move")}
								variant={actionMode === "move" ? "default" : "outline"}
							>
								<Move aria-hidden="true" />移動
							</Button>
							<Button
								aria-label="攻撃対象を選択"
								disabled={
									!presentation.selectedUnit ||
									presentation.attackTargets.length === 0 ||
									!isHumanTurn ||
									isSending
								}
								onClick={() => setActionMode("attack")}
								variant={actionMode === "attack" ? "default" : "outline"}
							>
								<Crosshair aria-hidden="true" />攻撃
							</Button>
							<Button
								aria-label="選択中のユニットを待機"
								disabled={
									!presentation.selectedUnit || !isHumanTurn || isSending
								}
								onClick={() => {
									if (presentation.selectedUnit) {
										submit({
											type: "wait",
											unitId: presentation.selectedUnit.id,
										});
									}
								}}
								variant="outline"
							>
								<SkipForward aria-hidden="true" />待機
							</Button>
							<Button
								aria-label="ターンを終了"
								disabled={!isHumanTurn || isSending}
								onClick={() => submit({ type: "endTurn" })}
							>
								<Flag aria-hidden="true" />ターン終了
							</Button>
						</div>
						{actionMode === "move" ? (
							<p className="mt-3 text-primary text-xs">
								青いマスから移動先を選択してください。
							</p>
						) : null}
						{actionMode === "attack" ? (
							<p className="mt-3 text-destructive text-xs">
								赤い対象を選択してください。
							</p>
						) : null}
					</section>
					<ActionLog actions={match.recentActions} />
					{match.status === "active" ? (
						<Button
							aria-label="対局を降参"
							disabled={isSending}
							onClick={() =>
								surrender.mutate({ matchId, expectedVersion: match.version })
							}
							variant="destructive"
						>
							<Shield aria-hidden="true" />降参する
						</Button>
					) : null}
				</aside>
			</div>
		</main>
	);
}

function MatchStatus({ message }: { message: string }) {
	return (
		<main className="flex flex-1 items-center justify-center text-muted-foreground">
			{message}
		</main>
	);
}

function PlanetPanel({
	match,
}: {
	match: {
		planets: readonly { side: "human" | "cpu"; hp: number }[];
		turnSide: "human" | "cpu";
	};
}) {
	const human = match.planets.find((planet) => planet.side === "human");
	const cpu = match.planets.find((planet) => planet.side === "cpu");
	return (
		<section className="rounded-xl border bg-card p-4">
			<h2 className="font-semibold">主惑星 HP</h2>
			<dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt className="text-muted-foreground">自軍</dt>
					<dd className="font-bold text-blue-500 text-lg">{human?.hp ?? 0}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">CPU</dt>
					<dd className="font-bold text-lg text-red-500">{cpu?.hp ?? 0}</dd>
				</div>
			</dl>
			<p className="mt-3 border-t pt-3 text-muted-foreground text-xs">
				現在の手番: {match.turnSide === "human" ? "あなた" : "CPU"}
			</p>
		</section>
	);
}

function ActionLog({
	actions,
}: {
	actions: readonly { id: string; side: "human" | "cpu"; summary: string }[];
}) {
	return (
		<section className="rounded-xl border bg-card p-4">
			<h2 className="font-semibold">行動ログ</h2>
			{actions.length === 0 ? (
				<p className="mt-3 text-muted-foreground text-sm">まだ行動はありません。</p>
			) : (
				<ol className="mt-3 space-y-2 text-sm">
					{actions.map((action) => (
						<li className="border-primary/50 border-l-2 pl-2" key={action.id}>
							<span className="font-medium">
								{action.side === "human" ? "自軍" : "CPU"}
							</span>{" "}
							{action.summary}
						</li>
					))}
				</ol>
			)}
		</section>
	);
}

function ResultBanner({ winnerSide }: { winnerSide: "human" | "cpu" | null }) {
	return (
		<section className="rounded-xl border border-primary/40 bg-primary/10 px-5 py-4">
			<h2 className="font-bold text-xl">
				{winnerSide === "human" ? "勝利！" : "敗北"}
			</h2>
			<p className="mt-1 text-sm">
				{winnerSide === "human"
					? "敵主惑星を撃破しました。"
					: "CPU 艦隊に敗北しました。"}
			</p>
		</section>
	);
}
