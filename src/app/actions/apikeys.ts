"use server";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManageApiKeysAndWebhooks } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

// Hash utility for API keys
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function getApiKeys() {
  const session = await auth();
  if (!session?.user) return [];

  assert(canManageApiKeysAndWebhooks(session.user.role), "Access Denied");

  return db.query.apiKeys.findMany({
    where: and(eq(apiKeys.orgId, session.user.orgId), isNull(apiKeys.revokedAt)),
  });
}

export async function createApiKey(name: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canManageApiKeysAndWebhooks(role), "Access Denied: Only Admins can manage API keys.");

  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `keel_sk_${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = `keel_sk_${randomPart.slice(0, 6)}`;

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      scopes: ["activities:write", "contacts:read", "contacts:write", "deals:read", "deals:write"],
      createdById: userId,
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "api_key", newKey.id, {
    keyName: name,
    prefix: keyPrefix,
  });

  revalidatePath("/dashboard/settings");

  return {
    id: newKey.id,
    name: newKey.name,
    keyPrefix: newKey.keyPrefix,
    rawKey, // Returned once to be displayed to the user
  };
}

export async function revokeApiKey(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canManageApiKeysAndWebhooks(role), "Access Denied");

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId)));

  await logAuditEntry(orgId, userId, "revoke", "api_key", id, {
    apiKeyId: id,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
