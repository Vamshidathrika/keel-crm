"use server";

import { db } from "@/db";
import {
  automations,
  automationConditions,
  automationActions,
  automationRuns,
  tasks,
  contacts,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { executeWorkflowGraph, WorkflowExecutionResult } from "@/lib/workflow-executor";
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
  description?: string;
  trigger: any;
  graphData?: { nodes: any[]; edges: any[] };
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt";
    value: string;
  };
  action: {
    actionType: any;
    config: Record<string, any>;
  };
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied: Only Admins and Managers can create automations.");

  const result = await db.transaction(async (tx) => {
    // 1. Create automation record
    const [auto] = await tx
      .insert(automations)
      .values({
        orgId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        trigger: data.trigger,
        graphData: data.graphData || null,
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

    // 3. Add action
    await tx.insert(automationActions).values({
      automationId: auto.id,
      actionType: data.action.actionType,
      config: data.action.config,
      order: 1,
    });

    return auto;
  });

  await logAuditEntry(orgId, userId, "create", "automation", result.id, {
    name: result.name,
    trigger: result.trigger,
  });

  revalidatePath("/dashboard/settings");
  return result;
}

/**
 * Save Visual Workflow Graph from XYFlow Canvas
 */
export async function saveVisualWorkflowGraph(
  automationId: string,
  graphData: { nodes: any[]; edges: any[] }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied");

  const [updated] = await db
    .update(automations)
    .set({
      graphData,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(automations.id, automationId), eq(automations.orgId, orgId)))
    .returning();

  await logAuditEntry(orgId, userId, "update", "workflow_graph", automationId, {
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
  });

  revalidatePath("/dashboard/settings");
  return updated;
}

/**
 * 1-Click Test Run Simulator
 */
export async function testRunWorkflow(
  automationId: string,
  mockPayload: Record<string, any> = {}
): Promise<WorkflowExecutionResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const defaultMock = {
    title: "Enterprise Deal (ACME Corp)",
    value: 250000,
    stageId: "stg_negotiation",
    contactId: "cnt_sample_buyer",
    ownerId: session.user.id,
    ...mockPayload,
  };

  return executeWorkflowGraph(automationId, defaultMock);
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

/**
 * Trigger background workflows on database mutation events
 */
export async function triggerWorkflows(
  orgId: string,
  event: any,
  entityId: string,
  context: Record<string, any> = {}
) {
  try {
    const activeAutomations = await db.query.automations.findMany({
      where: and(
        eq(automations.orgId, orgId),
        eq(automations.trigger, event),
        eq(automations.isEnabled, true)
      ),
    });

    for (const auto of activeAutomations) {
      await executeWorkflowGraph(auto.id, {
        entityId,
        ...context,
      }).catch((e) => console.error(`Workflow execution error [${auto.id}]:`, e));
    }
  } catch (err) {
    console.error("Workflow trigger dispatcher error:", err);
  }
}
