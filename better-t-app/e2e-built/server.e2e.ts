import { expect, test } from "@playwright/test";

test("ビルド済みサーバーがSPAとアセットを配信し、空DBを初期化する", async ({ page, request }) => {
	const home = await request.get("/");
	expect(home.status()).toBe(200);
	const html = await home.text();
	expect(html).toContain("<html");
	const asset = html.match(/(?:src|href)="(\/assets\/[^\"]+\.js)"/)?.[1];
	expect(asset).toBeTruthy();
	expect((await request.get(asset as string)).status()).toBe(200);
	expect((await request.get("/assets/does-not-exist.js")).status()).toBe(404);
	expect((await request.get("/rpc/does-not-exist")).status()).toBe(404);
	expect((await request.get("/api/does-not-exist")).status()).toBe(404);
	await page.goto("/login");
	await page.getByRole("button", { name: "新規登録" }).click();
	await page.getByLabel("名前").fill("ビルド検証");
	await page.getByLabel("メールアドレス").fill(`built-${crypto.randomUUID()}@example.com`);
	await page.getByLabel("パスワード", { exact: true }).fill("password123");
	await page.getByLabel("パスワード（確認）").fill("password123");
	await page.getByRole("button", { name: "アカウントを作成" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await page.getByRole("button", { name: "CPU 戦を開始" }).click();
	await expect(page).toHaveURL(/\/game\//);
	await page.reload();
	await expect(page.getByRole("button", { name: "ターンを終了" })).toBeEnabled();
});