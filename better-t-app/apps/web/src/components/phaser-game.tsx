import { useEffect, useRef } from "react";

import { getSurveyLabel } from "@/lib/game-text";

export function PhaserGame() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const parent = mountRef.current;
		if (!parent) return;

		let game: import("phaser").Game | undefined;
		let isDisposed = false;

		void import("phaser").then((Phaser) => {
			if (isDisposed) return;

			class WelcomeScene extends Phaser.Scene {
				private pulseCount = 0;
				private pulseLabel?: Phaser.GameObjects.Text;

				constructor() {
					super("welcome");
				}

				create() {
					const { width, height } = this.scale;
					this.cameras.main.setBackgroundColor("#080d1d");

					const stars = this.add.graphics();
					for (let index = 0; index < 90; index += 1) {
						const x = Phaser.Math.Between(0, width);
						const y = Phaser.Math.Between(0, height);
						const radius = Phaser.Math.FloatBetween(0.8, 2.2);
						stars.fillStyle(0xc5d9ff, Phaser.Math.FloatBetween(0.2, 0.8));
						stars.fillCircle(x, y, radius);
					}

					const planet = this.add
						.circle(width / 2, height / 2 + 22, 58, 0x6557e8)
						.setStrokeStyle(2, 0xa79dff)
						.setInteractive({ useHandCursor: true });
					this.add
						.ellipse(width / 2, height / 2 + 26, 180, 42)
						.setStrokeStyle(3, 0x58d7e8, 0.85);

					this.add
						.text(width / 2, height / 2 - 112, "PLANET BUSTERS", {
							color: "#f4f5ff",
							fontFamily: "system-ui, sans-serif",
							fontSize: "28px",
							fontStyle: "bold",
							letterSpacing: 3,
						})
						.setOrigin(0.5);
					this.add
						.text(width / 2, height / 2 - 78, "PHASER 4 STARTER SCENE", {
							color: "#9ca9c8",
							fontFamily: "system-ui, sans-serif",
							fontSize: "12px",
							letterSpacing: 2,
						})
						.setOrigin(0.5);
					this.pulseLabel = this.add
						.text(
							width / 2,
							height / 2 + 112,
							getSurveyLabel(this.pulseCount),
							{
								color: "#b6c3e2",
								fontFamily: "system-ui, sans-serif",
								fontSize: "14px",
							},
						)
						.setOrigin(0.5);

					planet.on("pointerdown", () => {
						this.pulseCount += 1;
						this.pulseLabel?.setText(getSurveyLabel(this.pulseCount));
						this.tweens.add({
							targets: planet,
							scale: { from: 1, to: 1.12 },
							duration: 160,
							yoyo: true,
						});
					});
				}
			}

			game = new Phaser.Game({
				type: Phaser.AUTO,
				parent,
				backgroundColor: "#080d1d",
				scale: {
					mode: Phaser.Scale.FIT,
					width: 960,
					height: 540,
				},
				scene: [WelcomeScene],
			});
		});

		return () => {
			isDisposed = true;
			game?.destroy(true);
		};
	}, []);

	return <div ref={mountRef} aria-hidden="true" className="h-full w-full" />;
}
