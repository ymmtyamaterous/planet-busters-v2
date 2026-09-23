import { createAuth } from "@better-t-app/auth";
import { createDb } from "@better-t-app/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
