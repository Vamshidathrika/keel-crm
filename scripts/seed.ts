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
  notes,
  tasks,
  tags,
  customFieldDefinitions,
  apiKeys,
  webhooks,
  webhookDeliveries,
  aiInsightsCache,
  automations,
  automationConditions,
  automationActions,
  automationRuns,
  notifications,
  auditLogs,
  savedFilters,
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
  agentConfigs,
  agentRuns,
  agentActionQueue,
  agentMemories,
  shipments,
  kycRecords,
  appointments,
  orders,
  properties,
  products,
} from "../src/db/schema";
import { getDefaultWidgetsForType } from "../src/lib/widgets/defaults";
import bcrypt from "bcryptjs";
import { createDefaultPipeline } from "../src/lib/seed-defaults";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Cleaning database and removing all seed/demo data...");

  // Temporarily disable foreign keys for truncation
  await db.run(sql`PRAGMA foreign_keys = OFF`);

  // Clear all mock and demo entities
  await db.delete(deliverables).catch(() => {});
  await db.delete(projectTasks).catch(() => {});
  await db.delete(projects).catch(() => {});
  await db.delete(followups).catch(() => {});
  await db.delete(messageRecords).catch(() => {});
  await db.delete(payments).catch(() => {});
  await db.delete(invoices).catch(() => {});
  await db.delete(quotations).catch(() => {});
  await db.delete(clients).catch(() => {});
  await db.delete(shipments).catch(() => {});
  await db.delete(kycRecords).catch(() => {});
  await db.delete(appointments).catch(() => {});
  await db.delete(orders).catch(() => {});
  await db.delete(properties).catch(() => {});
  await db.delete(products).catch(() => {});
  await db.delete(agentActionQueue).catch(() => {});
  await db.delete(agentRuns).catch(() => {});
  await db.delete(agentMemories).catch(() => {});
  await db.delete(agentConfigs).catch(() => {});
  await db.delete(automationRuns).catch(() => {});
  await db.delete(automationActions).catch(() => {});
  await db.delete(automationConditions).catch(() => {});
  await db.delete(automations).catch(() => {});
  await db.delete(aiInsightsCache).catch(() => {});
  await db.delete(webhookDeliveries).catch(() => {});
  await db.delete(webhooks).catch(() => {});
  await db.delete(apiKeys).catch(() => {});
  await db.delete(savedFilters).catch(() => {});
  await db.delete(notifications).catch(() => {});
  await db.delete(auditLogs).catch(() => {});
  await db.delete(notes).catch(() => {});
  await db.delete(tasks).catch(() => {});
  await db.delete(activities).catch(() => {});
  await db.delete(tags).catch(() => {});
  await db.delete(customFieldDefinitions).catch(() => {});
  await db.delete(deals).catch(() => {});
  await db.delete(stages).catch(() => {});
  await db.delete(pipelines).catch(() => {});
  await db.delete(contacts).catch(() => {});
  await db.delete(companies).catch(() => {});
  await db.delete(orgWidgets).catch(() => {});
  await db.delete(users).catch(() => {});
  await db.delete(organizations).catch(() => {});

  // Re-enable foreign keys
  await db.run(sql`PRAGMA foreign_keys = ON`);

  console.log("✓ Successfully cleared all demo data.");

  // 1. Create Clean Organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: "Keel CRM",
      slug: "keel-crm",
      businessType: "b2b_saas",
      onboardingCompleted: true,
      brandingConfig: {
        appName: "Keel",
        primaryColor: "#2f5dff",
        tagline: "The modern CRM that keeps every deal on course.",
      },
    })
    .returning();

  console.log(`✓ Created Clean Organization: ${org.name} (${org.id})`);

  // 2. Provision default widgets
  const widgetKeys = getDefaultWidgetsForType("b2b_saas");
  await db.insert(orgWidgets).values(
    widgetKeys.map((key, idx) => ({
      orgId: org.id,
      widgetKey: key,
      isEnabled: true,
      position: idx,
      config: {},
    }))
  );
  console.log("✓ Provisioned default widgets");

  // 3. Create Admin User (Clean root account)
  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      orgId: org.id,
      name: "Admin User",
      email: "admin@keel.crm",
      passwordHash,
      role: "admin",
    })
    .returning();

  console.log(`✓ Created Clean Admin Account: ${admin.email} (password: password123)`);

  // 4. Create Standard Default Sales Pipeline & Clean Stages
  const [defaultPipeline] = await db
    .insert(pipelines)
    .values({
      orgId: org.id,
      name: "Sales Pipeline",
      isDefault: true,
    })
    .returning();

  const standardStages = [
    { name: "Discovery", position: 0, probability: 10, type: "open", color: "#64748B" },
    { name: "Demo / Presentation", position: 1, probability: 30, type: "open", color: "#3B82F6" },
    { name: "Proposal / Quote", position: 2, probability: 60, type: "open", color: "#8B5CF6" },
    { name: "Negotiation", position: 3, probability: 80, type: "open", color: "#F59E0B" },
    { name: "Closed Won", position: 4, probability: 100, type: "won", color: "#10B981" },
    { name: "Closed Lost", position: 5, probability: 0, type: "lost", color: "#EF4444" },
  ];

  await db.insert(stages).values(
    standardStages.map((st) => ({
      orgId: org.id,
      pipelineId: defaultPipeline.id,
      name: st.name,
      position: st.position,
      probability: st.probability,
      type: st.type as "open" | "won" | "lost",
      color: st.color,
    }))
  );

  console.log("✓ Initialized clean Sales Pipeline and standard stages");
  console.log("Database reset complete! 0 mock/demo records remain.");
}

main().catch((err) => {
  console.error("Clean script failed:", err);
  process.exit(1);
});
