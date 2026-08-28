import { client } from "@/db";

async function main() {
  console.log("⚡ Syncing Keel Sovereign Fiscal Ledger tables and columns...");

  const queries = [
    // 1. Invoices Fiscal Columns
    "ALTER TABLE invoices ADD COLUMN bill_type text DEFAULT 'tax_invoice';",
    "ALTER TABLE invoices ADD COLUMN place_of_supply text;",
    "ALTER TABLE invoices ADD COLUMN gstin text;",
    "ALTER TABLE invoices ADD COLUMN pan text;",
    "ALTER TABLE invoices ADD COLUMN billing_address text;",
    "ALTER TABLE invoices ADD COLUMN shipping_address text;",
    "ALTER TABLE invoices ADD COLUMN po_number text;",
    "ALTER TABLE invoices ADD COLUMN e_way_bill_number text;",
    "ALTER TABLE invoices ADD COLUMN account_category text;",
    "ALTER TABLE invoices ADD COLUMN is_rcm integer DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN discount_amount real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN shipping_charges real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN tds_section text;",
    "ALTER TABLE invoices ADD COLUMN tds_rate real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN tds_amount real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN round_off real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN notes text;",
    "ALTER TABLE invoices ADD COLUMN terms_and_conditions text;",

    // 2. Pricing Plans Table
    `CREATE TABLE IF NOT EXISTS pricing_plans (
      id text PRIMARY KEY,
      org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name text NOT NULL,
      code text NOT NULL,
      model text NOT NULL DEFAULT 'flat',
      billing_cycle text NOT NULL DEFAULT 'monthly',
      base_price real NOT NULL DEFAULT 0,
      metered_unit text,
      price_per_unit real,
      trial_days integer NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'INR',
      tax_inclusive integer DEFAULT 0,
      status text NOT NULL DEFAULT 'active',
      created_at text NOT NULL DEFAULT (current_timestamp),
      updated_at text NOT NULL DEFAULT (current_timestamp)
    );`,

    // 3. Dunning Rules Table
    `CREATE TABLE IF NOT EXISTS dunning_rules (
      id text PRIMARY KEY,
      org_id text NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      retry_attempts integer NOT NULL DEFAULT 4,
      retry_interval_days text NOT NULL DEFAULT '[1,3,5,7]',
      email_notification integer DEFAULT 1,
      whatsapp_notification integer DEFAULT 1,
      action_on_failure text NOT NULL DEFAULT 'pause',
      grace_period_days integer NOT NULL DEFAULT 7,
      created_at text NOT NULL DEFAULT (current_timestamp),
      updated_at text NOT NULL DEFAULT (current_timestamp)
    );`,

    // 4. Metered Usage Records Table
    `CREATE TABLE IF NOT EXISTS metered_usage_records (
      id text PRIMARY KEY,
      org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subscription_id text,
      meter_name text NOT NULL,
      units_consumed real NOT NULL DEFAULT 0,
      unit_price real NOT NULL DEFAULT 0,
      timestamp text NOT NULL DEFAULT (current_timestamp),
      created_at text NOT NULL DEFAULT (current_timestamp),
      updated_at text NOT NULL DEFAULT (current_timestamp)
    );`,
  ];

  for (const q of queries) {
    try {
      await client.execute(q);
      console.log(`✓ Executed migration.`);
    } catch (err: any) {
      console.log(`- Skipped/Already Exists: ${err.message}`);
    }
  }

  console.log("🎉 Keel LedgerOS™ Fiscal Engine schema synced successfully!");
}

main().catch(console.error);
