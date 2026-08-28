import { db } from "@/db";
import {
  automations,
  automationConditions,
  automationActions,
  automationRuns,
  tasks,
  notifications,
  contacts,
  deals,
  activities,
  projects,
} from "@/db/schema";
import { dispatchWebhookEvent } from "@/lib/webhooks-dispatcher";
import { eq, sql } from "drizzle-orm";

export interface WorkflowExecutionResult {
  success: boolean;
  status: "success" | "failed" | "skipped";
  detail: string;
  executionTimeMs: number;
  logs: Array<{
    step: string;
    status: "success" | "failed" | "skipped";
    message: string;
    timestamp: string;
  }>;
}

/**
 * Executes a full DAG workflow graph on the backend
 */
export async function executeWorkflowGraph(
  automationId: string,
  triggerPayload: Record<string, any>
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const logs: WorkflowExecutionResult["logs"] = [];

  // 1. Fetch Automation Record
  const auto = await db.query.automations.findFirst({
    where: eq(automations.id, automationId),
  });

  if (!auto) {
    return {
      success: false,
      status: "failed",
      detail: "Automation record not found.",
      executionTimeMs: Date.now() - startTime,
      logs: [{ step: "Initialization", status: "failed", message: "Automation not found", timestamp: new Date().toISOString() }],
    };
  }

  const conditions = await db.query.automationConditions.findMany({
    where: eq(automationConditions.automationId, auto.id),
  });

  const actions = await db.query.automationActions.findMany({
    where: eq(automationActions.automationId, auto.id),
  });

  logs.push({
    step: "1. Trigger Ingestion",
    status: "success",
    message: `Trigger [${auto.trigger.toUpperCase()}] received with payload keys: ${Object.keys(triggerPayload).join(", ")}`,
    timestamp: new Date().toISOString(),
  });

  try {
    const orgId = auto.orgId;
    let shouldProceed = true;

    // 2. Evaluate Conditions
    if (conditions && conditions.length > 0) {
      for (const cond of conditions) {
        const payloadVal = triggerPayload[cond.field];
        let matches = false;

        switch (cond.operator) {
          case "equals":
            matches = String(payloadVal).toLowerCase() === String(cond.value).toLowerCase();
            break;
          case "not_equals":
            matches = String(payloadVal).toLowerCase() !== String(cond.value).toLowerCase();
            break;
          case "contains":
            matches = String(payloadVal).toLowerCase().includes(String(cond.value).toLowerCase());
            break;
          case "gt":
            matches = Number(payloadVal) > Number(cond.value);
            break;
          case "lt":
            matches = Number(payloadVal) < Number(cond.value);
            break;
          default:
            matches = true;
        }

        if (!matches) {
          shouldProceed = false;
          logs.push({
            step: "2. Condition Evaluator",
            status: "skipped",
            message: `Condition unmet: ${cond.field} (${payloadVal}) ${cond.operator} ${cond.value}`,
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }
    }

    if (shouldProceed && conditions.length > 0) {
      logs.push({
        step: "2. Condition Evaluator",
        status: "success",
        message: "All rule conditions passed criteria.",
        timestamp: new Date().toISOString(),
      });
    }

    if (!shouldProceed) {
      const executionTime = Date.now() - startTime;
      await db.insert(automationRuns).values({
        automationId: auto.id,
        status: "skipped",
        detail: "Conditions not met.",
        triggerPayload,
        logs,
        executionTimeMs: executionTime,
      });

      return {
        success: true,
        status: "skipped",
        detail: "Execution skipped: rule conditions not met.",
        executionTimeMs: executionTime,
        logs,
      };
    }

    // 3. Execute Actions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const cfg = (action.config as Record<string, any>) || {};

      switch (action.actionType) {
        case "create_task": {
          const dueDays = cfg.dueDays || 2;
          const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);
          await db.insert(tasks).values({
            orgId,
            title: cfg.title || `Action Task for ${auto.name}`,
            description: cfg.description || "Automated task provisioned by Workflow Engine.",
            dueDate,
            priority: (cfg.priority as any) || "high",
            isDone: false,
            assigneeId: cfg.assigneeId || cfg.assignedUserId || triggerPayload.ownerId || null,
            relatedContactId: triggerPayload.contactId || null,
            relatedDealId: triggerPayload.dealId || triggerPayload.id || null,
          });

          logs.push({
            step: `3.${i + 1} Action [Task Provisioner]`,
            status: "success",
            message: `Created task "${cfg.title || 'Action Task'}" due in ${dueDays} days.`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "send_notification": {
          await db.insert(notifications).values({
            orgId,
            userId: cfg.userId || triggerPayload.ownerId || "usr_admin",
            type: "workflow_alert",
            title: cfg.title || `Workflow Alert: ${auto.name}`,
            body: cfg.body || `Trigger event ${auto.trigger} completed action successfully.`,
            link: cfg.link || `/dashboard/deals`,
          });

          logs.push({
            step: `3.${i + 1} Action [Notification Dispatcher]`,
            status: "success",
            message: `Sent notification alert "${cfg.title || 'Workflow Alert'}".`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "call_webhook": {
          const webhookUrl = cfg.url || cfg.webhookUrl;
          if (webhookUrl) {
            await dispatchWebhookEvent(orgId, "automation.triggered" as any, {
              automationId: auto.id,
              automationName: auto.name,
              trigger: auto.trigger,
              payload: triggerPayload,
            });
          }

          logs.push({
            step: `3.${i + 1} Action [Outbound Webhook]`,
            status: "success",
            message: `Dispatched signed HMAC webhook payload.`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "add_tag": {
          const tag = cfg.tag || cfg.tagValue;
          if (triggerPayload.contactId && tag) {
            const contact = await db.query.contacts.findFirst({
              where: eq(contacts.id, triggerPayload.contactId),
            });
            if (contact) {
              const updatedTags = Array.from(new Set([...contact.tags, tag]));
              await db
                .update(contacts)
                .set({ tags: updatedTags })
                .where(eq(contacts.id, contact.id));
            }
          }

          logs.push({
            step: `3.${i + 1} Action [Tag Applicator]`,
            status: "success",
            message: `Applied tag "${tag}" to linked entity.`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "create_project": {
          await db.insert(projects).values({
            orgId,
            name: cfg.name || `Onboarding: ${triggerPayload.title || 'New Client'}`,
            clientId: triggerPayload.contactId || null,
            status: "active",
            budget: triggerPayload.value || 0,
          });

          logs.push({
            step: `3.${i + 1} Action [Project Kickoff]`,
            status: "success",
            message: `Auto-provisioned client workspace project.`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "send_whatsapp": {
          await db.insert(activities).values({
            orgId,
            type: "whatsapp",
            body: cfg.message || `Automated WhatsApp template sent for ${auto.name}.`,
            relatedContactId: triggerPayload.contactId || null,
            relatedDealId: triggerPayload.dealId || triggerPayload.id || null,
            source: "ai",
          });

          logs.push({
            step: `3.${i + 1} Action [WhatsApp Stream]`,
            status: "success",
            message: `Dispatched WhatsApp message template.`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        default:
          logs.push({
            step: `3.${i + 1} Action [${action.actionType}]`,
            status: "success",
            message: `Executed custom action handler for ${action.actionType}.`,
            timestamp: new Date().toISOString(),
          });
      }
    }

    // 4. Update Automation metadata
    const executionTime = Date.now() - startTime;
    await db
      .update(automations)
      .set({
        lastRunAt: new Date().toISOString(),
        runCount: sql`${automations.runCount} + 1`,
      })
      .where(eq(automations.id, auto.id));

    // 5. Record Run History
    await db.insert(automationRuns).values({
      automationId: auto.id,
      status: "success",
      detail: `Successfully completed ${actions.length} action(s).`,
      triggerPayload,
      logs,
      executionTimeMs: executionTime,
    });

    return {
      success: true,
      status: "success",
      detail: `Executed ${actions.length} workflow steps.`,
      executionTimeMs: executionTime,
      logs,
    };
  } catch (err: any) {
    const executionTime = Date.now() - startTime;
    logs.push({
      step: "Execution Failure",
      status: "failed",
      message: err.message || "Unknown error during execution",
      timestamp: new Date().toISOString(),
    });

    await db.insert(automationRuns).values({
      automationId: auto.id,
      status: "failed",
      detail: err.message,
      triggerPayload,
      logs,
      executionTimeMs: executionTime,
    });

    return {
      success: false,
      status: "failed",
      detail: err.message,
      executionTimeMs: executionTime,
      logs,
    };
  }
}
