import { db } from "@/db";
import {
  companies,
  contacts,
  deals,
  tasks,
  activities,
  agentActionQueue,
  agentMemories,
  tags,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AgentToolResult, ProposedAction } from "./types";

/**
 * Micro-Tool 1: Enrich Company Profile with AI Account Signals & ICP categorization
 */
export async function toolEnrichCompany(
  orgId: string,
  companyId: string,
  signals: {
    industry?: string;
    techStack?: string[];
    employeeRange?: string;
    summary?: string;
    icpFit?: "Tier 1 (High)" | "Tier 2 (Medium)" | "Tier 3 (Low)";
  }
): Promise<AgentToolResult> {
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), eq(companies.orgId, orgId)),
  });

  if (!company) {
    return { status: "error", summary: "Company not found" };
  }

  const existingCustom = company.customFields || {};
  const updatedCustom = {
    ...existingCustom,
    ...(signals.employeeRange ? { employeeRange: signals.employeeRange } : {}),
    ...(signals.icpFit ? { icpTier: signals.icpFit } : {}),
    ...(signals.techStack ? { detectedTech: signals.techStack.join(", ") } : {}),
  };

  const updatedTags = new Set(company.tags || []);
  if (signals.icpFit) updatedTags.add(`ICP:${signals.icpFit.split(" ")[0]}`);

  await db
    .update(companies)
    .set({
      industry: signals.industry || company.industry,
      tags: Array.from(updatedTags),
      customFields: updatedCustom,
    })
    .where(eq(companies.id, companyId));

  // Save durable agent memory
  await db
    .insert(agentMemories)
    .values({
      orgId,
      entityType: "company",
      entityId: companyId,
      key: "dossier_summary",
      value: { summary: signals.summary, enrichedAt: new Date().toISOString() },
      confidence: 0.9,
      sourceAgent: "prospector",
    })
    .onConflictDoUpdate({
      target: [agentMemories.orgId, agentMemories.entityType, agentMemories.entityId, agentMemories.key],
      set: {
        value: { summary: signals.summary, enrichedAt: new Date().toISOString() },
        confidence: 0.9,
      },
    });

  // Log activity note
  if (signals.summary) {
    await db.insert(activities).values({
      orgId,
      type: "ai",
      relatedCompanyId: companyId,
      body: `🤖 Prospector Agent Enriched Company: ${signals.summary}`,
      source: "ai",
    });
  }

  return {
    status: "success",
    summary: `Enriched company "${company.name}" with ICP signals and intelligence dossier.`,
    data: { companyId, icpFit: signals.icpFit },
    nextSteps: ["score_associated_contacts"],
  };
}

/**
 * Micro-Tool 2: Lead Scoring & Factor Breakdown
 */
export async function toolScoreContact(
  orgId: string,
  contactId: string,
  scoring: {
    score: number;
    band: "hot" | "warm" | "cold";
    factors: { label: string; direction: "up" | "down"; explanation: string }[];
    recommendation: string;
  }
): Promise<AgentToolResult> {
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)),
  });

  if (!contact) {
    return { status: "error", summary: "Contact not found" };
  }

  const updatedTags = new Set(contact.tags || []);
  updatedTags.delete("Hot Lead");
  updatedTags.delete("Warm Lead");
  updatedTags.delete("Cold Lead");

  if (scoring.band === "hot") updatedTags.add("Hot Lead");
  else if (scoring.band === "warm") updatedTags.add("Warm Lead");
  else updatedTags.add("Cold Lead");

  await db
    .update(contacts)
    .set({
      score: Math.min(100, Math.max(0, scoring.score)),
      scoreBreakdown: {
        band: scoring.band,
        factors: scoring.factors,
        recommendation: scoring.recommendation,
      },
      tags: Array.from(updatedTags),
    })
    .where(eq(contacts.id, contactId));

  return {
    status: "success",
    summary: `Updated lead score to ${scoring.score}/100 (${scoring.band.toUpperCase()}) for ${contact.firstName}.`,
    data: { contactId, score: scoring.score, band: scoring.band },
    nextSteps: scoring.band === "hot" ? ["propose_hot_lead_followup"] : [],
  };
}

/**
 * Micro-Tool 3: Deal Health Diagnostic & Risk Flagging
 */
export async function toolDiagnoseDeal(
  orgId: string,
  dealId: string,
  diagnostic: {
    healthFlags: string[];
    revisedProbability?: number;
    interventionRequired: boolean;
    reasoning: string;
  }
): Promise<AgentToolResult> {
  const deal = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    with: { stage: true },
  });

  if (!deal) {
    return { status: "error", summary: "Deal not found" };
  }

  await db
    .update(deals)
    .set({
      healthFlags: diagnostic.healthFlags,
      ...(diagnostic.revisedProbability !== undefined ? { probability: diagnostic.revisedProbability } : {}),
    })
    .where(eq(deals.id, dealId));

  return {
    status: "success",
    summary: `Diagnosed deal "${deal.title}". Flags: [${diagnostic.healthFlags.join(", ") || "HEALTHY"}]. Revised Win Prob: ${diagnostic.revisedProbability ?? deal.probability}%.`,
    data: { dealId, healthFlags: diagnostic.healthFlags, interventionRequired: diagnostic.interventionRequired },
    nextSteps: diagnostic.interventionRequired ? ["queue_rep_intervention"] : [],
  };
}

/**
 * Micro-Tool 4: Create Autonomous Task
 */
export async function toolCreateAutonomousTask(
  orgId: string,
  taskData: {
    title: string;
    description?: string;
    dueDays?: number;
    relatedContactId?: string;
    relatedDealId?: string;
    relatedCompanyId?: string;
    assigneeId?: string;
  }
): Promise<AgentToolResult> {
  const dueDays = taskData.dueDays || 2;
  const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);

  const [newTask] = await db
    .insert(tasks)
    .values({
      orgId,
      title: taskData.title,
      description: taskData.description || "Autonomous agent-generated task",
      dueDate,
      isDone: false,
      relatedContactId: taskData.relatedContactId || null,
      relatedDealId: taskData.relatedDealId || null,
      relatedCompanyId: taskData.relatedCompanyId || null,
      assigneeId: taskData.assigneeId || null,
    })
    .returning();

  return {
    status: "success",
    summary: `Created task "${newTask.title}" due on ${dueDate}.`,
    data: { taskId: newTask.id },
  };
}

/**
 * Micro-Tool 5: Propose Action to Human-in-the-Loop (HITL) Queue
 */
export async function toolProposeAction(
  orgId: string,
  agentType: string,
  runId: string | null,
  action: ProposedAction
): Promise<AgentToolResult> {
  const payloadWithMeta = {
    ...action.actionPayload,
    riskTier: action.riskTier || "medium",
    beforeState: action.beforeState || null,
    proposedState: action.proposedState || null,
    provenance: action.provenance || { source: "agent_inference", timestamp: new Date().toISOString() },
  };

  const [item] = await db
    .insert(agentActionQueue)
    .values({
      orgId,
      runId,
      agentType,
      title: action.title,
      description: action.description,
      actionType: action.actionType,
      actionPayload: payloadWithMeta,
      severity: action.severity || "info",
      status: "pending",
    })
    .returning();

  return {
    status: "success",
    summary: `Queued action for review: "${action.title}" [Risk: ${(action.riskTier || "medium").toUpperCase()}]`,
    data: { actionId: item.id },
  };
}

/**
 * Executes an approved action from the HITL queue
 */
export async function executeApprovedAction(
  orgId: string,
  actionId: string,
  userId: string
): Promise<AgentToolResult> {
  const action = await db.query.agentActionQueue.findFirst({
    where: and(eq(agentActionQueue.id, actionId), eq(agentActionQueue.orgId, orgId)),
  });

  if (!action) throw new Error("Action not found in approval queue.");
  if (action.status === "approved" || action.status === "executed") {
    return { status: "warning", summary: "Action already executed." };
  }

  const payload = action.actionPayload || {};

  switch (action.actionType) {
    case "create_task": {
      await toolCreateAutonomousTask(orgId, {
        title: payload.title || action.title,
        description: payload.description || action.description,
        dueDays: payload.dueDays || 2,
        relatedContactId: payload.contactId,
        relatedDealId: payload.dealId,
        relatedCompanyId: payload.companyId,
        assigneeId: payload.assigneeId || userId,
      });
      break;
    }
    case "update_deal_health": {
      if (payload.dealId) {
        await db
          .update(deals)
          .set({
            healthFlags: payload.healthFlags || [],
            ...(payload.probability !== undefined ? { probability: payload.probability } : {}),
          })
          .where(eq(deals.id, payload.dealId));
      }
      break;
    }
    case "tag_entity": {
      if (payload.entityType === "contact" && payload.entityId) {
        const c = await db.query.contacts.findFirst({ where: eq(contacts.id, payload.entityId) });
        if (c && payload.tag) {
          const newTags = Array.from(new Set([...(c.tags || []), payload.tag]));
          await db.update(contacts).set({ tags: newTags }).where(eq(contacts.id, payload.entityId));
        }
      }
      break;
    }
    case "move_stage": {
      if (payload.dealId && payload.stageId) {
        await db
          .update(deals)
          .set({ stageId: payload.stageId, ...(payload.probability ? { probability: payload.probability } : {}) })
          .where(eq(deals.id, payload.dealId));
      }
      break;
    }
    case "trigger_webhook": {
      if (payload.eventType) {
        const { dispatchWebhookEvent } = await import("@/lib/webhooks/dispatcher");
        await dispatchWebhookEvent(orgId, payload.eventType, payload.data || {});
      }
      break;
    }
    default: {
      // General task fallback
      await toolCreateAutonomousTask(orgId, {
        title: action.title,
        description: `${action.description} (Approved by user)`,
        assigneeId: userId,
      });
    }
  }

  await db
    .update(agentActionQueue)
    .set({
      status: "executed",
      reviewedById: userId,
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(agentActionQueue.id, actionId));

  return {
    status: "success",
    summary: `Successfully executed agent action: "${action.title}".`,
  };
}
