import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	use: { baseURL: "http://127.0.0.1:3401", trace: "retain-on-failure" },
	webServer: [
		{
			command: "bun run ../../e2e/test-server.ts",
			cwd: "apps/server",
			url: "http://127.0.0.1:3400/",
			reuseExistingServer: false,
			env: { PORT: "3400", NODE_ENV: "test", DATABASE_URL: "file::memory:", BETTER_AUTH_URL: "http://127.0.0.1:3400", CORS_ORIGIN: "http://127.0.0.1:3401", BETTER_AUTH_SECRET: "e2e-only-secret-at-least-32-characters-long" },
		},
		{
			command: "bun run dev --host 127.0.0.1 --port 3401 --strictPort",
			cwd: "apps/web",
			url: "http://127.0.0.1:3401/",
			reuseExistingServer: false,
			env: { NODE_ENV: "test", VITE_SERVER_URL: "http://127.0.0.1:3400" },
		},
	],
});