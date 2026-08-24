import { db } from "@/db";
import { deals, activities, agentRuns, agentConfigs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { toolDiagnoseDeal, toolProposeAction, toolCreateAutonomousTask } from "./tools";
import { AgentRunOutput, ProposedAction } from "./types";

export async function runDealDoctorAgent(
  orgId: string,
  dealId: string,
  triggerSource: "event" | "sweep" | "manual" = "event"
): Promise<AgentRunOutput> {
  const startTime = Date.now();
  const thoughtProcess: string[] = [];
  const toolsInvoked: Array<{ tool: string; params: any; result: any }> = [];
  const actionsProposed: ProposedAction[] = [];

  const config = await db.query.agentConfigs.findFirst({
    where: and(eq(agentConfigs.orgId, orgId), eq(agentConfigs.agentType, "deal_doctor")),
  });
  const executionMode = config?.executionMode || "supervised";

  thoughtProcess.push(`[Triage] Initiating Deal Doctor audit for deal #${dealId} (Source: ${triggerSource}, Mode: ${executionMode}).`);

  const deal = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    with: {
      stage: true,
      contact: true,
      company: true,
      owner: true,
    },
  });

  if (!deal) {
    return {
      runId: "",
      status: "failed",
      confidenceScore: 0,
      thoughtProcess,
      summary: "Deal record not found.",
      toolsInvoked,
      actionsProposed,
      executionDurationMs: Date.now() - startTime,
    };
  }

  // Fetch recent activities for this deal
  const recentActivities = await db.query.activities.findMany({
    where: and(eq(activities.orgId, orgId), eq(activities.relatedDealId, dealId)),
    orderBy: [desc(activities.createdAt)],
    limit: 5,
  });

  thoughtProcess.push(`[History] Analyzed ${recentActivities.length} historical timeline event(s). Stage: "${deal.stage?.name || "Unknown"}".`);

  const flags: string[] = [];
  let revisedProbability = deal.probability;
  let severity: "info" | "warning" | "critical" = "info";

  // Check 1: Dwell time / Stalled deal detection
  const createdAtMs = new Date(deal.createdAt).getTime();
  const daysOpen = Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24));
  
  if (deal.stage?.type === "open" && daysOpen > 21) {
    flags.push("LONG_SALES_CYCLE");
  }

  // Check 2: Ghosting detection (no activity in 7 days)
  const lastActivityDate = recentActivities[0]?.occurredAt || deal.createdAt;
  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceActivity >= 7) {
    flags.push("STALLED_NO_TOUCH");
    revisedProbability = Math.max(10, Math.floor(revisedProbability * 0.7)); // Reduce win prob by 30%
    severity = "warning";
    thoughtProcess.push(`[Risk] Deal has had no recorded activity for ${daysSinceActivity} days. Win probability adjusted to ${revisedProbability}%.`);
  }

  // Check 3: Overdue close date
  if (deal.expectedCloseDate) {
    const isPastClose = new Date(deal.expectedCloseDate).getTime() < Date.now();
    if (isPastClose && deal.stage?.type === "open") {
      flags.push("OVERDUE_CLOSE_DATE");
      severity = "critical";
      thoughtProcess.push(`[Risk] Expected close date (${deal.expectedCloseDate}) has lapsed.`);
    }
  }

  // Check 4: High-value opportunity health
  if (deal.value >= 1000000 && flags.length === 0) {
    flags.push("HIGH_VALUE_FAST_TRACK");
    thoughtProcess.push(`[Opportunity] High value deal (${deal.currency} ${deal.value.toLocaleString()}) proceeding with clean velocity.`);
  }

  const interventionRequired = flags.includes("STALLED_NO_TOUCH") || flags.includes("OVERDUE_CLOSE_DATE");
  const summary = interventionRequired
    ? `Deal Doctor flagged ${flags.length} risk items. Win probability adjusted to ${revisedProbability}%. Immediate follow-up required.`
    : `Deal Doctor audit complete: Deal is progressing within healthy velocity benchmarks. Flags: [${flags.join(", ") || "HEALTHY"}].`;

  // Apply diagnostic tool
  const diagResult = await toolDiagnoseDeal(orgId, deal.id, {
    healthFlags: flags,
    revisedProbability,
    interventionRequired,
    reasoning: summary,
  });
  toolsInvoked.push({ tool: "toolDiagnoseDeal", params: { dealId: deal.id, flags }, result: diagResult });

  // If intervention is required, create action or proposal
  if (interventionRequired) {
    const action: ProposedAction = {
      title: `Intervention: Re-engage ${deal.company?.name || deal.title}`,
      description: `Deal has had no activity for ${daysSinceActivity} days. Revive engagement before lead goes cold.`,
      actionType: "create_task",
      actionPayload: {
        title: `Deal Revival: Follow up with ${deal.contact?.firstName || "client"} regarding "${deal.title}"`,
        description: `Deal Doctor Diagnostic:\n• Stalled for ${daysSinceActivity} days\n• Risk flags: ${flags.join(", ")}\n• Target value: ${deal.currency} ${deal.value.toLocaleString()}`,
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        assigneeId: deal.ownerId,
        dueDays: 1,
      },
      severity,
    };

    if (executionMode === "supervised") {
      await toolProposeAction(orgId, "deal_doctor", null, action);
      actionsProposed.push(action);
      thoughtProcess.push(`[HITL Queue] Queued deal intervention action to approval queue.`);
    } else {
      await toolCreateAutonomousTask(orgId, {
        title: action.actionPayload.title,
        description: action.actionPayload.description,
        relatedDealId: deal.id,
        relatedContactId: deal.contactId || undefined,
        relatedCompanyId: deal.companyId || undefined,
        assigneeId: deal.ownerId || undefined,
        dueDays: 1,
      });
      thoughtProcess.push(`[Full-Auto] Created autonomous task assigned to rep.`);
    }
  }

  // Persist execution log
  const [runRecord] = await db
    .insert(agentRuns)
    .values({
      orgId,
      agentType: "deal_doctor",
      targetEntityType: "deal",
      targetEntityId: dealId,
      status: actionsProposed.length > 0 ? "requires_approval" : "completed",
      confidenceScore: 0.92,
      thoughtProcess,
      summary,
      toolsInvoked,
      executionDurationMs: Date.now() - startTime,
    })
    .returning();

  return {
    runId: runRecord.id,
    status: runRecord.status as any,
    confidenceScore: 0.92,
    thoughtProcess,
    summary,
    toolsInvoked,
    actionsProposed,
    executionDurationMs: Date.now() - startTime,
  };
}
