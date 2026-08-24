"use server";

import { db } from "@/db";
import { dealApprovals, deals, stages, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAuditEntry } from "@/lib/audit";

export async function getPendingApprovals() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;

  return db.query.dealApprovals.findMany({
    where: and(eq(dealApprovals.orgId, orgId), eq(dealApprovals.status, "pending")),
    with: {
      deal: true,
      requestedBy: true,
    },
    orderBy: [desc(dealApprovals.createdAt)],
  });
}

export async function requestDiscountApproval(data: {
  dealId: string;
  discountPercent: number;
  requestNotes: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [approval] = await db
    .insert(dealApprovals)
    .values({
      orgId,
      dealId: data.dealId,
      requestedById: userId,
      approvalType: "discount_override",
      discountPercent: data.discountPercent,
      status: "pending",
      requestNotes: data.requestNotes,
    })
    .returning();

  await logAuditEntry(orgId, userId, "request_approval", "deal_approvals", approval.id, {
    dealId: data.dealId,
    discountPercent: data.discountPercent,
  });

  revalidatePath("/dashboard/deals");
  return { success: true, approval };
}

export async function reviewApproval(data: {
  approvalId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role !== "admin" && role !== "manager") {
    throw new Error("Only Admins or Managers can review deal approvals");
  }

  const approval = await db.query.dealApprovals.findFirst({
    where: and(eq(dealApprovals.id, data.approvalId), eq(dealApprovals.orgId, orgId)),
  });

  if (!approval) throw new Error("Approval record not found");

  await db
    .update(dealApprovals)
    .set({
      status: data.decision,
      reviewedById: userId,
      reviewNotes: data.reviewNotes || "",
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(dealApprovals.id, data.approvalId));

  await logAuditEntry(orgId, userId, `review_approval_${data.decision}`, "deal_approvals", data.approvalId, {
    decision: data.decision,
    dealId: approval.dealId,
  });

  revalidatePath("/dashboard/deals");
  return { success: true };
}

export async function validateStageProgression(dealId: string, targetStageId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const deal = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    with: { contact: true },
  });

  if (!deal) return { allowed: false, reason: "Deal not found" };

  const targetStage = await db.query.stages.findFirst({
    where: eq(stages.id, targetStageId),
  });

  // Blueprint Rule 1: Cannot move to Won without attached primary contact
  if (targetStage?.type === "won" && !deal.contactId) {
    return {
      allowed: false,
      reason: "Blueprint Rule: A primary contact must be attached before marking a deal Won.",
    };
  }

  // Blueprint Rule 2: Check for pending discount approvals
  const pendingApproval = await db.query.dealApprovals.findFirst({
    where: and(
      eq(dealApprovals.dealId, dealId),
      eq(dealApprovals.status, "pending")
    ),
  });

  if (pendingApproval) {
    return {
      allowed: false,
      reason: `Blueprint Rule: Pending ${pendingApproval.discountPercent}% discount approval requires Manager sign-off.`,
    };
  }

  return { allowed: true };
}
