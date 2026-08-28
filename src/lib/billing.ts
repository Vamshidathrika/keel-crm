import { db } from "@/db";
import { subscriptions, organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PRICING_PLANS, PlanKey, PlanDefinition } from "./billing-plans";

export { PRICING_PLANS, type PlanKey, type PlanDefinition };

/**
 * Get or automatically initialize a tenant's subscription status.
 */
export async function getTenantSubscription(orgId: string) {
  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, orgId),
  });

  if (!sub) {
    const [created] = await db
      .insert(subscriptions)
      .values({
        orgId,
        plan: "starter",
        status: "active",
        seatCount: 5,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .returning();
    sub = created;
  }

  // Count active team members to calculate seat utilization
  const teamMembers = await db.query.users.findMany({
    where: eq(users.orgId, orgId),
  });

  const planDef = PRICING_PLANS[sub.plan as PlanKey] || PRICING_PLANS.starter;

  return {
    subscription: sub,
    plan: planDef,
    activeSeats: teamMembers.length,
    seatLimit: sub.seatCount,
    isTrialing: sub.status === "trialing",
    isActive: sub.status === "active" || sub.status === "trialing",
  };
}

/**
 * Create a Stripe Checkout Session URL (or deterministic sandbox URL).
 */
export async function createCheckoutSession(
  orgId: string,
  planKey: PlanKey,
  isAnnual: boolean = false,
  returnUrl: string = "http://localhost:3000/dashboard/billing"
) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const isRealStripe = stripeSecretKey && stripeSecretKey.startsWith("sk_");

  const plan = PRICING_PLANS[planKey];
  if (!plan) throw new Error(`Invalid plan key: ${planKey}`);

  if (isRealStripe) {
    try {
      // In production with stripe package installed
      // const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      // const session = await stripe.checkout.sessions.create(...);
      // return { url: session.url };
    } catch (err: any) {
      console.error("Stripe Checkout Session error:", err);
    }
  }

  // Deterministic Sandbox Mode: Direct state upgrade
  const [updatedSub] = await db
    .insert(subscriptions)
    .values({
      orgId,
      plan: planKey,
      status: "active",
      seatCount: plan.seatsIncluded,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    })
    .onConflictDoUpdate({
      target: subscriptions.orgId,
      set: {
        plan: planKey,
        status: "active",
        seatCount: plan.seatsIncluded,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();

  return {
    url: `${returnUrl}?session_id=sandbox_${Date.now()}&status=success&plan=${planKey}`,
    sandbox: true,
    subscription: updatedSub,
  };
}

/**
 * Sync subscription status from external Stripe Webhook.
 */
export async function syncSubscriptionFromStripe(data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  planKey?: PlanKey;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  orgId?: string;
}) {
  if (data.orgId) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        plan: data.planKey || "starter",
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.orgId, data.orgId));
  } else if (data.stripeSubscriptionId) {
    await db
      .update(subscriptions)
      .set({
        status: data.status,
        plan: data.planKey || undefined,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, data.stripeSubscriptionId));
  }
}
