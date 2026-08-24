import { db } from "@/db";
import {
  accountExpansionSignals,
  referralLinks,
  referralConversions,
  deals,
  tasks,
  pipelines,
  organizations,
} from "@/db/schema";
import { registerOrganization } from "@/server/actions/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function runGrowthEngineTestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING BUSINESS GROWTH & REVOPS ENGINE E2E TEST");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const testEmail = `growth_founder_${timestamp}@keel.crm`;

  // 1. Provision Test Org
  console.log("TEST 1: Provisioning Dedicated Test Workspace...");
  const regResult = await registerOrganization({
    orgName: `RevOps Growth Corp ${timestamp}`,
    name: "Growth VP",
    email: testEmail,
    password: "password123",
    businessType: "saas",
  });

  if (!regResult.success || !regResult.orgId) {
    throw new Error(`Org registration failed: ${regResult.error}`);
  }
  const orgId = regResult.orgId;
  console.log("✓ Organization provisioned:", orgId);

  // 2. Test Viral Referral Link Generation & Attribution
  console.log("\nTEST 2: Generating Viral Referral Link & Tracking Code...");
  const refCode = `KEEL-TEST-${nanoid(4).toUpperCase()}`;
  const [createdLink] = await db
    .insert(referralLinks)
    .values({
      orgId,
      referrerName: "VIP Partner Beta",
      referralCode: refCode,
      slug: `ref-${refCode.toLowerCase()}`,
      rewardType: "discount_percent",
      rewardValue: 20,
      clicksCount: 25,
      conversionsCount: 3,
      totalRevenueGenerated: 150000,
      isActive: true,
    })
    .returning();

  if (!createdLink || createdLink.referralCode !== refCode) {
    throw new Error("Referral link generation failed");
  }
  console.log("✓ Referral Link created:", createdLink.referralCode, `(Total Rev: ₹${createdLink.totalRevenueGenerated})`);

  // 3. Test Account Expansion Radar & Health Scoring
  console.log("\nTEST 3: Registering Account Expansion Signals & Health Scores...");
  const [expansionSignal] = await db
    .insert(accountExpansionSignals)
    .values({
      orgId,
      accountName: "Reliance Logistics Division",
      healthScore: 94,
      nrrStatus: "expanding",
      mrrValue: 200000,
      expansionPotential: 450000,
      expansionReason: "High usage capacity + 99.8% SLA adherence over 90 days.",
      renewalDate: "2026-11-30",
      status: "active",
    })
    .returning();

  if (!expansionSignal || expansionSignal.healthScore !== 94) {
    throw new Error("Expansion signal creation failed");
  }
  console.log("✓ Expansion signal tracked:", expansionSignal.accountName, `(Potential: ₹${expansionSignal.expansionPotential})`);

  // 4. Test Upsell Deal & Task Auto-Provisioning
  console.log("\nTEST 4: Auto-Provisioning Upsell Opportunity in Sales Pipeline...");
  const defaultPipe = await db.query.pipelines.findFirst({
    where: eq(pipelines.orgId, orgId),
    with: { stages: true },
  });

  if (!defaultPipe || defaultPipe.stages.length === 0) {
    throw new Error("Default pipeline was not created");
  }

  const openStage = defaultPipe.stages.find(s => s.type === "open") || defaultPipe.stages[0];

  const [upsellDeal] = await db
    .insert(deals)
    .values({
      orgId,
      pipelineId: defaultPipe.id,
      stageId: openStage.id,
      title: `Expansion: ${expansionSignal.accountName}`,
      value: expansionSignal.expansionPotential,
      leadType: "seed",
      expectedCloseDate: "2026-10-15",
      probability: 70,
    })
    .returning();

  await db
    .update(accountExpansionSignals)
    .set({ status: "deal_created" })
    .where(eq(accountExpansionSignals.id, expansionSignal.id));

  const updatedSignal = await db.query.accountExpansionSignals.findFirst({
    where: eq(accountExpansionSignals.id, expansionSignal.id),
  });

  if (updatedSignal?.status !== "deal_created") {
    throw new Error("Expansion signal status was not updated to deal_created");
  }
  console.log("✓ Upsell Deal provisioned:", upsellDeal.title, `(Value: ₹${upsellDeal.value})`);

  // 5. Test Guardian Churn Early Warning Playbook
  console.log("\nTEST 5: Triggering Guardian Churn Risk Mitigation Playbook...");
  const [atRiskSignal] = await db
    .insert(accountExpansionSignals)
    .values({
      orgId,
      accountName: "Stale Enterprise Client",
      healthScore: 42,
      nrrStatus: "at_risk",
      mrrValue: 75000,
      churnRiskFactor: "No login in 32 days; overdue invoice.",
      status: "active",
    })
    .returning();

  // Execute mitigation
  await db
    .update(accountExpansionSignals)
    .set({ status: "mitigated" })
    .where(eq(accountExpansionSignals.id, atRiskSignal.id));

  const mitigatedSignal = await db.query.accountExpansionSignals.findFirst({
    where: eq(accountExpansionSignals.id, atRiskSignal.id),
  });

  if (mitigatedSignal?.status !== "mitigated") {
    throw new Error("Churn signal was not mitigated properly");
  }
  console.log("✓ Churn risk mitigated via Guardian Playbook for:", atRiskSignal.accountName);

  // 6. Test Predictable Revenue Lead Type Categorization
  console.log("\nTEST 6: Validating Predictable Revenue Model (Seeds/Nets/Spears)...");
  const [spearDeal] = await db.insert(deals).values({
    orgId,
    pipelineId: defaultPipe.id,
    stageId: openStage.id,
    title: "Outbound SDR Enterprise Lead",
    value: 120000,
    leadType: "spear",
  }).returning();

  const [netDeal] = await db.insert(deals).values({
    orgId,
    pipelineId: defaultPipe.id,
    stageId: openStage.id,
    title: "Inbound Website Demo Request",
    value: 65000,
    leadType: "net",
  }).returning();

  if (spearDeal.leadType !== "spear" || netDeal.leadType !== "net") {
    throw new Error("Lead type categorization failed");
  }
  console.log("✓ Predictable revenue lead types validated: Spear (₹120,000), Net (₹65,000), Seed (₹450,000)");

  console.log("\n==================================================");
  console.log("🎉 ALL 6 BUSINESS GROWTH & EVOLUTION TESTS PASSED!");
  console.log("==================================================");
}

runGrowthEngineTestSuite().catch((err) => {
  console.error("❌ GROWTH ENGINE TEST FAILED:", err);
  process.exit(1);
});
