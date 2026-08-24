import { db } from "@/db";
import { invoices, payments, agentRuns, agentConfigs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { toolProposeAction, toolCreateAutonomousTask } from "./tools";
import { AgentRunOutput, ProposedAction } from "./types";

export async function runGuardianAgent(
  orgId: string,
  targetId: string,
  triggerSource: "event" | "sweep" | "manual" = "event"
): Promise<AgentRunOutput> {
  const startTime = Date.now();
  const thoughtProcess: string[] = [];
  const toolsInvoked: Array<{ tool: string; params: any; result: any }> = [];
  const actionsProposed: ProposedAction[] = [];

  const config = await db.query.agentConfigs.findFirst({
    where: and(eq(agentConfigs.orgId, orgId), eq(agentConfigs.agentType, "guardian")),
  });
  const executionMode = config?.executionMode || "supervised";

  thoughtProcess.push(`[Monitoring] Initiating Account Guardian audit for client/invoice #${targetId} (Mode: ${executionMode}).`);

  // Query invoices associated with the org
  const overdueInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.orgId, orgId), eq(invoices.status, "overdue")),
    with: { client: true },
    limit: 5,
  });

  thoughtProcess.push(`[Ledger] Found ${overdueInvoices.length} overdue invoice(s) across customer accounts.`);

  const summary = `Guardian reviewed financial telemetry: ${overdueInvoices.length} overdue invoice(s) detected.`;

  for (const inv of overdueInvoices) {
    const action: ProposedAction = {
      title: `Overdue Collection: Invoice ${inv.invoiceNumber} (${inv.client?.name || "Client"})`,
      description: `Invoice ${inv.invoiceNumber} totaling ₹${inv.amount.toLocaleString()} is overdue. Dispatch automated payment reminder.`,
      actionType: "create_task",
      actionPayload: {
        title: `Payment Follow-up: Invoice ${inv.invoiceNumber} - ${inv.client?.name || "Client"}`,
        description: `Amount: ₹${inv.amount.toLocaleString()}\nDue Date: ${inv.dueDate}\nStatus: OVERDUE`,
        dueDays: 1,
      },
      severity: "warning",
    };

    if (executionMode === "supervised") {
      await toolProposeAction(orgId, "guardian", null, action);
      actionsProposed.push(action);
      thoughtProcess.push(`[HITL Queue] Queued overdue collection task for ${inv.invoiceNumber}.`);
    } else {
      await toolCreateAutonomousTask(orgId, {
        title: action.actionPayload.title,
        description: action.actionPayload.description,
        dueDays: 1,
      });
      thoughtProcess.push(`[Full-Auto] Created collection task for ${inv.invoiceNumber}.`);
    }
  }

  const [runRecord] = await db
    .insert(agentRuns)
    .values({
      orgId,
      agentType: "guardian",
      targetEntityType: "org",
      targetEntityId: targetId,
      status: actionsProposed.length > 0 ? "requires_approval" : "completed",
      confidenceScore: 0.95,
      thoughtProcess,
      summary,
      toolsInvoked,
      executionDurationMs: Date.now() - startTime,
    })
    .returning();

  return {
    runId: runRecord.id,
    status: runRecord.status as any,
    confidenceScore: 0.95,
    thoughtProcess,
    summary,
    toolsInvoked,
    actionsProposed,
    executionDurationMs: Date.now() - startTime,
  };
}
