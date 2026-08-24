import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function getDatabaseConfig() {
  const envUrl = process.env.DATABASE_URL?.trim();
  const isInvalidUrl = !envUrl || envUrl.includes("[SENSITIVE]");

  if (isInvalidUrl) {
    if (process.env.VERCEL) {
      return { url: "file:/tmp/keel.db", authToken: undefined };
    }
    return { url: "file:./local.db", authToken: undefined };
  }

  const token =
    process.env.DATABASE_AUTH_TOKEN && !process.env.DATABASE_AUTH_TOKEN.includes("[SENSITIVE]")
      ? process.env.DATABASE_AUTH_TOKEN
      : process.env.TURSO_AUTH_TOKEN;

  return {
    url: envUrl,
    authToken: envUrl.startsWith("file:") ? undefined : token,
  };
}

const config = getDatabaseConfig();

export const client = createClient({
  url: config.url,
  authToken: config.authToken,
});

export const db = drizzle(client, { schema });
export { schema };
