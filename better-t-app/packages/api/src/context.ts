import type { Session } from "@better-t-app/auth";
import type { Database } from "@better-t-app/db";

export type Context = {
  session: Session | null;
  db: Database;
};
