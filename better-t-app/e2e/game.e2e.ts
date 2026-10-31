import { expect, test, type Page } from "@playwright/test";

async function newMatch(page: Page) {
	await page.goto("/login");
	await page.getByRole("button", { name: "新規登録" }).click();
	await page.getByLabel("名前").fill("攻撃テスト");
	await page.getByLabel("メールアドレス").fill(`e2e-${crypto.randomUUID()}@example.com`);
	await page.getByLabel("パスワード", { exact: true }).fill("password123");
	await page.getByLabel("パスワード（確認）").fill("password123");
	await page.getByRole("button", { name: "アカウントを作成" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await page.getByRole("button", { name: "CPU 戦を開始" }).click();
	await expect(page).toHaveURL(/\/game\//);
	await expect(page.getByRole("button", { name: "ターンを終了" })).toBeEnabled();
	return new URL(page.url()).pathname.split("/").at(-1) as string;
}

async function prepareAttack(matchId: string, side: "human" | "cpu", targetHp: number) {
	const response = await fetch("http://127.0.0.1:3400/__e2e/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId, side, targetHp }) });
	if (!response.ok) throw new Error(`テストデータの準備に失敗しました: ${response.status}`);
}

test("登録、ログイン、移動、ターン終了、再開、降参", async ({ page }) => {
	const email = `e2e-${crypto.randomUUID()}@example.com`;
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/login");
	await page.getByRole("button", { name: "新規登録" }).click();
	await page.getByLabel("名前").fill("E2E司令官");
	await page.getByLabel("メールアドレス").fill(email);
	await page.getByLabel("パスワード", { exact: true }).fill("password123");
	await page.getByLabel("パスワード（確認）").fill("password123");
	await page.getByRole("button", { name: "アカウントを作成" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await page.getByRole("button", { name: "E2E司令官" }).click();
	await page.getByRole("menuitem", { name: "ログアウト" }).click();
	await page.goto("/login");
	await page.getByLabel("メールアドレス").fill(email);
	await page.getByLabel("パスワード", { exact: true }).fill("password123");
	await page.getByRole("button", { name: "ログイン", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await page.getByRole("button", { name: "CPU 戦を開始" }).click();
	await expect(page).toHaveURL(/\/game\//);
	page.on("dialog", (dialog) => dialog.accept());
	await page.getByRole("group", { name: "ユニットを選択" }).getByRole("button").first().click();
	await page.getByRole("button", { name: "移動先を選択" }).click();
	await page.getByRole("button", { name: /^移動 \(/ }).first().click();
	await expect(page.getByText("行動済み", { exact: false }).first()).toBeVisible();
	await page.getByRole("button", { name: "ターンを終了" }).click();
	await expect(page.getByText("MATCH · TURN 2")).toBeVisible();
	await page.reload();
	await expect(page.getByText("MATCH · TURN 2")).toBeVisible();
	await page.getByRole("link", { name: "ダッシュボードへ戻る" }).click();
	await page.getByRole("link", { name: "対局を再開" }).first().click();
	await expect(page.getByText("MATCH · TURN 2")).toBeVisible();
	await page.getByRole("button", { name: "対局を降参" }).click();
	await expect(page.getByText("敗北", { exact: false }).first()).toBeVisible();
});

test("別タブとの競合と通信遮断から復帰する", async ({ page, context }) => {
	await page.goto("/login");
	await page.getByRole("button", { name: "新規登録" }).click();
	await page.getByLabel("名前").fill("競合テスト");
	await page.getByLabel("メールアドレス").fill(`e2e-${crypto.randomUUID()}@example.com`);
	await page.getByLabel("パスワード", { exact: true }).fill("password123");
	await page.getByLabel("パスワード（確認）").fill("password123");
	await page.getByRole("button", { name: "アカウントを作成" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await page.getByRole("button", { name: "CPU 戦を開始" }).click();
	await expect(page).toHaveURL(/\/game\//);
	const second = await context.newPage();
	await second.goto(page.url());
	await expect(second.getByRole("button", { name: "ターンを終了" })).toBeEnabled();
	await second.getByRole("button", { name: "ターンを終了" }).click();
	await expect(second.getByText("MATCH · TURN 2")).toBeVisible();
	await page.getByRole("button", { name: "ターンを終了" }).click();
	await expect(page.getByText("MATCH · TURN 2")).toBeVisible();
	await expect(page.getByText("対局の状態が更新されています。再取得後に操作してください。")).toBeVisible();
	await context.setOffline(true);
	await page.getByRole("button", { name: "ターンを終了" }).click();
	await expect(page.getByRole("button", { name: "ターンを終了" })).toBeDisabled();
	await context.setOffline(false);
	await expect(page.getByText("MATCH · TURN 3")).toBeVisible({ timeout: 30000 });
	await expect(page.getByRole("button", { name: "ターンを終了" })).toBeEnabled();
});

test("ポップアップ拒否時に攻撃結果を表示し、勝利を保存する", async ({ page }) => {
	await page.addInitScript(() => { window.open = () => null; });
	await page.emulateMedia({ reducedMotion: "reduce" });
	page.on("dialog", (dialog) => dialog.accept());
	const matchId = await newMatch(page);
	await prepareAttack(matchId, "human", 1);
	await page.reload();
	await page.getByRole("group", { name: "ユニットを選択" }).getByRole("button", { name: /戦艦 \(10, 4\)/ }).click();
	await page.getByRole("button", { name: "攻撃対象を選択" }).click();
	await page.getByRole("button", { name: "攻撃 (11, 4)" }).click();
	const effect = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "攻撃結果" }) });
	await expect(effect.getByText("HIT", { exact: true })).toBeVisible();
	await expect(effect.getByText(/ダメージ.*残り HP 0/)).toBeVisible();
	await expect(effect.getByRole("button", { name: "演出をスキップ" })).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("dialog").getByRole("heading", { name: "勝利！" })).toBeVisible();
	await page.reload();
	await expect(page.getByRole("dialog").getByRole("heading", { name: "勝利！" })).toBeVisible();
});

test("通常の攻撃ポップアップ終了後に対局を続行できる", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	page.on("dialog", (dialog) => dialog.accept());
	const matchId = await newMatch(page);
	await prepareAttack(matchId, "human", 30);
	await page.reload();
	await page.getByRole("group", { name: "ユニットを選択" }).getByRole("button", { name: /戦艦 \(10, 4\)/ }).click();
	await page.getByRole("button", { name: "攻撃対象を選択" }).click();
	const popupPromise = page.waitForEvent("popup");
	await page.getByRole("button", { name: "攻撃 (11, 4)" }).click();
	const popup = await popupPromise;
	await expect(popup.getByText("HIT", { exact: true })).toBeVisible();
	await popup.getByRole("button", { name: "演出をスキップ" }).click();
	await expect(page.getByRole("button", { name: "ターンを終了" })).toBeEnabled();
	await page.getByRole("button", { name: "ターンを終了" }).click();
	await expect(page.getByText("MATCH · TURN 2")).toBeVisible();
});

test("CPU の攻撃で敗北し、結果が再読込後も残る", async ({ page }) => {
	const matchId = await newMatch(page);
	await prepareAttack(matchId, "cpu", 1);
	await page.reload();
	await page.getByRole("button", { name: "ターンを終了" }).click();
	await expect(page.getByRole("dialog").getByRole("heading", { name: "敗北" })).toBeVisible();
	await page.reload();
	await expect(page.getByRole("dialog").getByRole("heading", { name: "敗北" })).toBeVisible();
});