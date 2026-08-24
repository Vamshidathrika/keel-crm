import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface WebhookEventPayload {
  event: string;
  timestamp: string;
  orgId: string;
  data: Record<string, any>;
}

/**
 * Dispatches an outbound webhook event to all active registered external apps / webhooks
 */
export async function dispatchWebhookEvent(
  orgId: string,
  eventType: string,
  data: Record<string, any>
) {
  try {
    const activeHooks = await db.query.webhooks.findMany({
      where: and(eq(webhooks.orgId, orgId), eq(webhooks.isActive, true)),
    });

    const matchingHooks = activeHooks.filter(
      (h) =>
        h.eventTypes.includes(eventType) ||
        h.eventTypes.includes("*") ||
        h.eventTypes.includes("all")
    );

    if (matchingHooks.length === 0) return { deliveredCount: 0 };

    const payload: WebhookEventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      orgId,
      data,
    };

    const payloadString = JSON.stringify(payload);

    const deliveryPromises = matchingHooks.map(async (hook) => {
      // Generate HMAC SHA-256 signature
      const signature = crypto
        .createHmac("sha256", hook.secret)
        .update(payloadString)
        .digest("hex");

      let responseStatus: number | null = null;

      try {
        const res = await fetch(hook.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Keel-Signature": signature,
            "X-Keel-Event": eventType,
            "User-Agent": "Keel-CRM-Webhook-Dispatcher/1.0",
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000), // 5-second timeout
        });
        responseStatus = res.status;
      } catch (err: any) {
        console.error(`Webhook delivery failed for hook #${hook.id}:`, err.message);
        responseStatus = 500;
      }

      await db.insert(webhookDeliveries).values({
        webhookId: hook.id,
        eventType,
        payload: payload as any,
        responseStatus,
        attempt: 1,
        deliveredAt: new Date().toISOString(),
      });
    });

    await Promise.allSettled(deliveryPromises);
    return { deliveredCount: matchingHooks.length };
  } catch (globalErr) {
    console.error("Global webhook dispatcher error:", globalErr);
    return { deliveredCount: 0 };
  }
}
