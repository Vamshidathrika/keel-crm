"use server";

import { db } from "@/db";
import { agentActionQueue, agentRuns, agentConfigs, deals, contacts, companies } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { executeApprovedAction } from "@/lib/agents/tools";
import { runProspectorAgent } from "@/lib/agents/prospector";
import { runDealDoctorAgent } from "@/lib/agents/deal-doctor";
import { runGuardianAgent } from "@/lib/agents/guardian";
import { runBriefingAgent } from "@/lib/agents/briefing";

export async function getAgentActionQueue() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.agentActionQueue.findMany({
    where: and(
      eq(agentActionQueue.orgId, session.user.orgId),
      eq(agentActionQueue.status, "pending")
    ),
    orderBy: [desc(agentActionQueue.createdAt)],
  });
}

export async function approveAgentAction(actionId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;
  const result = await executeApprovedAction(orgId, actionId, userId);

  revalidatePath("/dashboard/agent-hub");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/tasks");
  return result;
}

export async function rejectAgentAction(actionId: string, reason?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  await db
    .update(agentActionQueue)
    .set({
      status: "rejected",
      reviewedById: userId,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason || "Dismissed by user",
    })
    .where(and(eq(agentActionQueue.id, actionId), eq(agentActionQueue.orgId, orgId)));

  revalidatePath("/dashboard/agent-hub");
  return { success: true };
}

export async function getAgentRuns() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.agentRuns.findMany({
    where: eq(agentRuns.orgId, session.user.orgId),
    orderBy: [desc(agentRuns.createdAt)],
    limit: 25,
  });
}

export async function getAgentConfigs() {
  const session = await auth();
  if (!session?.user) return [];

  const existing = await db.query.agentConfigs.findMany({
    where: eq(agentConfigs.orgId, session.user.orgId),
  });

  const defaultAgents: Array<"prospector" | "deal_doctor" | "guardian" | "briefing"> = [
    "prospector",
    "deal_doctor",
    "guardian",
    "briefing",
  ];

  // Seed default configs if missing
  for (const agentType of defaultAgents) {
    if (!existing.some((e) => e.agentType === agentType)) {
      const [newCfg] = await db
        .insert(agentConfigs)
        .values({
          orgId: session.user.orgId,
          agentType,
          isEnabled: true,
          executionMode: "supervised",
          model: "gemini-2.5-flash",
          sweepIntervalHours: 24,
        })
        .returning();
      existing.push(newCfg);
    }
  }

  return existing;
}

export async function updateAgentConfig(
  agentType: "prospector" | "deal_doctor" | "guardian" | "briefing",
  data: { isEnabled?: boolean; executionMode?: "full_auto" | "supervised"; model?: string }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  await db
    .insert(agentConfigs)
    .values({
      orgId,
      agentType,
      isEnabled: data.isEnabled ?? true,
      executionMode: data.executionMode ?? "supervised",
      model: data.model || "gemini-2.5-flash",
    })
    .onConflictDoUpdate({
      target: [agentConfigs.orgId, agentConfigs.agentType],
      set: {
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.executionMode !== undefined ? { executionMode: data.executionMode } : {}),
        ...(data.model ? { model: data.model } : {}),
      },
    });

  revalidatePath("/dashboard/agent-hub");
  return { success: true };
}

export async function triggerManualSweep() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  // 1. Run Deal Doctor across all open deals
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
  });

  for (const deal of allDeals) {
    await runDealDoctorAgent(orgId, deal.id, "sweep");
  }

  // 2. Run Guardian
  await runGuardianAgent(orgId, orgId, "sweep");

  // 3. Run Executive Briefing
  await runBriefingAgent(orgId);

  revalidatePath("/dashboard/agent-hub");
  revalidatePath("/dashboard/deals");
  return { success: true, processedDeals: allDeals.length };
}

import { executeWaterfallEnrichment, WaterfallEnrichmentInput } from "@/lib/agents/enrichment/waterfall";
import { competitorBattlecards } from "@/db/schema";

export async function triggerAgentForEntity(
  agentType: "prospector" | "deal_doctor" | "guardian" | "briefing",
  entityType: "contact" | "company" | "deal" | "org",
  entityId: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  if (agentType === "prospector") {
    if (entityType === "company" || entityType === "contact") {
      return runProspectorAgent(orgId, entityType, entityId, "manual");
    }
  } else if (agentType === "deal_doctor" && entityType === "deal") {
    return runDealDoctorAgent(orgId, entityId, "manual");
  } else if (agentType === "guardian") {
    return runGuardianAgent(orgId, entityId, "manual");
  } else if (agentType === "briefing") {
    return runBriefingAgent(orgId);
  }

  throw new Error("Invalid agent invocation parameters");
}

export async function runWaterfallEnrichmentTest(input: WaterfallEnrichmentInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return executeWaterfallEnrichment(input);
}

export async function getCompetitorBattlecards() {
  const session = await auth();
  if (!session?.user) return [];

  const cards = await db.query.competitorBattlecards.findMany({
    where: eq(competitorBattlecards.orgId, session.user.orgId),
    orderBy: [desc(competitorBattlecards.createdAt)],
  });

  if (cards.length === 0) {
    // Default seed battlecards for instant enterprise value
    const defaults = [
      {
        orgId: session.user.orgId,
        competitorName: "Legacy Salesforce Cloud",
        pricingComparison: "Salesforce charges ₹15,000/seat/mo + mandatory 1-yr enterprise contract + paid add-ons for Agentforce.",
        ourStrengths: [
          "10x Faster UI with instant Turbopack rendering",
          "Built-in Autonomous Agent Fleet included at no extra cost",
          "Native WhatsApp & Telephony CTI integration",
          "Transparent pricing with no seat gouging",
        ],
        theirWeaknesses: [
          "Clunky multi-second page loads and complex admin overhead",
          "Extremely expensive consulting required for customization",
          "Separate billing for Agentforce credits",
        ],
        objectionHandlers: [
          {
            objection: "We are already locked into Salesforce.",
            response: "Keel provides a 1-click CSV and REST sync bridge, enabling your sales team to experience 10x faster execution without breaking existing data models.",
          },
          {
            objection: "Is Keel secure enough for enterprise data?",
            response: "Keel isolates every tenant with LibSQL encryption and provides complete audit logs and GDPR data sovereignty.",
          },
        ],
      },
      {
        orgId: session.user.orgId,
        competitorName: "HubSpot Enterprise",
        pricingComparison: "HubSpot charges high onboarding fees (₹2,50,000+) and gates advanced automation behind enterprise tier.",
        ourStrengths: [
          "Quote-to-Cash integrated natively without expensive Hub add-ons",
          "Human-in-the-Loop AI Agent Control Hub with audit stream",
          "Full custom widgets and industry vertical adaptation",
        ],
        theirWeaknesses: [
          "Steep price ramps as contact lists grow",
          "Rigid contact tier limits",
        ],
        objectionHandlers: [
          {
            objection: "HubSpot has more marketing tools.",
            response: "Keel focuses on high-velocity revenue execution and AI autonomous pipeline revival, integrating seamlessly with your existing marketing stack via webhooks.",
          },
        ],
      },
    ];

    for (const d of defaults) {
      await db.insert(competitorBattlecards).values(d).catch(() => {});
    }

    return db.query.competitorBattlecards.findMany({
      where: eq(competitorBattlecards.orgId, session.user.orgId),
    });
  }

  return cards;
}

export async function saveCompetitorBattlecard(data: {
  id?: string;
  competitorName: string;
  pricingComparison?: string;
  ourStrengths: string[];
  theirWeaknesses: string[];
  objectionHandlers: { objection: string; response: string }[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  if (data.id) {
    await db
      .update(competitorBattlecards)
      .set({
        competitorName: data.competitorName,
        pricingComparison: data.pricingComparison,
        ourStrengths: data.ourStrengths,
        theirWeaknesses: data.theirWeaknesses,
        objectionHandlers: data.objectionHandlers,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(competitorBattlecards.id, data.id), eq(competitorBattlecards.orgId, orgId)));
  } else {
    await db.insert(competitorBattlecards).values({
      orgId,
      competitorName: data.competitorName,
      pricingComparison: data.pricingComparison,
      ourStrengths: data.ourStrengths,
      theirWeaknesses: data.theirWeaknesses,
      objectionHandlers: data.objectionHandlers,
    });
  }

  revalidatePath("/dashboard/agent-hub");
  return { success: true };
}
