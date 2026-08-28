import { client } from "@/db";

async function main() {
  console.log("Syncing payments & invoice payment fields...");
  const queries = [
    "ALTER TABLE invoices ADD COLUMN paid_amount real NOT NULL DEFAULT 0;",
    "ALTER TABLE payments ADD COLUMN payment_mode text DEFAULT 'bank_transfer';",
    "ALTER TABLE payments ADD COLUMN reference_number text;",
    "ALTER TABLE payments ADD COLUMN notes text;",
    "ALTER TABLE payments ADD COLUMN receipt_url text;",
  ];

  for (const q of queries) {
    try {
      await client.execute(q);
      console.log(`✓ Executed: ${q}`);
    } catch (err: any) {
      console.log(`- Skipped/Exists: ${err.message}`);
    }
  }
  console.log("🎉 Payments schema synced!");
}

main().catch(console.error);
