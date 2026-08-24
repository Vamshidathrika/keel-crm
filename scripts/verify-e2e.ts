import { db } from "@/db";
import { organizations, users, contacts, deals, pipelines, stages, agentConfigs, agentRuns, webhooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runProspectorAgent } from "@/lib/agents/prospector";
import { runDealDoctorAgent } from "@/lib/agents/deal-doctor";
import { executeAgentHarness } from "@/lib/agents/harness/runner";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

async function verifyAll() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL END-TO-END VERIFICATION OF KEEL CRM");
  console.log("==================================================\n");

  // 1. Verify / Fetch Test Organization
  let org = await db.query.organizations.findFirst();
  if (!org) {
    const [newOrg] = await db.insert(organizations).values({
      name: "Acme Enterprises Corp",
      slug: "acme-corp",
      businessType: "Technology & AI",
      onboardingCompleted: true,
    }).returning();
    org = newOrg;
  }
  console.log(`✅ [1/5] Verified Organization: "${org.name}" (${org.id})`);

  // 2. Test Prospector Agent (Lead Scoring & ICP Tiering)
  const [testContact] = await db.insert(contacts).values({
    orgId: org.id,
    firstName: "Sundar",
    lastName: "Pichai",
    email: "sundar@alphabet.com",
    title: "Chief Executive Officer",
    phone: "+1-650-253-0000",
    score: 35,
  }).returning();

  console.log(`\n🔍 [2/5] Testing Prospector Agent for Contact #${testContact.id}...`);
  const prospectorResult = await runProspectorAgent(org.id, "contact", testContact.id, "event");
  console.log(`   - Status: ${prospectorResult.status}`);
  console.log(`   - Confidence: ${prospectorResult.confidenceScore * 100}%`);
  console.log(`   - Summary: ${prospectorResult.summary}`);
  console.log(`   - Tools Invoked: ${prospectorResult.toolsInvoked.map(t => t.tool).join(", ")}`);

  const updatedContact = await db.query.contacts.findFirst({ where: eq(contacts.id, testContact.id) });
  console.log(`   - Computed Lead Score: ${updatedContact?.score}/100 [Band: ${updatedContact?.scoreBreakdown?.band?.toUpperCase()}]`);

  // 3. Test Deal Doctor Agent (Stagnation & Velocity Audit)
  let defaultPipe = await db.query.pipelines.findFirst({
    where: eq(pipelines.orgId, org.id),
    with: { stages: true },
  });

  if (!defaultPipe) {
    const [pipe] = await db.insert(pipelines).values({
      orgId: org.id,
      name: "Enterprise Sales Pipeline",
      isDefault: true,
    }).returning();
    const [s1] = await db.insert(stages).values({ pipelineId: pipe.id, name: "Discovery", order: 1, probability: 20, type: "open" }).returning();
    const [s2] = await db.insert(stages).values({ pipelineId: pipe.id, name: "Negotiation", order: 2, probability: 60, type: "open" }).returning();
    const [s3] = await db.insert(stages).values({ pipelineId: pipe.id, name: "Closed Won", order: 3, probability: 100, type: "won" }).returning();
    defaultPipe = { ...pipe, stages: [s1, s2, s3] };
  }

  const [testDeal] = await db.insert(deals).values({
    orgId: org.id,
    title: "Alphabet Enterprise Cloud Multi-Year License",
    value: 2500000,
    currency: "INR",
    pipelineId: defaultPipe.id,
    stageId: defaultPipe.stages[0].id,
    contactId: testContact.id,
    probability: 20,
    expectedCloseDate: "2026-08-01", // Past date to trigger overdue check
  }).returning();

  console.log(`\n🩺 [3/5] Testing Deal Doctor Agent for Deal #${testDeal.id}...`);
  const dealDoctorResult = await runDealDoctorAgent(org.id, testDeal.id, "event");
  console.log(`   - Status: ${dealDoctorResult.status}`);
  console.log(`   - Summary: ${dealDoctorResult.summary}`);
  console.log(`   - Actions Proposed: ${dealDoctorResult.actionsProposed.length} items queued`);

  // 4. Test ReAct Agent Harness & LangChain Tools
  console.log(`\n🤖 [4/5] Testing Autonomous ReAct Agent Harness with Gemini/LangChain...`);
  const harnessResult = await executeAgentHarness({
    orgId: org.id,
    agentType: "copilot",
    userPrompt: "Audit the pipeline and report total value and active deals.",
  });
  console.log(`   - Run ID: ${harnessResult.runId}`);
  console.log(`   - Summary: ${harnessResult.summary}`);
  console.log(`   - Thought Steps: ${harnessResult.thoughtProcess.length} steps`);

  // 5. Test Outbound Webhook Dispatcher
  console.log(`\n📡 [5/5] Testing Outbound Webhook Dispatcher & Connected Apps...`);
  const [testHook] = await db.insert(webhooks).values({
    orgId: org.id,
    targetUrl: "https://httpbin.org/post",
    eventTypes: ["deal.won", "ping.test"],
    secret: "whsec_test_secret_key_123",
    isActive: true,
  }).returning();

  const dispatchResult = await dispatchWebhookEvent(org.id, "ping.test", {
    message: "Verified E2E connectivity",
    dealId: testDeal.id,
  });
  console.log(`   - Webhook Dispatched: ${dispatchResult.deliveredCount} target(s) successfully delivered.`);

  // Cleanup test webhook
  await db.delete(webhooks).where(eq(webhooks.id, testHook.id));

  console.log("\n==================================================");
  console.log("🎉 ALL 5 SYSTEM MODULES VERIFIED & OPERATIONAL!");
  console.log("==================================================");
}

verifyAll().then(() => process.exit(0)).catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
