import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { appRouter } from "@better-t-app/api/routers/index";
import { migrateDb } from "@better-t-app/db";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { auth, db } from "./services";

// The build copies migrations next to the bundled entry; development uses the source tree.
const bundledMigrations = fileURLToPath(new URL("./migrations", import.meta.url));
const sourceMigrations = fileURLToPath(
  new URL("../../../packages/db/src/migrations", import.meta.url),
);
await migrateDb(db, existsSync(bundledMigrations) ? bundledMigrations : sourceMigrations);

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

// Only the built server contains the bundled web app. Never fall back to the
// SPA for missing assets or API routes, so missing files remain real 404s.
const publicRoot = fileURLToPath(new URL("./dist", import.meta.url));
if (existsSync(publicRoot)) {
  app.get("/*", serveStatic({ root: publicRoot }));
  const index = serveStatic({ root: publicRoot, path: "index.html" });
  app.get("/*", async (c, next) => {
    const path = c.req.path;
    if (/^\/(?:api|api-reference|rpc)(?:\/|$)/.test(path) || /\.[^/]+$/.test(path)) {
      return next();
    }
    return index(c, next);
  });
} else {
  app.get("/", (c) => c.text("OK"));
}

export default app;
