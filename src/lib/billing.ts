import { db } from "@/db";
import { subscriptions, organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type PlanKey = "starter" | "growth" | "enterprise";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  badge?: string;
  priceMonthlyINR: number;
  priceAnnualINR: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  seatsIncluded: number;
  features: string[];
  limits: {
    maxContacts: number;
    maxDeals: number;
    agentFleetActive: boolean;
    quoteToCashEnabled: boolean;
    customFieldsEnabled: boolean;
    auditLogsEnabled: boolean;
  };
}

export const PRICING_PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter Fleet",
    priceMonthlyINR: 2999,
    priceAnnualINR: 28790,
    seatsIncluded: 5,
    features: [
      "Up to 5 Team Seats",
      "1,000 Active Contacts & Leads",
      "Kanban Sales Pipelines & Custom Stages",
      "AI Lead Scoring & Activity Timeline",
      "WhatsApp & Telephony CTI Bridge",
      "Community Email Support",
    ],
    limits: {
      maxContacts: 1000,
      maxDeals: 200,
      agentFleetActive: false,
      quoteToCashEnabled: false,
      customFieldsEnabled: false,
      auditLogsEnabled: false,
    },
  },
  growth: {
    key: "growth",
    name: "Growth Ops",
    badge: "Most Popular",
    priceMonthlyINR: 7999,
    priceAnnualINR: 76790,
    seatsIncluded: 15,
    features: [
      "Up to 15 Team Seats",
      "Unlimited Contacts & Pipelines",
      "Full Quote-to-Cash (Proposals, Invoices & Payments)",
      "4 Autonomous AI Agents (Prospector, Deal Doctor, Guardian, Copilot)",
      "Interactive Client Portal with Live WhatsApp Telemetry",
      "Outbound Webhooks & REST API Access",
      "Priority Technical Support",
    ],
    limits: {
      maxContacts: 50000,
      maxDeals: 10000,
      agentFleetActive: true,
      quoteToCashEnabled: true,
      customFieldsEnabled: true,
      auditLogsEnabled: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise Sovereign",
    badge: "Full Power",
    priceMonthlyINR: 19999,
    priceAnnualINR: 191990,
    seatsIncluded: 999,
    features: [
      "Unlimited Team Seats & Workspaces",
      "Isolated Turso / LibSQL Database Partition",
      "Custom Autonomous Agent Tool Hands & LangGraph DAGs",
      "Full Compliance Audit Trail & One-Click GDPR Data Export",
      "Dedicated Account Strategist & Custom SLA",
      "Custom ERP & TMS Gateway Integrations",
    ],
    limits: {
      maxContacts: 1000000,
      maxDeals: 500000,
      agentFleetActive: true,
      quoteToCashEnabled: true,
      customFieldsEnabled: true,
      auditLogsEnabled: true,
    },
  },
};

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
