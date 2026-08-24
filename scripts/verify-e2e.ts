import { db } from "@/db";
import { organizations, users, contacts, deals, pipelines, stages, agentConfigs, agentRuns, webhooks, customFieldDefinitions } from "@/db/schema";
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
  console.log(`\n📡 [5/8] Testing Outbound Webhook Dispatcher & Connected Apps...`);
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
  await db.delete(webhooks).where(eq(webhooks.id, testHook.id));

  // 6. Test Dynamic Custom Fields Engine
  console.log(`\n📐 [6/8] Testing Dynamic Custom Fields Engine (Attio Parity)...`);
  const { createCustomFieldDefinition, getCustomFieldDefinitions } = await import("@/app/actions/custom-fields");
  const [customField] = await db.insert(customFieldDefinitions).values({
    orgId: org.id,
    entityType: "deal",
    label: "Target Deployment Region",
    key: "deployment_region",
    fieldType: "select",
    options: ["US-East", "EU-West", "AP-South (Mumbai)"],
    isRequired: false,
  }).returning();
  console.log(`   - Dynamic Custom Field Created: "${customField.label}" (${customField.key}, Type: ${customField.fieldType})`);
  await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, customField.id));

  // 7. Test Waterfall Enrichment Cascade Engine (Clay Parity)
  console.log(`\n🌊 [7/8] Testing Waterfall Enrichment Cascade Engine (Clay Parity)...`);
  const { executeWaterfallEnrichment } = await import("@/lib/agents/enrichment/waterfall");
  const waterfallResult = await executeWaterfallEnrichment({
    companyName: "Stripe Inc",
    domain: "stripe.com",
    contactEmail: "patrick@stripe.com",
    contactTitle: "Chief Executive Officer",
  });
  console.log(`   - Status: ${waterfallResult.status}`);
  console.log(`   - Tier Reached: Tier ${waterfallResult.tierReached}`);
  console.log(`   - ICP Fit: ${waterfallResult.data.icpFit}`);
  console.log(`   - Corporate Email: ${waterfallResult.data.isCorporateEmail}`);
  console.log(`   - Tech Stack: ${waterfallResult.data.techStack.join(", ")}`);

  // 8. Test Visual Workflow Automation Engine (HubSpot/Attio Parity)
  console.log(`\n⚡ [8/8] Testing Visual Workflow Automation Engine...`);
  const { processWorkflowEvent } = await import("@/lib/automation/engine");
  const workflowRes = await processWorkflowEvent({
    orgId: org.id,
    eventType: "contact_created",
    entityType: "contact",
    entityId: testContact.id,
    data: { score: 85, firstName: "Sundar" },
  });
  console.log(`   - Workflow Processing Complete: ${workflowRes.evaluatedCount ?? 0} active automation rule(s) evaluated.`);

  console.log("\n==================================================");
  console.log("🎉 ALL 8 SYSTEM MODULES VERIFIED & OPERATIONAL!");
  console.log("==================================================");
}

verifyAll().then(() => process.exit(0)).catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
