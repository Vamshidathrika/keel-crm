import { NextResponse } from "next/server";
import { syncSubscriptionFromStripe, PlanKey } from "@/lib/billing";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Signature verification when STRIPE_WEBHOOK_SECRET is active
    if (webhookSecret && signature) {
      const parts = signature.split(",").reduce((acc, part) => {
        const [key, value] = part.trim().split("=");
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const timestamp = parts["t"];
      const expectedSig = parts["v1"];

      if (timestamp && expectedSig) {
        const payload = `${timestamp}.${rawBody}`;
        const computedSig = crypto
          .createHmac("sha256", webhookSecret)
          .update(payload)
          .digest("hex");

        if (computedSig !== expectedSig) {
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
        }
      }
    }

    const event = JSON.parse(rawBody);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const orgId = session?.client_reference_id || session?.metadata?.orgId;
        const planKey = (session?.metadata?.planKey || "growth") as PlanKey;

        if (orgId) {
          await syncSubscriptionFromStripe({
            orgId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: "active",
            planKey,
          });

          await db.insert(auditLogs).values({
            orgId,
            action: "stripe_subscription_activated",
            entityType: "subscription",
            entityId: session.subscription || "sub_checkout",
            diff: { plan: planKey, customer: session.customer },
          }).catch(() => {});
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data?.object;
        await syncSubscriptionFromStripe({
          stripeSubscriptionId: sub.id,
          status: sub.status === "active" ? "active" : "past_due",
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        await syncSubscriptionFromStripe({
          stripeSubscriptionId: sub.id,
          status: "canceled",
        });
        break;
      }

      case "invoice.payment_succeeded": {
        // Payment succeeded
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data?.object;
        if (invoice.subscription) {
          await syncSubscriptionFromStripe({
            stripeSubscriptionId: invoice.subscription,
            status: "past_due",
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Processing Error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 400 });
  }
}
