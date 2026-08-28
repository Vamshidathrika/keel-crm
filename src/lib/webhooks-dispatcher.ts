import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export type WebhookEventType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "deal.created"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "quote.created"
  | "quote.accepted"
  | "quote.rejected"
  | "invoice.issued"
  | "invoice.paid"
  | "invoice.overdue"
  | "project.created"
  | "project.completed"
  | "deliverable.approved"
  | "deliverable.changes_requested";

/**
 * Dispatches an outbound webhook event to all active registered endpoints for the given organization.
 * Automatically computes HMAC SHA-256 signatures and logs delivery status in webhook_deliveries.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  eventType: WebhookEventType | string,
  data: Record<string, any>
) {
  try {
    const activeWebhooks = await db.query.webhooks.findMany({
      where: and(eq(webhooks.orgId, orgId), eq(webhooks.isActive, true)),
    });

    if (!activeWebhooks || activeWebhooks.length === 0) return;

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      orgId,
      data,
    };

    const payloadString = JSON.stringify(payload);

    for (const hook of activeWebhooks) {
      // Check if webhook is subscribed to this event or wildcard '*'
      const isSubscribed =
        !hook.eventTypes ||
        hook.eventTypes.length === 0 ||
        hook.eventTypes.includes(eventType) ||
        hook.eventTypes.includes("*");

      if (!isSubscribed) continue;

      // Compute HMAC SHA-256 signature
      const signature = crypto
        .createHmac("sha256", hook.secret)
        .update(payloadString)
        .digest("hex");

      // Execute dispatch in background without blocking main request
      (async () => {
        let responseStatus: number | null = null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const res = await fetch(hook.targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Keel-Webhook-Dispatcher/1.0",
              "X-Keel-Event": eventType,
              "X-Keel-Signature": signature,
              "X-Keel-Delivery": `whd_${crypto.randomUUID()}`,
            },
            body: payloadString,
            signal: controller.signal,
          });

          clearTimeout(timeout);
          responseStatus = res.status;
        } catch (err: any) {
          responseStatus = 500;
        } finally {
          try {
            await db.insert(webhookDeliveries).values({
              webhookId: hook.id,
              eventType,
              payload: payload as any,
              responseStatus,
              attempt: 1,
              deliveredAt: responseStatus && responseStatus < 400 ? new Date().toISOString() : null,
            });
          } catch (dbErr) {
            console.error("Failed to log webhook delivery:", dbErr);
          }
        }
      })();
    }
  } catch (err) {
    console.error("Error in dispatchWebhookEvent:", err);
  }
}
