"use server";

import { db } from "@/db";
import { tasks, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTasks() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(tasks.orgId, orgId)];
  if (ownerIdFilter) {
    conditions.push(eq(tasks.assigneeId, ownerIdFilter));
  }

  return db.query.tasks.findMany({
    where: and(...conditions),
    with: {
      relatedContact: true,
      relatedCompany: true,
      relatedDeal: true,
      assignee: {
        columns: {
          name: true,
        }
      }
    },
    orderBy: [desc(tasks.dueDate)],
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  relatedContactId?: string;
  relatedCompanyId?: string;
  relatedDealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const assigneeId = session.user.role === "rep" ? userId : (data.assigneeId || userId);

  const [task] = await db
    .insert(tasks)
    .values({
      orgId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate: data.dueDate || null,
      isDone: false,
      assigneeId,
      createdById: userId,
      relatedContactId: data.relatedContactId || null,
      relatedCompanyId: data.relatedCompanyId || null,
      relatedDealId: data.relatedDealId || null,
    })
    .returning();

  // Log on associated Contact timeline
  if (data.relatedContactId) {
    await db.insert(activities).values({
      orgId,
      type: "task",
      relatedContactId: data.relatedContactId,
      actorUserId: userId,
      body: `Task created: "${task.title}" (Due: ${task.dueDate || "No Date"})`,
      source: "manual",
    });
  }

  await logAuditEntry(orgId, userId, "create", "task", task.id, {
    title: task.title,
    assigneeId,
  });

  revalidatePath("/dashboard/tasks");
  return task;
}

export async function toggleTaskStatus(id: string, isDone: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(tasks.orgId, orgId), eq(tasks.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(tasks.assigneeId, ownerIdFilter));
  }

  const task = await db.query.tasks.findFirst({
    where: and(...conditions),
  });

  if (!task) throw new Error("Task not found or access denied.");

  const completedAt = isDone ? new Date().toISOString() : null;

  const [updated] = await db
    .update(tasks)
    .set({
      isDone,
      completedAt,
    })
    .where(and(...conditions))
    .returning();

  // Log activity timeline update
  if (task.relatedContactId) {
    await db.insert(activities).values({
      orgId,
      type: "task",
      relatedContactId: task.relatedContactId,
      actorUserId: userId,
      body: `Task ${isDone ? "completed" : "reopened"}: "${task.title}"`,
      source: "manual",
    });
  }

  await logAuditEntry(orgId, userId, "toggle_task", "task", id, {
    taskId: id,
    isDone,
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/contacts");
  return updated;
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(tasks.orgId, orgId), eq(tasks.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(tasks.assigneeId, ownerIdFilter));
  }

  const task = await db.query.tasks.findFirst({
    where: and(...conditions),
  });

  if (!task) throw new Error("Task not found or access denied.");

  await db.delete(tasks).where(and(...conditions));

  await logAuditEntry(orgId, userId, "delete", "task", id, {
    taskId: id,
    title: task.title,
  });

  revalidatePath("/dashboard/tasks");
  return { success: true };
}
