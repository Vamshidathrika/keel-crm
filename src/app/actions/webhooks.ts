"use server";

import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export async function getWebhooks() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.webhooks.findMany({
    where: eq(webhooks.orgId, session.user.orgId),
    orderBy: [desc(webhooks.createdAt)],
  });
}

export async function createWebhook(data: {
  targetUrl: string;
  eventTypes: string[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const [newHook] = await db
    .insert(webhooks)
    .values({
      orgId,
      targetUrl: data.targetUrl.trim(),
      eventTypes: data.eventTypes.length > 0 ? data.eventTypes : ["*"],
      secret,
      isActive: true,
    })
    .returning();

  revalidatePath("/dashboard/settings");
  return newHook;
}

export async function deleteWebhook(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.orgId, session.user.orgId)));
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function toggleWebhook(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(webhooks)
    .set({ isActive })
    .where(and(eq(webhooks.id, id), eq(webhooks.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/settings");
  return updated;
}

export async function testPingWebhook(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const hook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, id), eq(webhooks.orgId, session.user.orgId)),
  });

  if (!hook) throw new Error("Webhook not found");

  const result = await dispatchWebhookEvent(session.user.orgId, "ping.test", {
    message: "Test ping from Keel CRM Webhook Dispatcher",
    triggeredAt: new Date().toISOString(),
    webhookId: hook.id,
  });

  return result;
}
