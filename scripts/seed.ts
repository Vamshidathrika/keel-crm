import { db } from "../src/db";
import {
  organizations,
  users,
  companies,
  contacts,
  pipelines,
  stages,
  deals,
  activities,
  tasks,
  orgWidgets,
  clients,
  quotations,
  invoices,
  payments,
  messageRecords,
  followups,
  projects,
  projectTasks,
  deliverables,
} from "../src/db/schema";
import { getDefaultWidgetsForType } from "../src/lib/widgets/defaults";
import bcrypt from "bcryptjs";
import { createDefaultPipeline } from "../src/lib/seed-defaults";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding database...");

  // Temporarily disable foreign keys for truncation
  await db.run(sql`PRAGMA foreign_keys = OFF`);

  // Clear existing data
  await db.delete(orgWidgets).catch(() => {});
  await db.delete(deliverables).catch(() => {});
  await db.delete(projectTasks).catch(() => {});
  await db.delete(projects).catch(() => {});
  await db.delete(followups).catch(() => {});
  await db.delete(messageRecords).catch(() => {});
  await db.delete(payments).catch(() => {});
  await db.delete(invoices).catch(() => {});
  await db.delete(quotations).catch(() => {});
  await db.delete(clients).catch(() => {});
  await db.delete(tasks);
  await db.delete(activities);
  await db.delete(deals);
  await db.delete(stages);
  await db.delete(pipelines);
  await db.delete(contacts);
  await db.delete(companies);
  await db.delete(users);
  await db.delete(organizations);

  // Re-enable foreign keys
  await db.run(sql`PRAGMA foreign_keys = ON`);

  // 1. Create Organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: "Keel Shipping Corp",
      slug: "keel-shipping-corp",
      businessType: "logistics",
      onboardingCompleted: true,
      brandingConfig: {
        appName: "Keel",
        primaryColor: "#2f5dff",
        tagline: "The CRM that keeps every deal on course.",
      },
    })
    .returning();

  console.log(`Created Org: ${org.name} (${org.id})`);

  // Provision default widgets for logistics
  const widgetKeys = getDefaultWidgetsForType("logistics");
  await db.insert(orgWidgets).values(
    widgetKeys.map((key, idx) => ({
      orgId: org.id,
      widgetKey: key,
      isEnabled: true,
      position: idx,
      config: {},
    }))
  );
  console.log("✓ Provisioned default widgets for logistics");

  // 2. Create Users (Admin, Manager, Rep)
  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      orgId: org.id,
      name: "Alice Admin",
      email: "admin@keel.crm",
      passwordHash,
      role: "admin",
      isActive: true,
    })
    .returning();

  const [manager] = await db
    .insert(users)
    .values({
      orgId: org.id,
      name: "Bob Manager",
      email: "manager@keel.crm",
      passwordHash,
      role: "manager",
      isActive: true,
    })
    .returning();

  const [rep] = await db
    .insert(users)
    .values({
      orgId: org.id,
      name: "Charlie Rep",
      email: "rep@keel.crm",
      passwordHash,
      role: "rep",
      isActive: true,
      managerId: manager.id,
    })
    .returning();

  console.log("Seeded Users: Alice (admin), Bob (manager), Charlie (rep)");

  // 3. Create Default Pipeline & Stages
  const pipeline = await createDefaultPipeline(org.id);
  const dbStages = await db.query.stages.findMany({
    where: (s, { eq }) => eq(s.pipelineId, pipeline.id),
  });

  const stageNew = dbStages.find((s) => s.name === "New")!;
  const stageContacted = dbStages.find((s) => s.name === "Contacted")!;
  const stageQualified = dbStages.find((s) => s.name === "Qualified")!;
  const stageWon = dbStages.find((s) => s.name === "Won")!;

  // 4. Create Companies
  const [cmp1] = await db
    .insert(companies)
    .values({
      orgId: org.id,
      name: "Acme Logistics Ltd",
      domain: "acmelogistics.com",
      industry: "Logistics",
      website: "https://acmelogistics.com",
      ownerId: rep.id,
      tags: ["vip", "enterprise"],
    })
    .returning();

  const [cmp2] = await db
    .insert(companies)
    .values({
      orgId: org.id,
      name: "Global Freight Inc",
      domain: "globalfreight.com",
      industry: "Transportation",
      website: "https://globalfreight.com",
      ownerId: manager.id,
      tags: ["mid-market"],
    })
    .returning();

  console.log("Seeded Companies");

  // 5. Create Contacts
  const [cnt1] = await db
    .insert(contacts)
    .values({
      orgId: org.id,
      companyId: cmp1.id,
      firstName: "John",
      lastName: "Doe",
      email: "john@acmelogistics.com",
      phone: "+919900077000",
      title: "VP of Operations",
      city: "Mumbai",
      source: "api_bridge",
      ownerId: rep.id,
      tags: ["interested", "decision-maker"],
      score: 75,
      scoreBreakdown: {
        band: "hot",
        factors: [
          { label: "Positive call outcome", direction: "up", explanation: "Prospect was interested during outbound call." },
          { label: "High activity velocity", direction: "up", explanation: "Contact had multiple timeline interactions in last 3 days." },
        ],
        recommendation: "Schedule a human follow-up call immediately.",
      },
    })
    .returning();

  const [cnt2] = await db
    .insert(contacts)
    .values({
      orgId: org.id,
      companyId: cmp2.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@globalfreight.com",
      phone: "+919876543210",
      title: "Logistics Director",
      city: "Hyderabad",
      source: "manual",
      ownerId: manager.id,
      tags: ["cold-lead"],
      score: 30,
      scoreBreakdown: {
        band: "cold",
        factors: [
          { label: "No recent calls", direction: "down", explanation: "No outbound call has been placed to this contact yet." },
        ],
        recommendation: "Enroll in automated WhatsApp warming flow.",
      },
    })
    .returning();

  console.log("Seeded Contacts");

  // 6. Create Deals
  const [deal1] = await db
    .insert(deals)
    .values({
      orgId: org.id,
      pipelineId: pipeline.id,
      stageId: stageQualified.id,
      title: "Acme Fleet Expansion Deal",
      value: 1200000,
      currency: "INR",
      contactId: cnt1.id,
      companyId: cmp1.id,
      ownerId: rep.id,
      expectedCloseDate: "2026-09-30",
      probability: 50,
      healthFlags: [],
      source: "manual",
    })
    .returning();

  const [deal2] = await db
    .insert(deals)
    .values({
      orgId: org.id,
      pipelineId: pipeline.id,
      stageId: stageNew.id,
      title: "Global Freight Software Integration",
      value: 450000,
      currency: "INR",
      contactId: cnt2.id,
      companyId: cmp2.id,
      ownerId: manager.id,
      expectedCloseDate: "2026-10-15",
      probability: 10,
      healthFlags: ["stale_deal"],
      source: "api_bridge",
    })
    .returning();

  console.log("Seeded Deals");

  // 7. Create Activities
  await db.insert(activities).values([
    {
      orgId: org.id,
      type: "system",
      relatedContactId: cnt1.id,
      body: "Lead auto-created via voice agent API bridge ingestion.",
      source: "system",
      occurredAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      orgId: org.id,
      type: "call",
      relatedContactId: cnt1.id,
      relatedDealId: deal1.id,
      actorUserId: rep.id,
      body: "Outbound call completed. John expressed interest in our premium cargo routing module and requested a proposal.",
      metadata: {
        outcome: "interested",
        duration: 94,
        transcript: "Hello, yes I am interested in routing. Can you send a fleet proposal?",
      },
      source: "bridge",
      occurredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      orgId: org.id,
      type: "stage_change",
      relatedContactId: cnt1.id,
      relatedDealId: deal1.id,
      actorUserId: rep.id,
      body: "Stage updated: New to Qualified",
      metadata: {
        oldStage: "New",
        newStage: "Qualified",
      },
      source: "manual",
      occurredAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ]);

  // 8. Create Tasks
  await db.insert(tasks).values([
    {
      orgId: org.id,
      title: "Send Cargo Routing Proposal",
      description: "Draft and email proposal for the 1.2M Fleet Expansion Deal.",
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      isDone: false,
      relatedContactId: cnt1.id,
      relatedDealId: deal1.id,
      assigneeId: rep.id,
      createdById: manager.id,
    },
    {
      orgId: org.id,
      title: "Initial reach out",
      description: "Call Jane to explain software integrations.",
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), // Overdue
      isDone: false,
      relatedContactId: cnt2.id,
      relatedDealId: deal2.id,
      assigneeId: manager.id,
      createdById: manager.id,
    },
  ]);

  console.log("Seeded Activities and Tasks");

  // 9. Create Clients
  const [client1] = await db.insert(clients).values({
    orgId: org.id,
    companyId: cmp1.id,
    contactId: cnt1.id,
    name: "John Doe (Acme)",
    email: "john@acmelogistics.com",
    phone: "+919900077000",
    portalToken: "portal_token_demo_1",
  }).returning();

  const [client2] = await db.insert(clients).values({
    orgId: org.id,
    companyId: cmp2.id,
    contactId: cnt2.id,
    name: "Jane Smith (Global)",
    email: "jane@globalfreight.com",
    phone: "+919876543210",
    portalToken: "portal_token_demo_2",
  }).returning();

  console.log("Seeded Clients");

  // 10. Create Quotations
  const [qte1] = await db.insert(quotations).values({
    orgId: org.id,
    dealId: deal1.id,
    clientId: client1.id,
    title: "Premium Fleet Management Platform",
    items: [
      { name: "SaaS Enterprise Core Licenses", qty: 25, price: 1500 },
      { name: "API Custom Connectors Setup", qty: 1, price: 50000 },
      { name: "Dedicated Telephony Setup", qty: 1, price: 15000 },
    ],
    total: 102500,
    status: "accepted",
  }).returning();

  const [qte2] = await db.insert(quotations).values({
    orgId: org.id,
    dealId: deal2.id,
    clientId: client2.id,
    title: "Logistics Automation Platform Integration",
    items: [
      { name: "Growth Plan Licensing (Annual)", qty: 12, price: 1200 },
      { name: "Outbound Webhook Routing Module", qty: 1, price: 18000 },
    ],
    total: 32400,
    status: "draft",
  }).returning();

  console.log("Seeded Quotations");

  // 11. Create Invoices
  const [inv1] = await db.insert(invoices).values({
    orgId: org.id,
    dealId: deal1.id,
    clientId: client1.id,
    invoiceNumber: "INV-2026-001",
    amount: 102500,
    status: "paid",
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
  }).returning();

  const [inv2] = await db.insert(invoices).values({
    orgId: org.id,
    dealId: deal2.id,
    clientId: client2.id,
    invoiceNumber: "INV-2026-002",
    amount: 32400,
    status: "overdue",
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
  }).returning();

  console.log("Seeded Invoices");

  // 12. Create Payments
  await db.insert(payments).values({
    orgId: org.id,
    invoiceId: inv1.id,
    amount: 102500,
    status: "completed",
    transactionId: "txn_99881122a",
    paidAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  });

  console.log("Seeded Payments");

  // 13. Create Message Records
  await db.insert(messageRecords).values([
    {
      orgId: org.id,
      clientId: client1.id,
      contactId: cnt1.id,
      type: "whatsapp",
      direction: "outbound",
      text: "Hello John, your KYC audit has passed compliance. You can access the Client Portal here: http://localhost:3001/portal/portal_token_demo_1",
      status: "read",
    },
    {
      orgId: org.id,
      clientId: client1.id,
      contactId: cnt1.id,
      type: "whatsapp",
      direction: "inbound",
      text: "Thanks, logged in and approved the Phase 1 Deliverable!",
      status: "read",
    },
  ]);

  console.log("Seeded MessageRecords");

  // 14. Create FollowUps
  await db.insert(followups).values([
    {
      orgId: org.id,
      dealId: deal1.id,
      contactId: cnt1.id,
      title: "Call John for Phase 2 Rollout Details",
      description: "Discuss billing expansion and extra seat licenses.",
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: "pending",
    },
    {
      orgId: org.id,
      dealId: deal2.id,
      contactId: cnt2.id,
      title: "Auto Nudge: Unpaid Invoice INV-2026-002",
      description: "Trigger outbound email/SMS follow-up regarding past due invoice.",
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
      status: "overdue",
    },
  ]);

  console.log("Seeded FollowUps");

  // 15. Create Projects, Tasks, and Deliverables
  const [project] = await db.insert(projects).values({
    orgId: org.id,
    clientId: client1.id,
    dealId: deal1.id,
    name: "Enterprise Shipping Integration Program",
    status: "active",
    budget: 1200000,
  }).returning();

  await db.insert(projectTasks).values([
    {
      projectId: project.id,
      title: "Establish secure webhook listeners",
      assigneeId: rep.id,
      status: "done",
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    },
    {
      projectId: project.id,
      title: "Deploy API production endpoints",
      assigneeId: manager.id,
      status: "in_progress",
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    },
  ]);

  await db.insert(deliverables).values([
    {
      projectId: project.id,
      title: "Phase 1: Architecture & API Schema",
      description: "Detailed JSON models for webhook payloads and DLT compliance validation.",
      status: "approved",
      clientFeedback: "Approved by John Doe via client portal.",
    },
    {
      projectId: project.id,
      title: "Phase 2: Alpha Telephony Integration",
      description: "Outbound Twilio/Plivo IVR scripts for COD order confirmations.",
      status: "pending_review",
    },
  ]);

  console.log("Seeded Projects, Tasks, and Deliverables");
  console.log("Database seeding completed successfully!");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
