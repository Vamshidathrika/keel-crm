"use server";

import { db } from "@/db";
import { salesQuotas, users, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAuditEntry } from "@/lib/audit";

export async function getQuotaDashboard(period = "2026-Q3") {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;

  // 1. Fetch team members
  const teamMembers = await db.query.users.findMany({
    where: and(eq(users.orgId, orgId), eq(users.isActive, true)),
  });

  // 2. Fetch configured quotas for this period
  const quotas = await db.query.salesQuotas.findMany({
    where: and(eq(salesQuotas.orgId, orgId), eq(salesQuotas.period, period)),
  });

  // 3. Fetch all deals won in this period to compute actual closed revenue
  const wonDeals = await db.query.deals.findMany({
    where: and(eq(deals.orgId, orgId)),
    with: { stage: true },
  });

  const repPerformance = teamMembers.map((member) => {
    const quota = quotas.find((q) => q.userId === member.id);
    const targetRevenue = quota?.targetRevenue || 1000000;
    const commissionRate = quota?.commissionRatePercent || 8;
    const bonusThreshold = quota?.bonusThreshold || 1200000;
    const bonusRate = quota?.bonusRatePercent || 12;

    // Filter won deals for this rep
    const repWonDeals = wonDeals.filter(
      (d) => d.ownerId === member.id && d.stage?.type === "won"
    );
    const repOpenDeals = wonDeals.filter(
      (d) => d.ownerId === member.id && d.stage?.type === "open"
    );

    const actualRevenue = repWonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const pipelineValue = repOpenDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const attainmentPercent = Math.min(Math.round((actualRevenue / targetRevenue) * 100), 999);
    const pipelineCoverage = targetRevenue > 0 ? Number((pipelineValue / targetRevenue).toFixed(1)) : 0;

    // Calculate commission
    let calculatedCommission = actualRevenue * (commissionRate / 100);
    if (actualRevenue > bonusThreshold) {
      const bonusPortion = actualRevenue - bonusThreshold;
      calculatedCommission += bonusPortion * ((bonusRate - commissionRate) / 100);
    }

    return {
      userId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      targetRevenue,
      actualRevenue,
      pipelineValue,
      pipelineCoverage,
      attainmentPercent,
      commissionEarned: Math.round(calculatedCommission),
      commissionRate,
      bonusThreshold,
      dealsWonCount: repWonDeals.length,
      quotaId: quota?.id || null,
    };
  });

  const totalOrgTarget = repPerformance.reduce((sum, r) => sum + r.targetRevenue, 0);
  const totalOrgActual = repPerformance.reduce((sum, r) => sum + r.actualRevenue, 0);
  const totalOrgPipeline = repPerformance.reduce((sum, r) => sum + r.pipelineValue, 0);
  const orgAttainment = totalOrgTarget > 0 ? Math.round((totalOrgActual / totalOrgTarget) * 100) : 0;

  return {
    period,
    totalOrgTarget,
    totalOrgActual,
    totalOrgPipeline,
    orgAttainment,
    reps: repPerformance.sort((a, b) => b.attainmentPercent - a.attainmentPercent),
  };
}

export async function setRepQuota(data: {
  userId: string;
  period: string;
  targetRevenue: number;
  commissionRatePercent: number;
  bonusThreshold?: number;
  bonusRatePercent?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: currentUserId, role } = session.user;
  if (role !== "admin" && role !== "manager") {
    throw new Error("Only Admins and Managers can set quotas");
  }

  const existing = await db.query.salesQuotas.findFirst({
    where: and(
      eq(salesQuotas.orgId, orgId),
      eq(salesQuotas.userId, data.userId),
      eq(salesQuotas.period, data.period)
    ),
  });

  if (existing) {
    await db
      .update(salesQuotas)
      .set({
        targetRevenue: data.targetRevenue,
        commissionRatePercent: data.commissionRatePercent,
        bonusThreshold: data.bonusThreshold || data.targetRevenue * 1.2,
        bonusRatePercent: data.bonusRatePercent || 12,
      })
      .where(eq(salesQuotas.id, existing.id));
  } else {
    await db.insert(salesQuotas).values({
      orgId,
      userId: data.userId,
      period: data.period,
      targetRevenue: data.targetRevenue,
      commissionRatePercent: data.commissionRatePercent,
      bonusThreshold: data.bonusThreshold || data.targetRevenue * 1.2,
      bonusRatePercent: data.bonusRatePercent || 12,
    });
  }

  await logAuditEntry(orgId, currentUserId, "set_quota", "sales_quotas", data.userId, {
    target: data.targetRevenue,
    period: data.period,
  });

  revalidatePath("/dashboard/quotas");
  return { success: true };
}
