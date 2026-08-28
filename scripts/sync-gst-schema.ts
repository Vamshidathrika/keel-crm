import { client } from "@/db";

async function main() {
  console.log("Creating GST & Invoice Customization tables...");
  const queries = [
    `CREATE TABLE IF NOT EXISTS gst_settings (
      id text PRIMARY KEY NOT NULL,
      org_id text UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      gstin text,
      legal_name text,
      trade_name text,
      pan text,
      state_code text DEFAULT '36',
      state_name text DEFAULT 'Telangana',
      is_composition_scheme integer DEFAULT 0,
      is_rcm_applicable integer DEFAULT 0,
      lut_number text,
      bank_name text,
      account_number text,
      ifsc_code text,
      account_holder_name text,
      upi_id text,
      created_at text DEFAULT (current_timestamp) NOT NULL,
      updated_at text DEFAULT (current_timestamp) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS invoice_customizations (
      id text PRIMARY KEY NOT NULL,
      org_id text UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      template_theme text DEFAULT 'modern_slate',
      primary_color text DEFAULT '#3b82f6',
      company_logo_url text,
      show_tax_breakup integer DEFAULT 1,
      show_hsn_sac integer DEFAULT 1,
      show_bank_details integer DEFAULT 1,
      show_upi_qr integer DEFAULT 1,
      terms_and_conditions text DEFAULT '1. Payment is due within standard terms.\n2. Goods once sold are not returnable.\n3. Subject to local jurisdiction.',
      declaration_text text DEFAULT 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
      footer_note text DEFAULT 'Thank you for your business!',
      created_at text DEFAULT (current_timestamp) NOT NULL,
      updated_at text DEFAULT (current_timestamp) NOT NULL
    );`,
    "ALTER TABLE invoices ADD COLUMN buyer_gstin text;",
    "ALTER TABLE invoices ADD COLUMN place_of_supply text;",
    "ALTER TABLE invoices ADD COLUMN tax_type text DEFAULT 'intra_state';",
    "ALTER TABLE invoices ADD COLUMN cgst_amount real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN sgst_amount real DEFAULT 0;",
    "ALTER TABLE invoices ADD COLUMN igst_amount real DEFAULT 0;",
  ];

  for (const q of queries) {
    try {
      await client.execute(q);
      console.log(`✓ Executed`);
    } catch (err: any) {
      console.log(`- Skipped/Exists: ${err.message}`);
    }
  }
  console.log("🎉 GST tables and columns created successfully!");
}

main().catch(console.error);
