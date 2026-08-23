"use server";

import { db } from "@/db";
import { automations, automationConditions, automationActions, automationRuns, tasks, contacts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAutomations() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.automations.findMany({
    where: eq(automations.orgId, session.user.orgId),
    with: {
      automationConditions: true,
      automationActions: true,
    },
    orderBy: [desc(automations.createdAt)],
  });
}

export async function createAutomation(data: {
  name: string;
  trigger: "deal_stage_changed" | "contact_created" | "task_overdue" | "activity_created";
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt";
    value: string;
  };
  action: {
    actionType: "create_task" | "send_notification" | "call_webhook" | "add_tag";
    config: Record<string, any>;
  };
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const result = await db.transaction(async (tx) => {
    // 1. Create automation record
    const [auto] = await tx
      .insert(automations)
      .values({
        orgId,
        name: data.name.trim(),
        trigger: data.trigger,
        isEnabled: true,
      })
      .returning();

    // 2. Add conditions if any
    if (data.condition) {
      await tx.insert(automationConditions).values({
        automationId: auto.id,
        field: data.condition.field,
        operator: data.condition.operator,
        value: data.condition.value,
      });
    }

    // 3. Add actions
    await tx.insert(automationActions).values({
      automationId: auto.id,
      actionType: data.action.actionType,
      config: data.action.config,
    });

    return auto;
  });

  revalidatePath("/dashboard/settings");
  return result;
}

export async function toggleAutomation(id: string, isEnabled: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db
    .update(automations)
    .set({ isEnabled })
    .where(and(eq(automations.id, id), eq(automations.orgId, session.user.orgId)));

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteAutomation(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(automations).where(and(eq(automations.id, id), eq(automations.orgId, session.user.orgId)));

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function getAutomationRuns(automationId: string) {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.automationRuns.findMany({
    where: eq(automationRuns.automationId, automationId),
    orderBy: [desc(automationRuns.ranAt)],
    limit: 30,
  });
}

// Background workflow engine runner (NextAuth auth-free for database updates triggers)
export async function triggerWorkflows(
  orgId: string,
  event: "deal_stage_changed" | "contact_created" | "activity_created",
  entityId: string,
  context: Record<string, any>
) {
  try {
    const activeAutomations = await db.query.automations.findMany({
      where: and(
        eq(automations.orgId, orgId),
        eq(automations.trigger, event),
        eq(automations.isEnabled, true)
      ),
      with: {
        automationConditions: true,
        automationActions: true,
      },
    });

    for (const auto of activeAutomations) {
      try {
        let matchesConditions = true;
        for (const cond of auto.automationConditions) {
          const val = context[cond.field];
          if (cond.operator === "equals" && String(val) !== cond.value) {
            matchesConditions = false;
          }
        }

        if (!matchesConditions) continue;

        for (const action of auto.automationActions) {
          if (action.actionType === "create_task") {
            const cfg = action.config as { title: string; description?: string; dueDays?: number };
            const dueDays = cfg.dueDays || 2;
            const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);
            
            await db.insert(tasks).values({
              orgId,
              title: cfg.title,
              description: cfg.description || "Automated workflow task",
              dueDate,
              isDone: false,
              relatedContactId: context.contactId || null,
              relatedCompanyId: context.companyId || null,
              relatedDealId: context.dealId || null,
              assigneeId: context.ownerId || null,
            });
          } else if (action.actionType === "add_tag") {
            const cfg = action.config as { tag: string };
            if (context.contactId && cfg.tag) {
              const contactMatch = await db.query.contacts.findFirst({
                where: eq(contacts.id, context.contactId),
              });
              if (contactMatch) {
                const currentTags = contactMatch.tags || [];
                if (!currentTags.includes(cfg.tag)) {
                  await db
                    .update(contacts)
                    .set({ tags: [...currentTags, cfg.tag] })
                    .where(eq(contacts.id, context.contactId));
                }
              }
            }
          }
        }

        await db.insert(automationRuns).values({
          automationId: auto.id,
          status: "success",
          detail: `Executed ${auto.automationActions.length} action(s).`,
        });
      } catch (err: any) {
        await db.insert(automationRuns).values({
          automationId: auto.id,
          status: "failed",
          detail: err.message || "Error running action",
        });
      }
    }
  } catch (globalErr) {
    console.error("Global workflow failure:", globalErr);
  }
}
