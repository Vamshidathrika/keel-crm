import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { checkRateLimit } from "./rate-limiter";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

export interface ApiAuthResult {
  authorized: boolean;
  orgId?: string;
  keyId?: string;
  error?: string;
  status?: number;
}

export async function authenticateApiKey(
  req: Request,
  requiredScope?: string
): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing or malformed Authorization header. Expected 'Bearer keel_sk_...'",
      status: 401,
    };
  }

  const rawKey = authHeader.replace("Bearer ", "").trim();
  if (!rawKey.startsWith("keel_sk_")) {
    return {
      authorized: false,
      error: "Invalid API key format. Expected prefix 'keel_sk_'",
      status: 401,
    };
  }

  const keyHash = hashApiKey(rawKey);

  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)),
  });

  if (!apiKeyRecord) {
    return {
      authorized: false,
      error: "Invalid API key or key has been revoked.",
      status: 401,
    };
  }

  // Rate Limiting Check (150 requests per minute per key)
  const rateLimit = checkRateLimit(`key_${apiKeyRecord.id}`, 150, 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      authorized: false,
      error: `Rate limit exceeded. Maximum ${rateLimit.limit} requests per minute allowed. Try again in ${rateLimit.resetInSeconds} seconds.`,
      status: 429,
    };
  }

  if (requiredScope && apiKeyRecord.scopes) {
    const hasScope =
      apiKeyRecord.scopes.includes(requiredScope) ||
      apiKeyRecord.scopes.includes("*") ||
      apiKeyRecord.scopes.includes("all");
    if (!hasScope) {
      return {
        authorized: false,
        error: `API key lacks required scope: "${requiredScope}"`,
        status: 403,
      };
    }
  }

  // Update lastUsedAt asynchronously
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, apiKeyRecord.id))
    .catch(() => {});

  return {
    authorized: true,
    orgId: apiKeyRecord.orgId,
    keyId: apiKeyRecord.id,
  };
}
