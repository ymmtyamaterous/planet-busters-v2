import { useEffect, useRef, useState } from "react";

import { type AttackEffectData, RESULT_LABELS } from "./attack-effect-data";

export function AttackEffect({ effect, onComplete }: { effect: AttackEffectData; onComplete: () => void }) {
	const mountRef = useRef<HTMLDivElement>(null);
	const skipRef = useRef<HTMLButtonElement>(null);
	const [revealed, setRevealed] = useState(false);
	const completeRef = useRef(onComplete);
	completeRef.current = onComplete;

	useEffect(() => {
		const parent = mountRef.current;
		if (!parent) return;
		skipRef.current?.focus();
		const view = parent.ownerDocument.defaultView;
		const reducedMotion = view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		let game: import("phaser").Game | undefined;
		let disposed = false;
		const timer = view?.setTimeout(() => completeRef.current(), 5000);
		const revealTimer = view?.setTimeout(() => setRevealed(true), reducedMotion ? 0 : 1000);
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				completeRef.current();
			}
		};
		view?.addEventListener("keydown", onKeyDown);
		if (!reducedMotion) {
			void import("phaser").then((Phaser) => {
				if (disposed) return;
				class AttackScene extends Phaser.Scene {
					create() {
						this.cameras.main.setBackgroundColor("#080d1d");
						this.add.circle(80, 110, 25, 0x60a5fa).setStrokeStyle(3, 0xffffff);
						this.add.circle(430, 110, 30, 0xfb7185).setStrokeStyle(3, 0xffffff);
						const shot = this.add.circle(100, 110, 7, 0xfde68a);
						this.tweens.add({ targets: shot, x: 430, y: effect.result === "miss" ? 55 : 110, duration: 900, onComplete: () => {
							shot.destroy();
							if (effect.result !== "miss") {
								const explosion = this.add.circle(430, 110, 12, 0xf97316, 0.9);
								this.tweens.add({ targets: explosion, scale: effect.result === "critical" ? 6 : 3, alpha: 0, duration: 700 });
								if (effect.result === "critical") this.cameras.main.shake(350, 0.015);
							}
							this.add.text(255, 170, RESULT_LABELS[effect.result], { color: effect.result === "critical" ? "#fbbf24" : "#ffffff", fontSize: "32px", fontStyle: "bold" }).setOrigin(0.5);
						} });
					}
				}
				game = new Phaser.Game({ type: Phaser.AUTO, parent, width: 510, height: 220, scene: [AttackScene], scale: { mode: Phaser.Scale.FIT } });
			}).catch(() => {
				// The text result and skip button remain available if Phaser cannot load.
				if (!disposed) setRevealed(true);
			});
		}
		return () => {
			disposed = true;
			if (timer !== undefined) view?.clearTimeout(timer);
			if (revealTimer !== undefined) view?.clearTimeout(revealTimer);
			view?.removeEventListener("keydown", onKeyDown);
			game?.destroy(true);
		};
	}, [effect]);

	return (
		<section aria-label="攻撃演出" className="w-full max-w-xl rounded-xl border border-slate-600 bg-slate-950 p-5 text-slate-50 shadow-2xl">
			<h1 className="font-bold text-lg">攻撃結果</h1>
			<p className="mt-2 text-sm">{effect.attacker} → {effect.target}</p>
			<div aria-hidden="true" className="mt-3 overflow-hidden rounded-lg" ref={mountRef} />
			{revealed ? <div aria-live="polite" className="mt-3 text-center">
				<strong className="text-2xl text-amber-300">{RESULT_LABELS[effect.result]}</strong>
				<p>ダメージ {effect.damage} / 残り HP {effect.remainingHp}</p>
			</div> : <p className="mt-3 text-center" aria-live="polite">発射中…</p>}
			<button ref={skipRef} className="mt-4 w-full rounded-md border border-slate-400 px-4 py-2 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-white" onClick={onComplete} type="button">演出をスキップ</button>
		</section>
	);
}