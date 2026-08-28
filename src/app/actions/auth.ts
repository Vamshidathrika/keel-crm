"use server";

import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { registerSchema, RegisterInput } from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { createDefaultPipeline } from "@/lib/seed-defaults";
import { eq } from "drizzle-orm";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${rand}` : `org-${rand}`;
}

export async function registerUser(data: RegisterInput) {
  try {
    const validated = registerSchema.parse(data);

    // Check if email already registered
    const existing = await db.query.users.findFirst({
      where: eq(users.email, validated.email.trim().toLowerCase()),
    });

    if (existing) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const orgSlug = generateSlug(validated.orgName);

    // We do all insertion in a transaction
    const result = await db.transaction(async (tx) => {
      // Create Organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: validated.orgName.trim(),
          slug: orgSlug,
        })
        .returning();

      // Create Admin User
      const [newUser] = await tx
        .insert(users)
        .values({
          orgId: org.id,
          name: validated.name.trim(),
          email: validated.email.trim().toLowerCase(),
          passwordHash,
          role: "admin",
          isActive: true,
        })
        .returning();

      return { org, newUser };
    });

    // Create default pipeline (cannot be run inside tx if it calls db instead of tx, but seed-defaults uses db)
    // To be safe, run it right after transaction
    await createDefaultPipeline(result.org.id);

    return { success: true };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: error.message || "Something went wrong during registration." };
  }
}
