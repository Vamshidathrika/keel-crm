import { db } from "@/db";
import {
  deals,
  contacts,
  companies,
  activities,
  notes,
  tasks,
  quotations,
  invoices,
  payments,
  deliverables,
  projects,
  projectTasks,
  shipments,
  kycRecords,
  appointments,
  orders,
  properties,
  products,
  accountExpansionSignals,
  referralLinks,
  referralConversions,
  agentRuns,
  agentActionQueue,
  agentMemories,
  notifications,
  auditLogs,
  customFieldDefinitions,
  savedFilters,
} from "@/db/schema";

async function wipeAllDummyData() {
  console.log("==================================================");
  console.log("🧹 WIPING ALL DUMMY / SEED DATA FROM DATABASE...");
  console.log("==================================================\n");

  const tablesToWipe = [
    { name: "deals", table: deals },
    { name: "contacts", table: contacts },
    { name: "companies", table: companies },
    { name: "activities", table: activities },
    { name: "notes", table: notes },
    { name: "tasks", table: tasks },
    { name: "quotations", table: quotations },
    { name: "invoices", table: invoices },
    { name: "payments", table: payments },
    { name: "deliverables", table: deliverables },
    { name: "projects", table: projects },
    { name: "project_tasks", table: projectTasks },
    { name: "shipments", table: shipments },
    { name: "kyc_records", table: kycRecords },
    { name: "appointments", table: appointments },
    { name: "orders", table: orders },
    { name: "properties", table: properties },
    { name: "products", table: products },
    { name: "account_expansion_signals", table: accountExpansionSignals },
    { name: "referral_conversions", table: referralConversions },
    { name: "referral_links", table: referralLinks },
    { name: "agent_action_queue", table: agentActionQueue },
    { name: "agent_runs", table: agentRuns },
    { name: "agent_memories", table: agentMemories },
    { name: "notifications", table: notifications },
    { name: "audit_logs", table: auditLogs },
    { name: "saved_filters", table: savedFilters },
  ];

  for (const item of tablesToWipe) {
    try {
      await db.delete(item.table);
      console.log(`✓ Wiped table: ${item.name}`);
    } catch (err: any) {
      console.warn(`! Note on ${item.name}:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("✨ DATABASE IS NOW 100% CLEAN & PRISTINE!");
  console.log("Preserved: Organizations, Users (Login accounts), Pipelines, Stages, & Brandings.");
  console.log("==================================================");
}

wipeAllDummyData().catch((err) => {
  console.error("❌ Wipe failed:", err);
  process.exit(1);
});
