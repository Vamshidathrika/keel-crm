"use server";

import { db } from "@/db";
import { users, tasks, deals, contacts, activities, organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManageUsers, canReassignRecords } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback when executed in test runner outside request lifecycle
  }
}

export type WorkloadMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "rep";
  isActive: boolean;
  maxCapacity: number;
  portalToken: string | null;
  portalUrl: string | null;
  metrics: {
    activeDealsCount: number;
    pipelineValue: number;
    openTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
    capacityLoadPercent: number;
    loadStatus: "low" | "optimal" | "high" | "overloaded";
  };
};

export type UnassignedItem = {
  id: string;
  type: "deal" | "task" | "contact";
  title: string;
  subtitle?: string | null;
  value?: number | null;
  priority?: string | null;
  dueDate?: string | null;
  createdAt: string;
};

/**
 * Calculates real-time workload and capacity metrics for all team members in the organization.
 */
export async function getTeamWorkloadSummary(): Promise<{
  members: WorkloadMember[];
  stats: {
    totalMembers: number;
    activeReps: number;
    totalOpenTasks: number;
    totalPipelineValue: number;
    unassignedCount: number;
    avgCapacityLoad: number;
  };
}> {
  const session = await auth();
  if (!session?.user) {
    return {
      members: [],
      stats: {
        totalMembers: 0,
        activeReps: 0,
        totalOpenTasks: 0,
        totalPipelineValue: 0,
        unassignedCount: 0,
        avgCapacityLoad: 0,
      },
    };
  }

  const { orgId } = session.user;

  // 1. Fetch all users in org
  const orgUsers = await db.query.users.findMany({
    where: eq(users.orgId, orgId),
    orderBy: [desc(users.createdAt)],
  });

  // 2. Fetch all open/recent tasks in org
  const allTasks = await db.query.tasks.findMany({
    where: eq(tasks.orgId, orgId),
  });

  // 3. Fetch all active deals in org
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
  });

  // 4. Fetch unassigned count
  const unassignedDeals = allDeals.filter((d) => !d.ownerId);
  const unassignedTasks = allTasks.filter((t) => !t.assigneeId && !t.isDone);
  const unassignedContacts = await db.query.contacts.findMany({
    where: and(eq(contacts.orgId, orgId), isNull(contacts.ownerId)),
    columns: { id: true },
  });

  const unassignedTotal = unassignedDeals.length + unassignedTasks.length + unassignedContacts.length;

  const now = new Date().getTime();

  // 5. Aggregate metrics per user
  const members: WorkloadMember[] = [];
  let totalOpenTasks = 0;
  let totalPipelineValue = 0;
  let loadSum = 0;

  for (const u of orgUsers) {
    // Generate portal token on the fly if user doesn't have one yet
    let userPortalToken = u.portalToken;
    if (!userPortalToken && u.isActive) {
      userPortalToken = `rep_${crypto.randomBytes(16).toString("hex")}`;
      await db
        .update(users)
        .set({ portalToken: userPortalToken })
        .where(eq(users.id, u.id));
    }

    const userTasks = allTasks.filter((t) => t.assigneeId === u.id);
    const openTasks = userTasks.filter((t) => !t.isDone);
    const overdueTasks = openTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now
    );
    const completedTasks = userTasks.filter((t) => t.isDone);

    const userDeals = allDeals.filter((d) => d.ownerId === u.id && !d.closedAt);
    const userPipelineValue = userDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const maxCap = u.maxCapacity || 20;
    const currentLoadCount = openTasks.length + userDeals.length;
    const capacityLoadPercent = Math.min(Math.round((currentLoadCount / maxCap) * 100), 150);

    let loadStatus: "low" | "optimal" | "high" | "overloaded" = "optimal";
    if (capacityLoadPercent < 40) loadStatus = "low";
    else if (capacityLoadPercent <= 80) loadStatus = "optimal";
    else if (capacityLoadPercent <= 100) loadStatus = "high";
    else loadStatus = "overloaded";

    totalOpenTasks += openTasks.length;
    totalPipelineValue += userPipelineValue;
    loadSum += capacityLoadPercent;

    members.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      maxCapacity: maxCap,
      portalToken: userPortalToken,
      portalUrl: userPortalToken ? `/portal/team/${userPortalToken}` : null,
      metrics: {
        activeDealsCount: userDeals.length,
        pipelineValue: userPipelineValue,
        openTasksCount: openTasks.length,
        overdueTasksCount: overdueTasks.length,
        completedTasksCount: completedTasks.length,
        capacityLoadPercent,
        loadStatus,
      },
    });
  }

  const activeReps = members.filter((m) => m.isActive && m.role === "rep").length;
  const avgCapacityLoad = members.length > 0 ? Math.round(loadSum / members.length) : 0;

  return {
    members,
    stats: {
      totalMembers: members.length,
      activeReps,
      totalOpenTasks,
      totalPipelineValue,
      unassignedCount: unassignedTotal,
      avgCapacityLoad,
    },
  };
}

/**
 * Returns all unassigned deals, tasks, and contacts waiting for work dispatch.
 */
export async function getUnassignedWorkPool(): Promise<UnassignedItem[]> {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;

  const [unassignedDeals, unassignedTasks, unassignedContacts] = await Promise.all([
    db.query.deals.findMany({
      where: and(eq(deals.orgId, orgId), isNull(deals.ownerId)),
      orderBy: [desc(deals.createdAt)],
      limit: 50,
    }),
    db.query.tasks.findMany({
      where: and(eq(tasks.orgId, orgId), isNull(tasks.assigneeId), eq(tasks.isDone, false)),
      orderBy: [desc(tasks.createdAt)],
      limit: 50,
    }),
    db.query.contacts.findMany({
      where: and(eq(contacts.orgId, orgId), isNull(contacts.ownerId)),
      orderBy: [desc(contacts.createdAt)],
      limit: 50,
    }),
  ]);

  const items: UnassignedItem[] = [
    ...unassignedDeals.map((d) => ({
      id: d.id,
      type: "deal" as const,
      title: d.title,
      subtitle: d.stageId ? `Stage: ${d.stageId}` : "Open Deal",
      value: d.value,
      createdAt: d.createdAt,
    })),
    ...unassignedTasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.description,
      priority: t.priority,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    })),
    ...unassignedContacts.map((c) => ({
      id: c.id,
      type: "contact" as const,
      title: `${c.firstName} ${c.lastName || ""}`.trim(),
      subtitle: c.email || c.phone || "Contact Lead",
      createdAt: c.createdAt,
    })),
  ];

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Dispatches items to active team members using round-robin distribution.
 */
export async function dispatchRoundRobin(data: {
  items: Array<{ id: string; type: "deal" | "task" | "contact" }>;
  targetUserIds: string[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actingRole = session.user.role;
  assert(canReassignRecords(actingRole), "Access Denied: Only Admins/Managers can dispatch work.");

  if (!data.items.length || !data.targetUserIds.length) {
    throw new Error("Please select items and at least one team member to dispatch.");
  }

  const { orgId, id: userId } = session.user;
  const userCount = data.targetUserIds.length;

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const targetUserId = data.targetUserIds[i % userCount];

    if (item.type === "deal") {
      await db
        .update(deals)
        .set({ ownerId: targetUserId })
        .where(and(eq(deals.id, item.id), eq(deals.orgId, orgId)));
    } else if (item.type === "task") {
      await db
        .update(tasks)
        .set({ assigneeId: targetUserId })
        .where(and(eq(tasks.id, item.id), eq(tasks.orgId, orgId)));
    } else if (item.type === "contact") {
      await db
        .update(contacts)
        .set({ ownerId: targetUserId })
        .where(and(eq(contacts.id, item.id), eq(contacts.orgId, orgId)));
    }

    await logAuditEntry(orgId, userId, "dispatch_round_robin", item.type, item.id, {
      assignedTo: targetUserId,
      type: item.type,
    });
  }

  safeRevalidate("/dashboard/team");
  safeRevalidate("/dashboard/tasks");
  safeRevalidate("/dashboard/deals");
  safeRevalidate("/dashboard/contacts");

  return { success: true, count: data.items.length };
}

/**
 * Bulk reassigns all work items from one user to another (e.g. rep handover or offboarding).
 */
export async function bulkReassignWork(data: {
  sourceUserId: string;
  targetUserId: string;
  reassignDeals?: boolean;
  reassignTasks?: boolean;
  reassignContacts?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actingRole = session.user.role;
  assert(canReassignRecords(actingRole), "Access Denied: Only Admins/Managers can reassign work.");

  const { orgId, id: currentUserId } = session.user;
  const { sourceUserId, targetUserId, reassignDeals = true, reassignTasks = true, reassignContacts = true } = data;

  if (sourceUserId === targetUserId) {
    throw new Error("Source and target user cannot be the same.");
  }

  let transferredCount = 0;

  if (reassignTasks) {
    const res = await db
      .update(tasks)
      .set({ assigneeId: targetUserId })
      .where(and(eq(tasks.orgId, orgId), eq(tasks.assigneeId, sourceUserId), eq(tasks.isDone, false)))
      .returning({ id: tasks.id });
    transferredCount += res.length;
  }

  if (reassignDeals) {
    const res = await db
      .update(deals)
      .set({ ownerId: targetUserId })
      .where(and(eq(deals.orgId, orgId), eq(deals.ownerId, sourceUserId), isNull(deals.closedAt)))
      .returning({ id: deals.id });
    transferredCount += res.length;
  }

  if (reassignContacts) {
    const res = await db
      .update(contacts)
      .set({ ownerId: targetUserId })
      .where(and(eq(contacts.orgId, orgId), eq(contacts.ownerId, sourceUserId)))
      .returning({ id: contacts.id });
    transferredCount += res.length;
  }

  await logAuditEntry(orgId, currentUserId, "bulk_reassign", "user", sourceUserId, {
    fromUser: sourceUserId,
    toUser: targetUserId,
    totalTransferred: transferredCount,
  });

  safeRevalidate("/dashboard/team");
  safeRevalidate("/dashboard/tasks");
  safeRevalidate("/dashboard/deals");

  return { success: true, count: transferredCount };
}

/**
 * Assign a single item directly to a user.
 */
export async function assignWorkItem(data: {
  entityType: "deal" | "task" | "contact";
  entityId: string;
  targetUserId: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  assert(canReassignRecords(role), "Access Denied: Cannot assign work.");

  if (data.entityType === "deal") {
    await db
      .update(deals)
      .set({ ownerId: data.targetUserId })
      .where(and(eq(deals.id, data.entityId), eq(deals.orgId, orgId)));
  } else if (data.entityType === "task") {
    await db
      .update(tasks)
      .set({ assigneeId: data.targetUserId })
      .where(and(eq(tasks.id, data.entityId), eq(tasks.orgId, orgId)));
  } else if (data.entityType === "contact") {
    await db
      .update(contacts)
      .set({ ownerId: data.targetUserId })
      .where(and(eq(contacts.id, data.entityId), eq(contacts.orgId, orgId)));
  }

  await logAuditEntry(orgId, userId, "assign_single_item", data.entityType, data.entityId, {
    assignedTo: data.targetUserId,
  });

  safeRevalidate("/dashboard/team");
  safeRevalidate("/dashboard/tasks");
  safeRevalidate("/dashboard/deals");
  return { success: true };
}

/**
 * Updates a member's max capacity.
 */
export async function updateUserCapacity(targetUserId: string, maxCapacity: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManageUsers(session.user.role), "Access Denied");

  await db
    .update(users)
    .set({ maxCapacity: Math.max(5, Math.min(100, maxCapacity)) })
    .where(and(eq(users.id, targetUserId), eq(users.orgId, session.user.orgId)));

  safeRevalidate("/dashboard/team");
  return { success: true };
}

/**
 * Generates or refreshes a rep's portal token.
 */
export async function generateRepPortalToken(targetUserId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManageUsers(session.user.role), "Access Denied");

  const newToken = `rep_${crypto.randomBytes(16).toString("hex")}`;

  await db
    .update(users)
    .set({ portalToken: newToken })
    .where(and(eq(users.id, targetUserId), eq(users.orgId, session.user.orgId)));

  safeRevalidate("/dashboard/team");
  return { success: true, portalToken: newToken, portalUrl: `/portal/team/${newToken}` };
}

/**
 * Standalone Rep Portal: Fetches personalized work, assigned tasks, and active deals for a given portalToken.
 */
export async function getTeamMemberPortalData(portalToken: string) {
  if (!portalToken) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.portalToken, portalToken),
    with: {
      org: true,
    },
  });

  if (!user || !user.isActive) return null;

  const [assignedTasks, assignedDeals, recentActivities] = await Promise.all([
    db.query.tasks.findMany({
      where: and(eq(tasks.orgId, user.orgId), eq(tasks.assigneeId, user.id)),
      with: {
        relatedContact: true,
        relatedCompany: true,
        relatedDeal: true,
      },
      orderBy: [desc(tasks.dueDate), desc(tasks.createdAt)],
    }),
    db.query.deals.findMany({
      where: and(eq(deals.orgId, user.orgId), eq(deals.ownerId, user.id), isNull(deals.closedAt)),
      with: {
        company: true,
      },
      orderBy: [desc(deals.value)],
    }),
    db.query.activities.findMany({
      where: and(eq(activities.orgId, user.orgId), eq(activities.actorUserId, user.id)),
      orderBy: [desc(activities.createdAt)],
      limit: 15,
    }),
  ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      maxCapacity: user.maxCapacity,
    },
    org: {
      id: user.org.id,
      name: user.org.name,
      brandingConfig: user.org.brandingConfig,
    },
    tasks: assignedTasks,
    deals: assignedDeals,
    activities: recentActivities,
  };
}

/**
 * Standalone Rep Portal: Mark task complete or update status with optional note.
 */
export async function repUpdateTaskStatus(
  portalToken: string,
  taskId: string,
  isDone: boolean,
  note?: string
) {
  const user = await db.query.users.findFirst({
    where: eq(users.portalToken, portalToken),
  });

  if (!user || !user.isActive) throw new Error("Invalid team portal access");

  const [updated] = await db
    .update(tasks)
    .set({
      isDone,
      completedAt: isDone ? new Date().toISOString() : null,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.assigneeId, user.id)))
    .returning();

  if (updated && (note || isDone)) {
    await db.insert(activities).values({
      orgId: user.orgId,
      type: "task",
      actorUserId: user.id,
      relatedDealId: updated.relatedDealId,
      relatedContactId: updated.relatedContactId,
      body: note
        ? `[Rep Desk] ${isDone ? "Completed" : "Updated"} task: "${updated.title}" - Note: ${note}`
        : `[Rep Desk] Marked task as ${isDone ? "Completed" : "Reopened"}: "${updated.title}"`,
      source: "manual",
    });
  }

  safeRevalidate(`/portal/team/${portalToken}`);
  safeRevalidate("/dashboard/team");
  safeRevalidate("/dashboard/tasks");
  return updated;
}
