import { Award, Flag, RotateCcw, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type WinnerSide = "human" | "cpu" | null;

function resultText(winnerSide: WinnerSide) {
	if (winnerSide === "human") return { title: "勝利！", subtitle: "あなたの勝利です", label: "VICTORY" };
	if (winnerSide === "cpu") return { title: "敗北", subtitle: "CPUの勝利です", label: "DEFEAT" };
	return { title: "対局終了", subtitle: "対局が終了しました", label: "MATCH FINISHED" };
}

export function MatchResultCard({ winnerSide, turnNumber, onClose }: { winnerSide: WinnerSide; turnNumber: number; onClose: () => void }) {
	const result = resultText(winnerSide);
	const victory = winnerSide === "human";
	return (
		<div className="relative overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 px-6 py-8 text-center text-slate-50 shadow-2xl sm:px-10">
			<div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${victory ? "from-amber-400/20" : "from-blue-400/20"} to-transparent`} />
			<div className="relative">
				<div className={`mx-auto flex size-20 items-center justify-center rounded-full border ${victory ? "border-amber-300/50 bg-amber-400/10 text-amber-300" : "border-blue-300/50 bg-blue-400/10 text-blue-300"}`}>
					{victory ? <Award aria-hidden="true" className="size-10" /> : <Swords aria-hidden="true" className="size-10" />}
				</div>
				<p className={`mt-5 font-bold text-xs tracking-[0.3em] ${victory ? "text-amber-300" : "text-blue-300"}`}>{result.label}</p>
				<h2 className="mt-2 font-black text-4xl sm:text-5xl" id="match-result-title">{result.title}</h2>
				<p className="mt-3 text-slate-300" id="match-result-description">{result.subtitle} · {turnNumber}ターン目</p>
				<div className="mt-8 grid gap-3 sm:grid-cols-2">
					<button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-500 px-4 font-semibold text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-white" onClick={onClose} type="button">
						<RotateCcw aria-hidden="true" className="size-4" />盤面を確認
					</button>
					<a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 font-semibold text-slate-950 text-sm hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-white" href="/dashboard">
						<Flag aria-hidden="true" className="size-4" />ダッシュボードへ
					</a>
				</div>
			</div>
		</div>
	);
}

function ResultDialog({ winnerSide, turnNumber, onClose }: { winnerSide: WinnerSide; turnNumber: number; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		ref.current?.showModal();
	}, []);
	return (
		<dialog aria-describedby="match-result-description" aria-labelledby="match-result-title" className="m-auto w-[min(90vw,32rem)] max-w-none bg-transparent p-0 backdrop:bg-slate-950/80" onCancel={(event) => { event.preventDefault(); onClose(); }} ref={ref}>
			<MatchResultCard onClose={onClose} turnNumber={turnNumber} winnerSide={winnerSide} />
		</dialog>
	);
}

export function MatchResult({ winnerSide, turnNumber, ready }: { winnerSide: WinnerSide; turnNumber: number; ready: boolean }) {
	const [dismissed, setDismissed] = useState(false);
	const result = resultText(winnerSide);
	return (
		<>
			<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4">
				<div>
					<h2 className="font-bold text-xl">{result.title}</h2>
					<p className="mt-1 text-sm">{result.subtitle}</p>
				</div>
				<button className="rounded-lg border border-primary/50 px-4 py-2 font-semibold text-sm hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary" disabled={!ready} onClick={() => setDismissed(false)} type="button">結果を表示</button>
			</section>
			{ready && !dismissed ? <ResultDialog onClose={() => setDismissed(true)} turnNumber={turnNumber} winnerSide={winnerSide} /> : null}
		</>
	);
}