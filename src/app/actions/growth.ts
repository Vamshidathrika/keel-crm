"use server";

import { db } from "@/db";
import {
  accountExpansionSignals,
  referralLinks,
  referralConversions,
  priceBooks,
  priceBookEntries,
  deals,
  contacts,
  companies,
  pipelines,
  stages,
  tasks,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAuditEntry } from "@/lib/audit";
import { nanoid } from "nanoid";

export async function getGrowthMetrics() {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;

  // 1. Fetch Expansion Signals
  let signals = await db.query.accountExpansionSignals.findMany({
    where: eq(accountExpansionSignals.orgId, orgId),
    orderBy: [desc(accountExpansionSignals.createdAt)],
  });

  // 2. Fetch Referral Links
  const links = await db.query.referralLinks.findMany({
    where: eq(referralLinks.orgId, orgId),
    orderBy: [desc(referralLinks.totalRevenueGenerated)],
  });

  // 3. Fetch Deals for Predictable Revenue Breakdown
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
    with: { stage: true },
  });

  const spears = allDeals.filter((d) => d.leadType === "spear" || !d.leadType);
  const nets = allDeals.filter((d) => d.leadType === "net");
  const seeds = allDeals.filter((d) => d.leadType === "seed");

  const spearsValue = spears.reduce((sum, d) => sum + (d.value || 0), 0);
  const netsValue = nets.reduce((sum, d) => sum + (d.value || 0), 0);
  const seedsValue = seeds.reduce((sum, d) => sum + (d.value || 0), 0);

  // 4. Calculate Net Revenue Retention (NRR) Index
  const totalMRR = signals.reduce((sum, s) => sum + (s.mrrValue || 0), 0);
  const totalExpansion = signals.filter(s => s.nrrStatus === "expanding").reduce((sum, s) => sum + (s.expansionPotential || 0), 0);
  const totalAtRisk = signals.filter(s => s.nrrStatus === "at_risk").reduce((sum, s) => sum + (s.mrrValue || 0), 0);

  const nrrScore = totalMRR > 0 ? Math.round(((totalMRR + (totalExpansion * 0.3) - (totalAtRisk * 0.5)) / totalMRR) * 100) : 118;

  // 5. Calculate Viral Coefficient (K-factor)
  const totalClicks = links.reduce((sum, l) => sum + l.clicksCount, 0);
  const totalConversions = links.reduce((sum, l) => sum + l.conversionsCount, 0);
  const kFactor = totalClicks > 0 ? (totalConversions / totalClicks) * 10 : 0.85;

  return {
    signals,
    links,
    nrrScore,
    kFactor: Number(kFactor.toFixed(2)),
    predictableBreakdown: {
      spears: { count: spears.length, value: spearsValue, winRate: 24, label: "Outbound SDR (Spears)" },
      nets: { count: nets.length, value: netsValue, winRate: 35, label: "Inbound Marketing (Nets)" },
      seeds: { count: seeds.length, value: seedsValue, winRate: 68, label: "Customer Referrals (Seeds)" },
    },
    churnRiskAccounts: signals.filter((s) => s.nrrStatus === "at_risk" && s.status === "active"),
    expansionAccounts: signals.filter((s) => s.nrrStatus === "expanding" && s.status === "active"),
  };
}

export async function createReferralLink(data: {
  referrerName: string;
  rewardType: "credit" | "discount_percent" | "commission";
  rewardValue: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const cleanCode = `KEEL-${nanoid(6).toUpperCase()}`;
  const slug = `ref-${cleanCode.toLowerCase()}`;

  const [link] = await db
    .insert(referralLinks)
    .values({
      orgId,
      referrerName: data.referrerName.trim(),
      referralCode: cleanCode,
      slug,
      rewardType: data.rewardType,
      rewardValue: data.rewardValue,
      clicksCount: 0,
      conversionsCount: 0,
      totalRevenueGenerated: 0,
      isActive: true,
    })
    .returning();

  await logAuditEntry(orgId, session.user.id, "create_referral_link", "referral_link", link.id, {
    code: cleanCode,
    rewardType: data.rewardType,
  });

  revalidatePath("/dashboard/growth");
  return { success: true, link };
}

export async function triggerUpsellDeal(signalId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const signal = await db.query.accountExpansionSignals.findFirst({
    where: and(eq(accountExpansionSignals.id, signalId), eq(accountExpansionSignals.orgId, orgId)),
  });

  if (!signal) throw new Error("Expansion signal not found");

  // Find default sales pipeline and first open stage
  const defaultPipe = await db.query.pipelines.findFirst({
    where: eq(pipelines.orgId, orgId),
    with: { stages: true },
  });

  if (!defaultPipe || defaultPipe.stages.length === 0) {
    throw new Error("No active sales pipeline found");
  }

  const openStage = defaultPipe.stages.find((s) => s.type === "open") || defaultPipe.stages[0];

  // 1. Create the Upsell Deal
  const [deal] = await db
    .insert(deals)
    .values({
      orgId,
      pipelineId: defaultPipe.id,
      stageId: openStage.id,
      title: `Expansion: ${signal.accountName} (Add-on Package)`,
      value: signal.expansionPotential || 150000,
      companyId: signal.companyId,
      contactId: signal.contactId,
      ownerId: userId,
      leadType: "seed",
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      probability: 70,
    })
    .returning();

  // 2. Mark signal as deal created
  await db
    .update(accountExpansionSignals)
    .set({ status: "deal_created" })
    .where(eq(accountExpansionSignals.id, signalId));

  // 3. Create follow-up task
  await db.insert(tasks).values({
    orgId,
    title: `Prepare Upsell Proposal for ${signal.accountName}`,
    description: `Auto-generated from Account Expansion Radar.\nReason: ${signal.expansionReason}`,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    assigneeId: userId,
    createdById: userId,
  });

  await logAuditEntry(orgId, userId, "create_upsell_deal", "deal", deal.id, {
    accountName: signal.accountName,
    expansionValue: signal.expansionPotential,
  });

  revalidatePath("/dashboard/growth");
  revalidatePath("/dashboard/deals");
  return { success: true, dealId: deal.id };
}

export async function executeChurnPlaybook(signalId: string, playbookType: "winback_discount" | "csm_urgent_outreach") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const signal = await db.query.accountExpansionSignals.findFirst({
    where: and(eq(accountExpansionSignals.id, signalId), eq(accountExpansionSignals.orgId, orgId)),
  });

  if (!signal) throw new Error("Signal not found");

  const taskTitle =
    playbookType === "winback_discount"
      ? `🚨 Urgent Win-Back: Send 15% Loyalty Retainer Offer to ${signal.accountName}`
      : `📞 High-Priority CSM Touchpoint: Call ${signal.accountName} Executive Sponsor`;

  await db.insert(tasks).values({
    orgId,
    title: taskTitle,
    description: `Guardian Churn Early Warning Triggered.\nRisk Factor: ${signal.churnRiskFactor || "Inactive > 25 days"}`,
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    assigneeId: userId,
    createdById: userId,
  });

  await db
    .update(accountExpansionSignals)
    .set({ status: "mitigated" })
    .where(eq(accountExpansionSignals.id, signalId));

  await logAuditEntry(orgId, userId, "execute_churn_playbook", "account_expansion_signals", signalId, {
    playbookType,
  });

  revalidatePath("/dashboard/growth");
  revalidatePath("/dashboard/tasks");
  return { success: true };
}
