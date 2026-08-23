import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Running white-label schema migration via Drizzle...");

  // Use raw SQL to add columns if not exists — SQLite doesn't support IF NOT EXISTS on ALTER
  try {
    await db.run(sql`ALTER TABLE organizations ADD COLUMN business_type TEXT`);
    console.log("✓ Added business_type");
  } catch { console.log("  ↳ business_type already exists"); }

  try {
    await db.run(sql`ALTER TABLE organizations ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0`);
    console.log("✓ Added onboarding_completed");
  } catch { console.log("  ↳ onboarding_completed already exists"); }

  try {
    await db.run(sql`ALTER TABLE organizations ADD COLUMN branding_config TEXT`);
    console.log("✓ Added branding_config");
  } catch { console.log("  ↳ branding_config already exists"); }

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS org_widgets (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      widget_key TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )
  `);
  console.log("✓ org_widgets table ready");

  await db.run(sql`CREATE INDEX IF NOT EXISTS org_widgets_org_idx ON org_widgets(org_id)`);
  console.log("✓ Index ready");

  console.log("✅ Migration complete!");
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
