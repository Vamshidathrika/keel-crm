"use server";

import { db } from "@/db";
import { deals, stages, activities, contacts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerWorkflows } from "@/app/actions/automations";
import { runDealDoctorAgent } from "@/lib/agents/deal-doctor";

export async function getDeals(pipelineId?: string) {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(deals.orgId, orgId)];
  if (pipelineId) {
    conditions.push(eq(deals.pipelineId, pipelineId));
  }
  if (ownerIdFilter) {
    conditions.push(eq(deals.ownerId, ownerIdFilter));
  }

  return db.query.deals.findMany({
    where: and(...conditions),
    with: {
      contact: true,
      company: true,
      stage: true,
    },
    orderBy: [desc(deals.createdAt)],
  });
}

export async function createDeal(data: {
  title: string;
  value: number;
  pipelineId: string;
  stageId: string;
  contactId?: string;
  companyId?: string;
  expectedCloseDate?: string;
  probability?: number;
  ownerId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;
  const ownerId = session.user.role === "rep" ? userId : (data.ownerId || userId);

  // Fetch stage to get default probability if not specified
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, data.stageId),
  });

  const probability = data.probability !== undefined ? data.probability : (stage?.probability || 10);

  const [deal] = await db
    .insert(deals)
    .values({
      orgId,
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      title: data.title.trim(),
      value: data.value,
      currency: "INR",
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      ownerId,
      expectedCloseDate: data.expectedCloseDate || null,
      probability,
      healthFlags: [],
      source: "manual",
    })
    .returning();

  // Create creation timeline activity log
  if (data.contactId) {
    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedContactId: data.contactId,
      relatedDealId: deal.id,
      actorUserId: userId,
      body: `Deal created: "${deal.title}" (₹${deal.value.toLocaleString("en-IN")})`,
      source: "manual",
    });
  }

  // Log audit
  await logAuditEntry(orgId, userId, "create", "deal", deal.id, {
    dealId: deal.id,
    title: deal.title,
    value: deal.value,
  });

  // Autonomous Deal Doctor Trigger
  runDealDoctorAgent(orgId, deal.id, "event").catch((err) =>
    console.error("Deal Doctor trigger error:", err)
  );

  revalidatePath("/dashboard/deals");
  return deal;
}

export async function updateDeal(
  id: string,
  data: {
    title?: string;
    value?: number;
    stageId?: string;
    contactId?: string;
    companyId?: string;
    expectedCloseDate?: string;
    probability?: number;
    ownerId?: string;
    healthFlags?: string[];
    lostReason?: string;
    lostReasonNotes?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(deals.orgId, orgId), eq(deals.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(deals.ownerId, ownerIdFilter));
  }

  const deal = await db.query.deals.findFirst({
    where: and(...conditions),
    with: {
      stage: true,
    },
  });

  if (!deal) throw new Error("Deal not found or access denied.");

  const updateFields: any = {};

  if (data.title !== undefined) updateFields.title = data.title.trim();
  if (data.value !== undefined) updateFields.value = data.value;
  if (data.contactId !== undefined) updateFields.contactId = data.contactId || null;
  if (data.companyId !== undefined) updateFields.companyId = data.companyId || null;
  if (data.expectedCloseDate !== undefined) updateFields.expectedCloseDate = data.expectedCloseDate || null;
  if (data.ownerId !== undefined && role !== "rep") updateFields.ownerId = data.ownerId;
  if (data.healthFlags !== undefined) updateFields.healthFlags = data.healthFlags;
  if (data.lostReason !== undefined) updateFields.lostReason = data.lostReason;
  if (data.lostReasonNotes !== undefined) updateFields.lostReasonNotes = data.lostReasonNotes;

  // Handle stage change mechanics
  if (data.stageId !== undefined && data.stageId !== deal.stageId) {
    updateFields.stageId = data.stageId;

    const nextStage = await db.query.stages.findFirst({
      where: eq(stages.id, data.stageId),
    });

    if (nextStage) {
      updateFields.probability = data.probability !== undefined ? data.probability : nextStage.probability;

      if (nextStage.type === "won" || nextStage.type === "lost") {
        updateFields.closedAt = new Date().toISOString();
      } else {
        updateFields.closedAt = null;
      }

      // Log timeline activity of type stage_change
      const bodyText = `Stage moved from "${(deal as any).stage?.name || "Unknown"}" to "${nextStage.name}"`;
      
      await db.insert(activities).values({
        orgId,
        type: "stage_change",
        relatedContactId: deal.contactId || null,
        relatedCompanyId: deal.companyId || null,
        relatedDealId: deal.id,
        actorUserId: userId,
        body: bodyText,
        metadata: {
          oldStageId: deal.stageId,
          oldStageName: (deal as any).stage?.name,
          newStageId: nextStage.id,
          newStageName: nextStage.name,
        },
        source: "manual",
      });

      // Also log activity on the contact directly if linked
      if (deal.contactId) {
        await db.insert(activities).values({
          orgId,
          type: "stage_change",
          relatedContactId: deal.contactId,
          actorUserId: userId,
          body: `Deal "${deal.title}" stage changed: ${bodyText}`,
          metadata: {
            dealId: deal.id,
            oldStageName: (deal as any).stage?.name,
            newStageName: nextStage.name,
          },
          source: "manual",
        });
      }
    }
  } else if (data.probability !== undefined) {
    updateFields.probability = data.probability;
  }

  const [updated] = await db
    .update(deals)
    .set(updateFields)
    .where(eq(deals.id, id))
    .returning();

  await logAuditEntry(orgId, userId, "update", "deal", id, data as Record<string, unknown>);

  if (data.stageId !== undefined && data.stageId !== deal.stageId) {
    await triggerWorkflows(orgId, "deal_stage_changed", id, {
      stageId: data.stageId,
      dealId: id,
      contactId: deal.contactId,
      companyId: deal.companyId,
      ownerId: deal.ownerId,
    });

    // Autonomous Deal Doctor Trigger
    runDealDoctorAgent(orgId, id, "event").catch((err) =>
      console.error("Deal Doctor trigger error:", err)
    );
  }

  revalidatePath("/dashboard/deals");
  return updated;
}

export async function deleteDeal(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(deals.orgId, orgId), eq(deals.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(deals.ownerId, ownerIdFilter));
  }

  const deal = await db.query.deals.findFirst({
    where: and(...conditions),
  });

  if (!deal) throw new Error("Deal not found or access denied.");

  await db.delete(deals).where(eq(deals.id, id));

  await logAuditEntry(orgId, userId, "delete", "deal", id, {
    dealId: id,
    title: deal.title,
  });

  revalidatePath("/dashboard/deals");
  return { success: true };
}

export async function getLostReasonStats(pipelineId?: string) {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;
  const allDeals = await db.query.deals.findMany({
    where: pipelineId
      ? and(eq(deals.orgId, orgId), eq(deals.pipelineId, pipelineId))
      : eq(deals.orgId, orgId),
    with: { stage: true },
  });

  const lostDeals = allDeals.filter((d) => d.stage?.type === "lost");
  const statsMap: Record<string, { count: number; totalValue: number }> = {};

  for (const d of lostDeals) {
    const reason = d.lostReason || "Unspecified Reason";
    if (!statsMap[reason]) {
      statsMap[reason] = { count: 0, totalValue: 0 };
    }
    statsMap[reason].count += 1;
    statsMap[reason].totalValue += d.value;
  }

  return Object.entries(statsMap).map(([reason, data]) => ({
    reason,
    count: data.count,
    totalValue: data.totalValue,
  }));
}
