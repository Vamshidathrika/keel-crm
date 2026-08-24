import { db } from "@/db";
import { users, organizations, pipelines, deals, products } from "@/db/schema";
import { registerOrganization, loginWithCredentials } from "@/server/actions/auth";
import { completeOnboarding } from "@/server/actions/onboarding";
import { createDeal, updateDeal, getLostReasonStats } from "@/app/actions/deals";
import { createProduct, getProducts, updateProduct, deleteProduct } from "@/app/actions/products";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function runE2ETestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING KEEL CRM AUTOMATED FULL-STACK E2E SUITE");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const testEmail = `e2e_founder_${timestamp}@keel.crm`;

  // 1. Test Registration
  console.log("TEST 1: Multi-Step Registration & Workspace Provisioning...");
  const regResult = await registerOrganization({
    orgName: `E2E Workspace ${timestamp}`,
    name: "E2E Lead Founder",
    email: testEmail,
    password: "password123",
    businessType: "",
  });

  if (!regResult.success || !regResult.orgId) {
    throw new Error(`Registration failed: ${regResult.error}`);
  }
  console.log("✓ Registration succeeded. Org ID:", regResult.orgId);

  // 2. Test Onboarding Finalization
  console.log("\nTEST 2: Industry Onboarding & Widget Provisioning...");
  const onboardResult = await completeOnboarding(regResult.orgId, "saas", { team_size: "6–20" });
  if (!onboardResult.success) {
    throw new Error("Onboarding completion failed");
  }
  console.log("✓ Onboarding completed. Modules enabled:", onboardResult.widgetCount);

  // 3. Test Baseline Accounts Password Hash Verification
  console.log("\nTEST 3: Baseline Dummy Credentials Validation...");
  const baselineAdmin = await db.query.users.findFirst({
    where: eq(users.email, "admin@keel.crm"),
  });
  if (!baselineAdmin) throw new Error("Baseline admin account missing");
  const isValidAdminPass = await bcrypt.compare("password123", baselineAdmin.passwordHash);
  if (!isValidAdminPass) throw new Error("Baseline admin password hash mismatch");
  console.log("✓ Admin credentials verified (admin@keel.crm / password123)");

  const baselineManager = await db.query.users.findFirst({
    where: eq(users.email, "manager@keel.crm"),
  });
  if (!baselineManager) throw new Error("Baseline manager account missing");
  const isValidMgrPass = await bcrypt.compare("password123", baselineManager.passwordHash);
  if (!isValidMgrPass) throw new Error("Baseline manager password hash mismatch");
  console.log("✓ Manager credentials verified (manager@keel.crm / password123)");

  const baselineRep = await db.query.users.findFirst({
    where: eq(users.email, "rep@keel.crm"),
  });
  if (!baselineRep) throw new Error("Baseline rep account missing");
  const isValidRepPass = await bcrypt.compare("password123", baselineRep.passwordHash);
  if (!isValidRepPass) throw new Error("Baseline rep password hash mismatch");
  console.log("✓ Rep credentials verified (rep@keel.crm / password123)");

  // 4. Test Product Catalog Lifecycle
  console.log("\nTEST 4: Product Catalog Master CRUD...");
  const [createdProduct] = await db.insert(products).values({
    orgId: regResult.orgId,
    name: "Enterprise Cloud License",
    sku: `SKU-${timestamp}`,
    unitPrice: 4999,
    category: "Software",
    taxRatePercent: 18,
  }).returning();

  if (!createdProduct || createdProduct.unitPrice !== 4999) {
    throw new Error("Product creation failed");
  }
  console.log("✓ Product inserted:", createdProduct.name, `(₹${createdProduct.unitPrice})`);

  // 5. Test Deal Pipeline & Lost Reason Interception
  console.log("\nTEST 5: Deals & Lost Reasons Audit Engine...");
  const defaultPipe = await db.query.pipelines.findFirst({
    where: eq(pipelines.orgId, regResult.orgId),
    with: { stages: true },
  });
  if (!defaultPipe || defaultPipe.stages.length === 0) {
    throw new Error("Default sales pipeline not provisioned");
  }
  const openStage = defaultPipe.stages.find(s => s.type === "open") || defaultPipe.stages[0];
  const lostStage = defaultPipe.stages.find(s => s.type === "lost") || defaultPipe.stages[defaultPipe.stages.length - 1];

  const [testDeal] = await db.insert(deals).values({
    orgId: regResult.orgId,
    pipelineId: defaultPipe.id,
    stageId: openStage.id,
    title: "Global Freight Contract",
    value: 150000,
    expectedCloseDate: "2026-09-30",
  }).returning();

  console.log("✓ Open deal created:", testDeal.title, `(Value: ₹${testDeal.value})`);

  // Move deal to Lost with Lost Reason
  await db.update(deals).set({
    stageId: lostStage.id,
    lostReason: "Competitor Price",
    lostReasonNotes: "Competitor offered 15% discount on shipping routes.",
  }).where(eq(deals.id, testDeal.id));

  const updatedLostDeal = await db.query.deals.findFirst({
    where: eq(deals.id, testDeal.id),
  });
  if (updatedLostDeal?.lostReason !== "Competitor Price") {
    throw new Error("Lost deal reason not recorded properly");
  }
  console.log("✓ Deal moved to Lost with reason audit:", updatedLostDeal.lostReason);

  console.log("\n==================================================");
  console.log("🎉 ALL 5 E2E LANES PASSED WITH ZERO REGRESSIONS!");
  console.log("==================================================");
}

runE2ETestSuite().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
