import { db } from "../src/db";
import { organizations, users, apiKeys } from "../src/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

// Import all v1 API route handlers directly for testing
import * as contactsRoute from "../src/app/api/v1/contacts/route";
import * as dealsRoute from "../src/app/api/v1/deals/route";
import * as companiesRoute from "../src/app/api/v1/companies/route";
import * as activitiesRoute from "../src/app/api/v1/activities/route";
import * as tasksRoute from "../src/app/api/v1/tasks/route";
import * as notesRoute from "../src/app/api/v1/notes/route";
import * as pipelinesRoute from "../src/app/api/v1/pipelines/route";
import * as clientsRoute from "../src/app/api/v1/clients/route";
import * as quotationsRoute from "../src/app/api/v1/quotations/route";
import * as invoicesRoute from "../src/app/api/v1/invoices/route";
import * as paymentsRoute from "../src/app/api/v1/payments/route";
import * as revenueRoute from "../src/app/api/v1/revenue/route";
import * as projectsRoute from "../src/app/api/v1/projects/route";
import * as followupsRoute from "../src/app/api/v1/followups/route";
import * as agentInvokeRoute from "../src/app/api/v1/agents/invoke/route";
import * as agentRunsRoute from "../src/app/api/v1/agents/runs/route";
import * as agentActionsRoute from "../src/app/api/v1/agents/actions/route";
import * as agentMemoriesRoute from "../src/app/api/v1/agents/memories/route";
import * as agentConfigsRoute from "../src/app/api/v1/agents/configs/route";
import * as shipmentsRoute from "../src/app/api/v1/shipments/route";
import * as kycRoute from "../src/app/api/v1/kyc/route";
import * as appointmentsRoute from "../src/app/api/v1/appointments/route";
import * as ordersRoute from "../src/app/api/v1/orders/route";
import * as propertiesRoute from "../src/app/api/v1/properties/route";
import * as webhooksRoute from "../src/app/api/v1/webhooks/route";
import * as paymentWebhookRoute from "../src/app/api/v1/webhooks/payment/route";
import * as automationsRoute from "../src/app/api/v1/automations/route";
import * as customFieldsRoute from "../src/app/api/v1/custom-fields/route";
import * as tagsRoute from "../src/app/api/v1/tags/route";
import * as notificationsRoute from "../src/app/api/v1/notifications/route";
import * as auditLogsRoute from "../src/app/api/v1/audit-logs/route";
import * as teamRoute from "../src/app/api/v1/team/route";
import * as searchRoute from "../src/app/api/v1/search/route";
import * as duplicatesRoute from "../src/app/api/v1/duplicates/route";
import * as apiKeysRoute from "../src/app/api/v1/apikeys/route";
import * as openapiRoute from "../src/app/api/v1/openapi.json/route";

// Import AI routes
import * as aiInsightsRoute from "../src/app/api/ai/business-insights/route";
import * as aiProposalRoute from "../src/app/api/ai/generate-proposal/route";
import * as aiFollowupRoute from "../src/app/api/ai/suggest-followup/route";
import * as aiSummarizeRoute from "../src/app/api/ai/summarize/route";
import * as automationSweepRoute from "../src/app/api/automation/sweep/route";

let passedCount = 0;
let failedCount = 0;

function createReq(url: string, method: string, apiKey?: string, body?: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function testEndpoint(name: string, fn: () => Promise<Response>, expectedStatus: number = 200) {
  try {
    const res = await fn();
    const data = await res.json().catch(() => ({}));
    if (res.status === expectedStatus || (expectedStatus === 200 && res.status === 201)) {
      console.log(`  ✅ [${res.status}] ${name}`);
      passedCount++;
    } else {
      console.error(`  ❌ [Expected ${expectedStatus}, Got ${res.status}] ${name}:`, data);
      failedCount++;
    }
  } catch (err: any) {
    console.error(`  ❌ [Exception] ${name}:`, err.message);
    failedCount++;
  }
}

async function main() {
  console.log("\n========================================================");
  console.log("🧪 KEEL CRM COMPREHENSIVE PLATFORM API TEST SUITE");
  console.log("========================================================\n");

  // 1. Ensure Organization & API Key exist
  let org = await db.query.organizations.findFirst();
  if (!org) {
    const [newOrg] = await db.insert(organizations).values({
      name: "Keel Platform Test Org",
      slug: "keel-platform-test-org",
      businessType: "Logistics & Enterprise SaaS",
    }).returning();
    org = newOrg;
  }

  const rawTestKey = "keel_sk_test_suite_verification_key_12345";
  const keyHash = crypto.createHash("sha256").update(rawTestKey).digest("hex");

  const existingKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)),
  });

  if (!existingKey) {
    await db.insert(apiKeys).values({
      orgId: org.id,
      name: "Automated Test Suite Key",
      keyPrefix: "keel_sk_test_su",
      keyHash,
      scopes: ["*"],
    });
  }

  console.log(`🔑 Test credentials active for Org: "${org.name}" (${org.id})\n`);

  // --- Module 1: Core CRM & Pipelines ---
  console.log("📂 1. CRM Core & Pipeline APIs:");
  await testEndpoint("GET /api/v1/contacts (List Contacts)", () =>
    contactsRoute.GET(createReq("http://localhost/api/v1/contacts?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/contacts (Create Contact)", () =>
    contactsRoute.POST(createReq("http://localhost/api/v1/contacts", "POST", rawTestKey, {
      firstName: "Ananya",
      lastName: "Deshmukh",
      email: `ananya.${Date.now()}@logistics.in`,
      phone: "+919876500112",
      title: "VP Logistics",
      tags: ["Enterprise", "High Value"],
    })), 201
  );

  await testEndpoint("GET /api/v1/deals (List Deals)", () =>
    dealsRoute.GET(createReq("http://localhost/api/v1/deals?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/deals (Create Deal)", () =>
    dealsRoute.POST(createReq("http://localhost/api/v1/deals", "POST", rawTestKey, {
      title: "Autonomous Fleet Upgrade Contract",
      value: 1200000,
      currency: "INR",
    })), 201
  );

  await testEndpoint("GET /api/v1/companies (List Accounts)", () =>
    companiesRoute.GET(createReq("http://localhost/api/v1/companies?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/companies (Create Company)", () =>
    companiesRoute.POST(createReq("http://localhost/api/v1/companies", "POST", rawTestKey, {
      name: "TransGlobal Freight Solutions",
      industry: "Logistics",
      domain: "transglobal.com",
    })), 201
  );

  await testEndpoint("GET /api/v1/activities (List Activities)", () =>
    activitiesRoute.GET(createReq("http://localhost/api/v1/activities?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/activities (Ingest Call / Activity)", () =>
    activitiesRoute.POST(createReq("http://localhost/api/v1/activities", "POST", rawTestKey, {
      type: "call",
      source: "telephony_bridge",
      externalId: `call_${Date.now()}`,
      contact: { name: "Ananya Deshmukh", phone: "+919876500112" },
      outcome: "interested",
      durationSec: 180,
      transcript: "Client is ready to deploy 25 units next month.",
    })), 200
  );

  await testEndpoint("GET /api/v1/tasks (List Tasks)", () =>
    tasksRoute.GET(createReq("http://localhost/api/v1/tasks?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/tasks (Create Task)", () =>
    tasksRoute.POST(createReq("http://localhost/api/v1/tasks", "POST", rawTestKey, {
      title: "Prepare commercial rate card",
      dueDate: "2026-09-01",
    })), 201
  );

  await testEndpoint("GET /api/v1/notes (List Notes)", () =>
    notesRoute.GET(createReq("http://localhost/api/v1/notes?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/notes (Create Note)", () =>
    notesRoute.POST(createReq("http://localhost/api/v1/notes", "POST", rawTestKey, {
      body: "Client confirmed budget approval from board.",
    })), 201
  );

  await testEndpoint("GET /api/v1/pipelines (List Pipelines & Stages)", () =>
    pipelinesRoute.GET(createReq("http://localhost/api/v1/pipelines", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/tags (List Tags)", () =>
    tagsRoute.GET(createReq("http://localhost/api/v1/tags", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/tags (Create Tag)", () =>
    tagsRoute.POST(createReq("http://localhost/api/v1/tags", "POST", rawTestKey, {
      name: `Tier-${Date.now().toString().slice(-4)}`,
      color: "#3B82F6",
    })), 201
  );

  await testEndpoint("GET /api/v1/custom-fields (List Custom Field Definitions)", () =>
    customFieldsRoute.GET(createReq("http://localhost/api/v1/custom-fields", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/search (Global Search)", () =>
    searchRoute.GET(createReq("http://localhost/api/v1/search?q=TransGlobal", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/duplicates (Duplicate Scan)", () =>
    duplicatesRoute.GET(createReq("http://localhost/api/v1/duplicates", "GET", rawTestKey))
  );

  // --- Module 2: Business OS & Revenue ---
  console.log("\n📂 2. Business OS & Revenue Operations APIs:");
  await testEndpoint("GET /api/v1/clients (List Clients)", () =>
    clientsRoute.GET(createReq("http://localhost/api/v1/clients?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/clients (Create Client Account)", () =>
    clientsRoute.POST(createReq("http://localhost/api/v1/clients", "POST", rawTestKey, {
      name: "Global Retail Logistics",
      email: "billing@globalretail.in",
      phone: "+919800112233",
    })), 201
  );

  await testEndpoint("GET /api/v1/quotations (List Quotations)", () =>
    quotationsRoute.GET(createReq("http://localhost/api/v1/quotations?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/quotations (Create Quotation)", () =>
    quotationsRoute.POST(createReq("http://localhost/api/v1/quotations", "POST", rawTestKey, {
      title: "Telematics Deployment Quote",
      total: 450000,
      items: [{ name: "Gateway Hub", qty: 10, price: 45000 }],
    })), 201
  );

  await testEndpoint("GET /api/v1/invoices (List Invoices)", () =>
    invoicesRoute.GET(createReq("http://localhost/api/v1/invoices?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/invoices (Issue Invoice)", () =>
    invoicesRoute.POST(createReq("http://localhost/api/v1/invoices", "POST", rawTestKey, {
      amount: 225000,
      dueDate: "2026-09-15",
    })), 201
  );

  await testEndpoint("GET /api/v1/payments (List Payments)", () =>
    paymentsRoute.GET(createReq("http://localhost/api/v1/payments?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/revenue (Revenue Analytics & Pipeline KPIs)", () =>
    revenueRoute.GET(createReq("http://localhost/api/v1/revenue", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/projects (List Projects)", () =>
    projectsRoute.GET(createReq("http://localhost/api/v1/projects?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/projects (Create Project)", () =>
    projectsRoute.POST(createReq("http://localhost/api/v1/projects", "POST", rawTestKey, {
      name: "Fleet Telematics Rollout Phase 1",
      budget: 500000,
    })), 201
  );
  await testEndpoint("GET /api/v1/followups (List Follow-ups)", () =>
    followupsRoute.GET(createReq("http://localhost/api/v1/followups?limit=5", "GET", rawTestKey))
  );

  // --- Module 3: Autonomous AI Agents & Memory ---
  console.log("\n📂 3. Autonomous AI Agents & Agentic Memory APIs:");
  await testEndpoint("POST /api/v1/agents/invoke (Invoke Specialist Agent)", () =>
    agentInvokeRoute.POST(createReq("http://localhost/api/v1/agents/invoke", "POST", rawTestKey, {
      agentType: "copilot",
      prompt: "Review top open deals and summarize pipeline posture.",
    })), 200
  );
  await testEndpoint("GET /api/v1/agents/runs (List Agent Audit Logs)", () =>
    agentRunsRoute.GET(createReq("http://localhost/api/v1/agents/runs?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/agents/actions (List Action Queue)", () =>
    agentActionsRoute.GET(createReq("http://localhost/api/v1/agents/actions?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/agents/memories (Query Agent Memory)", () =>
    agentMemoriesRoute.GET(createReq("http://localhost/api/v1/agents/memories?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/agents/memories (Upsert Agent Memory)", () =>
    agentMemoriesRoute.POST(createReq("http://localhost/api/v1/agents/memories", "POST", rawTestKey, {
      entityType: "org",
      entityId: org.id,
      key: "preferred_currency",
      value: "INR",
      sourceAgent: "test_suite",
    })), 201
  );
  await testEndpoint("GET /api/v1/agents/configs (Get Agent Configurations)", () =>
    agentConfigsRoute.GET(createReq("http://localhost/api/v1/agents/configs", "GET", rawTestKey))
  );

  // --- Module 4: Vertical Industry Modules ---
  console.log("\n📂 4. Vertical Industry Extension APIs:");
  await testEndpoint("GET /api/v1/shipments (Logistics Shipments)", () =>
    shipmentsRoute.GET(createReq("http://localhost/api/v1/shipments?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/shipments (Book Logistics Shipment)", () =>
    shipmentsRoute.POST(createReq("http://localhost/api/v1/shipments", "POST", rawTestKey, {
      dealName: "Container Consignment #441",
      carrier: "Hapag-Lloyd",
      origin: "Chennai Port",
      destination: "Rotterdam",
      eta: "2026-09-20",
    })), 201
  );

  await testEndpoint("GET /api/v1/kyc (KYC Compliance Records)", () =>
    kycRoute.GET(createReq("http://localhost/api/v1/kyc?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/kyc (Submit KYC Document)", () =>
    kycRoute.POST(createReq("http://localhost/api/v1/kyc", "POST", rawTestKey, {
      customer: "Karan Johar",
      docType: "Business Incorporation Certificate",
    })), 201
  );

  await testEndpoint("GET /api/v1/appointments (Service Appointments)", () =>
    appointmentsRoute.GET(createReq("http://localhost/api/v1/appointments?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/appointments (Book Appointment)", () =>
    appointmentsRoute.POST(createReq("http://localhost/api/v1/appointments", "POST", rawTestKey, {
      clientName: "Rohan Kapoor",
      serviceType: "Architecture Review",
      dateTime: "2026-09-02T10:00:00.000Z",
    })), 201
  );

  await testEndpoint("GET /api/v1/orders (E-Commerce Orders)", () =>
    ordersRoute.GET(createReq("http://localhost/api/v1/orders?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/orders (Register Order)", () =>
    ordersRoute.POST(createReq("http://localhost/api/v1/orders", "POST", rawTestKey, {
      clientName: "QuickMart Express",
      itemsSummary: "10x GPS Sensors",
      totalAmount: "75000",
    })), 201
  );

  await testEndpoint("GET /api/v1/properties (Real Estate Listings)", () =>
    propertiesRoute.GET(createReq("http://localhost/api/v1/properties?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/properties (List Real Estate Property)", () =>
    propertiesRoute.POST(createReq("http://localhost/api/v1/properties", "POST", rawTestKey, {
      title: "Commercial Warehouse (20,000 sqft)",
      location: "Bhiwandi, Mumbai",
      price: "₹3,50,000 / mo",
    })), 201
  );

  // --- Module 5: Integrations, Webhooks, Automations & Governance ---
  console.log("\n📂 5. Integrations, Webhooks, Automations & Governance APIs:");
  await testEndpoint("GET /api/v1/webhooks (List Webhooks)", () =>
    webhooksRoute.GET(createReq("http://localhost/api/v1/webhooks", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/webhooks (Register Outbound Webhook)", () =>
    webhooksRoute.POST(createReq("http://localhost/api/v1/webhooks", "POST", rawTestKey, {
      url: "https://example.com/api/webhook-listener",
      events: ["deal.won", "contact.created"],
    })), 201
  );

  await testEndpoint("GET /api/v1/automations (List Automation Rules)", () =>
    automationsRoute.GET(createReq("http://localhost/api/v1/automations", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/apikeys (List Scoped API Keys)", () =>
    apiKeysRoute.GET(createReq("http://localhost/api/v1/apikeys", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/apikeys (Generate New API Key)", () =>
    apiKeysRoute.POST(createReq("http://localhost/api/v1/apikeys", "POST", rawTestKey, {
      name: "Partner Integration Gateway Key",
      scopes: ["contacts:read", "deals:read"],
    })), 201
  );

  await testEndpoint("GET /api/v1/audit-logs (Security Audit Trail)", () =>
    auditLogsRoute.GET(createReq("http://localhost/api/v1/audit-logs?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/notifications (Notifications)", () =>
    notificationsRoute.GET(createReq("http://localhost/api/v1/notifications?limit=5", "GET", rawTestKey))
  );
  await testEndpoint("POST /api/v1/notifications (Create Notification)", () =>
    notificationsRoute.POST(createReq("http://localhost/api/v1/notifications", "POST", rawTestKey, {
      title: "Test Suite Notification",
      body: "Platform API verification tests completed successfully.",
    })), 201
  );

  await testEndpoint("GET /api/v1/team (List Team Members)", () =>
    teamRoute.GET(createReq("http://localhost/api/v1/team", "GET", rawTestKey))
  );
  await testEndpoint("GET /api/v1/openapi.json (OpenAPI 3.1 Specification)", () =>
    openapiRoute.GET()
  );

  // --- Module 6: Generative AI & Automation Sweeps ---
  console.log("\n📂 6. Generative AI & Sweeps APIs (Offline / Online Fallbacks):");
  await testEndpoint("POST /api/automation/sweep (Trigger Overdue Sweep)", () =>
    automationSweepRoute.POST(createReq("http://localhost/api/automation/sweep", "POST"))
  );

  // --- Security Auth Gate Verification ---
  console.log("\n🛡️  7. Security & Authentication Gate Verification:");
  await testEndpoint("GET /api/v1/contacts (Unauthorized - Missing Key)", () =>
    contactsRoute.GET(createReq("http://localhost/api/v1/contacts", "GET")), 401
  );
  await testEndpoint("GET /api/v1/deals (Unauthorized - Bad Key)", () =>
    dealsRoute.GET(createReq("http://localhost/api/v1/deals", "GET", "keel_sk_invalid_bogus_key")), 401
  );

  console.log("\n========================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
