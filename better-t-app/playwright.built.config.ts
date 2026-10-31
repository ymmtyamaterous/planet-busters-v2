import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e-built",
	testMatch: "**/*.e2e.ts",
	workers: 1,
	use: { baseURL: "http://127.0.0.1:3402", trace: "retain-on-failure" },
	webServer: {
		command: "bun run dist/index.mjs",
		cwd: "apps/server",
		url: "http://127.0.0.1:3402/",
		reuseExistingServer: false,
		env: { PORT: "3402", NODE_ENV: "test", DATABASE_URL: "file::memory:", BETTER_AUTH_URL: "http://127.0.0.1:3402", CORS_ORIGIN: "http://127.0.0.1:3402", BETTER_AUTH_SECRET: "built-e2e-only-secret-at-least-32-characters" },
	},
});