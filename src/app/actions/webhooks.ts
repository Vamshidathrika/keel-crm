"use server";

import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManageApiKeysAndWebhooks } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function getWebhooks() {
  const session = await auth();
  if (!session?.user) return [];

  assert(canManageApiKeysAndWebhooks(session.user.role), "Access Denied");

  return db.query.webhooks.findMany({
    where: eq(webhooks.orgId, session.user.orgId),
    orderBy: [desc(webhooks.createdAt)],
  });
}

export async function createWebhook(data: { targetUrl: string; eventTypes: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canManageApiKeysAndWebhooks(role), "Access Denied");

  const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;

  const [newWebhook] = await db
    .insert(webhooks)
    .values({
      orgId,
      targetUrl: data.targetUrl.trim(),
      eventTypes: data.eventTypes,
      secret,
      isActive: true,
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "webhook", newWebhook.id, {
    targetUrl: data.targetUrl,
    eventTypes: data.eventTypes,
  });

  revalidatePath("/dashboard/settings");
  return newWebhook;
}

export async function toggleWebhook(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canManageApiKeysAndWebhooks(role), "Access Denied");

  await db
    .update(webhooks)
    .set({ isActive })
    .where(and(eq(webhooks.id, id), eq(webhooks.orgId, orgId)));

  await logAuditEntry(orgId, userId, "toggle_webhook", "webhook", id, {
    webhookId: id,
    isActive,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteWebhook(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canManageApiKeysAndWebhooks(role), "Access Denied");

  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.orgId, orgId)));

  await logAuditEntry(orgId, userId, "delete", "webhook", id, {
    webhookId: id,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function getWebhookDeliveriesList(webhookId: string) {
  const session = await auth();
  if (!session?.user) return [];

  assert(canManageApiKeysAndWebhooks(session.user.role), "Access Denied");

  return db.query.webhookDeliveries.findMany({
    where: eq(webhookDeliveries.webhookId, webhookId),
    orderBy: [desc(webhookDeliveries.createdAt)],
    limit: 50,
  });
}
