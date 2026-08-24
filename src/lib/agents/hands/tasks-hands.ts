import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { tasks, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const createTaskTool = tool(
  async ({ orgId, title, description, dueDays = 2, relatedContactId, relatedDealId, relatedCompanyId, assigneeId }) => {
    const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);
    const [newTask] = await db
      .insert(tasks)
      .values({
        orgId,
        title: title.trim(),
        description: description || "Created by Autonomous Agent Hands",
        dueDate,
        isDone: false,
        relatedContactId: relatedContactId || null,
        relatedDealId: relatedDealId || null,
        relatedCompanyId: relatedCompanyId || null,
        assigneeId: assigneeId || null,
      })
      .returning();

    return {
      status: "success",
      summary: `Created task "${newTask.title}" due on ${dueDate}`,
      taskId: newTask.id,
      dueDate,
    };
  },
  {
    name: "crm_create_task",
    description: "Create an actionable task or reminder in the CRM.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      title: z.string().describe("Task title / action item"),
      description: z.string().optional().describe("Detailed instructions or context"),
      dueDays: z.number().optional().default(2).describe("Days until due (e.g. 1 for tomorrow)"),
      relatedContactId: z.string().optional().describe("Linked contact ID"),
      relatedDealId: z.string().optional().describe("Linked deal ID"),
      relatedCompanyId: z.string().optional().describe("Linked company ID"),
      assigneeId: z.string().optional().describe("Assignee user ID"),
    }),
  }
);

export const completeTaskTool = tool(
  async ({ orgId, taskId }) => {
    await db
      .update(tasks)
      .set({
        isDone: true,
        completedAt: new Date().toISOString(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));

    return {
      status: "success",
      summary: `Marked task #${taskId} as completed.`,
    };
  },
  {
    name: "crm_complete_task",
    description: "Mark an open task as completed.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      taskId: z.string().describe("The task ID"),
    }),
  }
);

export const logActivityTool = tool(
  async ({ orgId, type, body, relatedContactId, relatedDealId, relatedCompanyId }) => {
    const [act] = await db
      .insert(activities)
      .values({
        orgId,
        type: type as any,
        body,
        relatedContactId: relatedContactId || null,
        relatedDealId: relatedDealId || null,
        relatedCompanyId: relatedCompanyId || null,
        source: "ai",
      })
      .returning();

    return {
      status: "success",
      summary: `Logged activity [${type.toUpperCase()}]: "${body.slice(0, 50)}..."`,
      activityId: act.id,
    };
  },
  {
    name: "crm_log_activity",
    description: "Log an activity note, meeting record, call log, or AI update to the CRM timeline.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      type: z.enum(["call", "email", "whatsapp", "note", "meeting", "ai", "system"]).describe("Activity type"),
      body: z.string().describe("Activity content or meeting notes"),
      relatedContactId: z.string().optional().describe("Contact ID"),
      relatedDealId: z.string().optional().describe("Deal ID"),
      relatedCompanyId: z.string().optional().describe("Company ID"),
    }),
  }
);
