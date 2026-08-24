import { db } from "@/db";
import { automations, automationActions, automationConditions, automationRuns, activities, contacts, deals, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export interface WorkflowEventContext {
  orgId: string;
  eventType: "deal_stage_changed" | "contact_created" | "task_overdue" | "activity_created";
  entityType?: "contact" | "deal" | "company" | "invoice";
  entityId?: string;
  data: Record<string, any>;
}

/**
 * Evaluates matching active workflows and executes action sequences
 */
export async function processWorkflowEvent(context: WorkflowEventContext) {
  const { orgId, eventType, entityType, entityId, data } = context;

  try {
    const rules = await db.query.automations.findMany({
      where: and(eq(automations.orgId, orgId), eq(automations.isEnabled, true)),
      with: {
        automationConditions: true,
        automationActions: true,
      },
    });

    const matchingRules = rules.filter((r) => r.trigger === eventType);

    for (const rule of matchingRules) {
      // 1. Evaluate conditions
      let passes = true;
      for (const cond of rule.automationConditions) {
        const val = String(data[cond.field] ?? "");
        if (cond.operator === "equals" && val !== cond.value) passes = false;
        if (cond.operator === "not_equals" && val === cond.value) passes = false;
        if (cond.operator === "contains" && !val.includes(cond.value)) passes = false;
        if (cond.operator === "gt" && Number(val) <= Number(cond.value)) passes = false;
        if (cond.operator === "lt" && Number(val) >= Number(cond.value)) passes = false;
      }

      if (!passes) {
        await db.insert(automationRuns).values({
          automationId: rule.id,
          status: "skipped",
          detail: "Conditions not met",
        });
        continue;
      }

      // 2. Execute Action Blocks
      for (const act of rule.automationActions) {
        const config: any = act.config || {};

        switch (act.actionType) {
          case "create_task": {
            const dueDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
            await db.insert(tasks).values({
              orgId,
              title: config.taskTitle || `Automated Task: ${rule.name}`,
              description: `Triggered by automation: ${rule.name}`,
              dueDate,
              isDone: false,
              relatedContactId: entityType === "contact" ? entityId : null,
              relatedDealId: entityType === "deal" ? entityId : null,
            });
            break;
          }

          case "send_notification": {
            await db.insert(activities).values({
              orgId,
              type: "note",
              relatedContactId: entityType === "contact" ? entityId : null,
              relatedDealId: entityType === "deal" ? entityId : null,
              body: `⚡ Automation Alert [${rule.name}]: ${config.message || "Automated trigger executed."}`,
              source: "ai",
            });
            break;
          }

          case "call_webhook": {
            await dispatchWebhookEvent(orgId, `automation.${rule.id}`, {
              ruleName: rule.name,
              eventType,
              entityType,
              entityId,
              data,
            });
            break;
          }

          case "add_tag": {
            if (entityType === "contact" && entityId && config.tag) {
              const c = await db.query.contacts.findFirst({ where: eq(contacts.id, entityId) });
              if (c) {
                const updatedTags = Array.from(new Set([...(c.tags || []), config.tag]));
                await db.update(contacts).set({ tags: updatedTags }).where(eq(contacts.id, entityId));
              }
            }
            break;
          }
        }
      }

      // 3. Record Successful Run
      await db.insert(automationRuns).values({
        automationId: rule.id,
        status: "success",
        detail: `Executed ${rule.automationActions.length} action(s)`,
      });
    }

    return { evaluatedCount: matchingRules.length };
  } catch (err: any) {
    console.error("Workflow processing error:", err);
    return { error: err.message };
  }
}
