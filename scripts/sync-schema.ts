import { client } from "@/db";

async function main() {
  console.log("Syncing automations schema additions...");
  const queries = [
    "ALTER TABLE automations ADD COLUMN description text;",
    "ALTER TABLE automations ADD COLUMN graph_data text;",
    "ALTER TABLE automations ADD COLUMN last_run_at text;",
    "ALTER TABLE automations ADD COLUMN run_count integer NOT NULL DEFAULT 0;",
    "ALTER TABLE automation_actions ADD COLUMN \"order\" integer NOT NULL DEFAULT 0;",
    "ALTER TABLE automation_runs ADD COLUMN trigger_payload text;",
    "ALTER TABLE automation_runs ADD COLUMN logs text DEFAULT '[]';",
    "ALTER TABLE automation_runs ADD COLUMN execution_time_ms integer NOT NULL DEFAULT 0;",
  ];

  for (const q of queries) {
    try {
      await client.execute(q);
      console.log(`✓ Executed: ${q}`);
    } catch (err: any) {
      console.log(`- Skipped/Already exists: ${err.message}`);
    }
  }
  console.log("🎉 Schema sync complete!");
}

main().catch(console.error);
