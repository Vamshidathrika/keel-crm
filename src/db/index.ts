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

// Custom resilient fetch with timeout and automatic retry on Turso network/TLS hiccups
const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 2;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal || controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      const isTimeout =
        err?.name === "AbortError" ||
        err?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        err?.message?.includes("Connect Timeout") ||
        err?.message?.includes("fetch failed");

      if (attempt < maxRetries && isTimeout) {
        // Backoff slightly before retry
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  throw lastError;
};

export const client = createClient({
  url: config.url,
  authToken: config.authToken,
  fetch: config.url.startsWith("http") ? resilientFetch : undefined,
});

export const db = drizzle(client, { schema });
export { schema };
