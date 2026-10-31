import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  copy: [
    { from: "../../packages/db/src/migrations", to: "./dist" },
    { from: "../web/dist", to: "./dist" },
  ],
  deps: {
    alwaysBundle: [/@better-t-app\/.*/],
  },
});
