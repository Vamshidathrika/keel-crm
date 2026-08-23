import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export async function triggerWebhook(
  orgId: string,
  eventType: string,
  payloadData: Record<string, unknown>
) {
  try {
    // 1. Fetch active webhooks subscribed to this event in the organization
    const activeHooks = await db.query.webhooks.findMany({
      where: and(eq(webhooks.orgId, orgId), eq(webhooks.isActive, true)),
    });

    const matchingHooks = activeHooks.filter((wh) => wh.eventTypes.includes(eventType));

    for (const hook of matchingHooks) {
      const occurredAt = new Date().toISOString();
      const payload = {
        eventType,
        occurredAt,
        payload: payloadData,
      };

      const bodyStr = JSON.stringify(payload);

      // Compute HMAC SHA-256 signature
      const signature = crypto
        .createHmac("sha256", hook.secret)
        .update(bodyStr)
        .digest("hex");

      // Dispatch fire-and-forget POST request
      fetch(hook.targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Keel-Signature": `sha256=${signature}`,
        },
        body: bodyStr,
      })
        .then(async (res) => {
          // Log successful delivery
          await db.insert(webhookDeliveries).values({
            webhookId: hook.id,
            eventType,
            payload,
            responseStatus: res.status,
            attempt: 1,
            deliveredAt: new Date().toISOString(),
          });
        })
        .catch(async (err) => {
          console.error(`Webhook delivery failed for target ${hook.targetUrl}:`, err);
          // Log failed delivery attempt
          await db.insert(webhookDeliveries).values({
            webhookId: hook.id,
            eventType,
            payload,
            responseStatus: 500,
            attempt: 1,
            deliveredAt: null,
          });
        });
    }
  } catch (error) {
    console.error("Error triggerWebhook dispatcher loop:", error);
  }
}
