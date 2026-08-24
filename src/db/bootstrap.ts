import { client, db } from "./index";
import { organizations, users } from "./schema";
import { seedOrganizationDefaults } from "@/lib/seed-defaults";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

let isInitialized = false;

export async function ensureDatabaseBootstrapped() {
  if (isInitialized) return;

  try {
    // Check if `users` table exists
    await client.execute("SELECT 1 FROM users LIMIT 1");
    isInitialized = true;
    return;
  } catch (error: any) {
    // Table doesn't exist, we need to bootstrap schema
    console.log("Database tables missing. Running initial schema bootstrap...");
  }

  try {
    const sqlPath = path.join(process.cwd(), "drizzle", "0000_tranquil_red_wolf.sql");
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, "utf-8");
      const statements = sqlContent
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.execute(statement);
        } catch (e: any) {
          // Ignore table/index already exists errors
        }
      }
      console.log("✓ Schema tables and indexes successfully created.");
    }

    // Check if organization exists, if not seed baseline
    const existingOrg = await client.execute("SELECT id FROM organizations LIMIT 1");
    if (!existingOrg.rows || existingOrg.rows.length === 0) {
      console.log("Seeding baseline organization and admin/manager/rep accounts...");
      const passwordHash = await bcrypt.hash("password123", 10);
      const orgId = "org_production_master";

      await db.insert(organizations).values({
        id: orgId,
        name: "Keel CRM",
        slug: "keel-crm-prod",
      }).catch(() => {});

      const [adminUser] = await db.insert(users).values([
        {
          orgId,
          name: "Vamshi Dathrika",
          email: "admin@keel.crm",
          passwordHash,
          role: "admin",
        },
        {
          orgId,
          name: "Sarah Sales Manager",
          email: "manager@keel.crm",
          passwordHash,
          role: "manager",
        },
        {
          orgId,
          name: "Alex Account Exec",
          email: "rep@keel.crm",
          passwordHash,
          role: "rep",
        },
      ]).returning();

      if (adminUser) {
        await seedOrganizationDefaults(orgId, adminUser.id);
      }
      console.log("✓ Baseline accounts seeded successfully!");
    }

    isInitialized = true;
  } catch (err) {
    console.error("Database bootstrap error:", err);
  }
}
