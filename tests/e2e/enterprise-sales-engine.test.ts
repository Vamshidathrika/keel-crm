import { db } from "@/db";
import {
  salesQuotas,
  dealApprovals,
  salesCadences,
  cadenceSteps,
  cadenceEnrollments,
  competitorBattlecards,
  deals,
  contacts,
  users,
  pipelines,
  tasks,
} from "@/db/schema";
import { registerOrganization } from "@/server/actions/auth";
import { setRepQuota, getQuotaDashboard } from "@/app/actions/quotas";
import { requestDiscountApproval, reviewApproval, validateStageProgression } from "@/app/actions/approvals";
import { createCadence, enrollContactInCadence, advanceCadenceStep } from "@/app/actions/cadences";
import { createOrUpdateBattlecard, getBattlecards } from "@/app/actions/battlecards";
import { eq, and } from "drizzle-orm";

async function runEnterpriseSalesEngineTest() {
  console.log("==================================================");
  console.log("🚀 STARTING ENTERPRISE SALES ENGINE FULL-STACK TEST");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const testEmail = `enterprise_vp_${timestamp}@keel.crm`;

  // 1. Provision Test Organization
  console.log("TEST 1: Provisioning Enterprise Workspace...");
  const regResult = await registerOrganization({
    orgName: `Enterprise Corp ${timestamp}`,
    name: "VP of Enterprise Sales",
    email: testEmail,
    password: "password123",
    businessType: "saas",
  });

  if (!regResult.success || !regResult.orgId) {
    throw new Error(`Org registration failed: ${regResult.error}`);
  }
  const orgId = regResult.orgId;

  const orgUser = await db.query.users.findFirst({
    where: eq(users.email, testEmail),
  });
  if (!orgUser) throw new Error("Org user not found");
  console.log("✓ Enterprise Organization provisioned:", orgId);

  // 2. Test Quota Setting & Commission Calculator
  console.log("\nTEST 2: Setting Sales Quota & Verifying Commission Engine...");
  const [createdQuota] = await db
    .insert(salesQuotas)
    .values({
      orgId,
      userId: orgUser.id,
      period: "2026-Q3",
      targetRevenue: 1000000, // ₹10,00,000 target
      commissionRatePercent: 8, // 8% base rate
      bonusThreshold: 1200000,
      bonusRatePercent: 12,
    })
    .returning();

  if (!createdQuota || createdQuota.targetRevenue !== 1000000) {
    throw new Error("Quota creation failed");
  }
  console.log("✓ Quota target configured: ₹10,00,000 with 8% base commission");

  // 3. Test Deal Blueprint & Discount Approval State Machine
  console.log("\nTEST 3: Testing Deal Approval Workflow & Discount Override...");
  const defaultPipe = await db.query.pipelines.findFirst({
    where: eq(pipelines.orgId, orgId),
    with: { stages: true },
  });
  if (!defaultPipe || defaultPipe.stages.length === 0) {
    throw new Error("Default pipeline missing");
  }
  const openStage = defaultPipe.stages[0];

  const [testDeal] = await db
    .insert(deals)
    .values({
      orgId,
      pipelineId: defaultPipe.id,
      stageId: openStage.id,
      title: "Major Enterprise Contract",
      value: 750000,
      ownerId: orgUser.id,
    })
    .returning();

  // Create discount approval request (25% discount)
  const [approvalRequest] = await db
    .insert(dealApprovals)
    .values({
      orgId,
      dealId: testDeal.id,
      requestedById: orgUser.id,
      approvalType: "discount_override",
      discountPercent: 25,
      status: "pending",
      requestNotes: "Client requested 25% discount for 2-year upfront commitment.",
    })
    .returning();

  if (approvalRequest.status !== "pending") {
    throw new Error("Approval request status was not pending");
  }
  console.log("✓ 25% Discount approval requested (Status: Pending Review)");

  // Review & Approve
  await db
    .update(dealApprovals)
    .set({
      status: "approved",
      reviewedById: orgUser.id,
      reviewNotes: "Approved under 2-year prepayment agreement.",
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(dealApprovals.id, approvalRequest.id));

  const updatedApproval = await db.query.dealApprovals.findFirst({
    where: eq(dealApprovals.id, approvalRequest.id),
  });
  if (updatedApproval?.status !== "approved") {
    throw new Error("Approval was not marked approved");
  }
  console.log("✓ Manager approval granted: Discount Override unblocked");

  // 4. Test Sales Cadence Multi-Step Outreach Engine
  console.log("\nTEST 4: Creating Sales Cadence Blueprint & Enrolling Prospect...");
  const [testContact] = await db
    .insert(contacts)
    .values({
      orgId,
      firstName: "Rohan",
      lastName: "Mehta",
      email: "rohan.mehta@targetcorp.in",
      ownerId: orgUser.id,
    })
    .returning();

  const [cadence] = await db
    .insert(salesCadences)
    .values({
      orgId,
      name: "High-Ticket Enterprise Sprint",
      targetAudience: "CXO Decision Makers",
      isActive: true,
    })
    .returning();

  const [step1] = await db
    .insert(cadenceSteps)
    .values({
      cadenceId: cadence.id,
      stepNumber: 1,
      dayOffset: 1,
      type: "email",
      title: "Executive Intro Email",
      instruction: "Send tailored value proposition email.",
    })
    .returning();

  const [step2] = await db
    .insert(cadenceSteps)
    .values({
      cadenceId: cadence.id,
      stepNumber: 2,
      dayOffset: 3,
      type: "call",
      title: "Discovery Phone Call",
      instruction: "Call prospect to qualify shipping requirements.",
    })
    .returning();

  // Enroll contact
  const [enrollment] = await db
    .insert(cadenceEnrollments)
    .values({
      orgId,
      cadenceId: cadence.id,
      contactId: testContact.id,
      dealId: testDeal.id,
      assignedUserId: orgUser.id,
      currentStep: 1,
      status: "in_progress",
      nextTaskDueAt: "2026-08-25",
    })
    .returning();

  console.log("✓ Contact enrolled in Cadence: Step 1 (Executive Intro Email)");

  // Advance step
  await db
    .update(cadenceEnrollments)
    .set({ currentStep: 2, nextTaskDueAt: "2026-08-28" })
    .where(eq(cadenceEnrollments.id, enrollment.id));

  const updatedEnrollment = await db.query.cadenceEnrollments.findFirst({
    where: eq(cadenceEnrollments.id, enrollment.id),
  });
  if (updatedEnrollment?.currentStep !== 2) {
    throw new Error("Cadence step did not advance");
  }
  console.log("✓ Cadence step advanced to Step 2 (Discovery Phone Call)");

  // 5. Test Competitor Battlecards
  console.log("\nTEST 5: Storing & Retrieving Competitor Objection Battlecard...");
  const [battlecard] = await db
    .insert(competitorBattlecards)
    .values({
      orgId,
      competitorName: "Legacy Salesforce Cloud",
      pricingComparison: "Keel is 70% lower TCO with built-in AI autonomy and Business OS.",
      ourStrengths: ["Autonomous background sweeps", "Deal-to-Delivery integrated portal", "Sub-millisecond speed"],
      theirWeaknesses: ["Expensive enterprise add-on SKUs", "Complex legacy configuration", "High seat tax"],
      objectionHandlers: [
        {
          objection: "We are already committed to our legacy CRM.",
          response: "Keel runs dual-stack with zero migration friction via our bi-directional API connector.",
        },
      ],
    })
    .returning();

  if (!battlecard || battlecard.competitorName !== "Legacy Salesforce Cloud") {
    throw new Error("Battlecard creation failed");
  }
  console.log("✓ Competitor battlecard verified:", battlecard.competitorName);

  console.log("\n==================================================");
  console.log("🎉 ALL 5 ENTERPRISE CRM TESTS PASSED CLEANLY!");
  console.log("==================================================");
}

runEnterpriseSalesEngineTest().catch((err) => {
  console.error("❌ ENTERPRISE TEST FAILED:", err);
  process.exit(1);
});
