"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { auth, signIn, signOut } from "@/lib/auth";
import { seedOrganizationDefaults } from "@/lib/seed-defaults";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "org"}-${Date.now().toString(36)}`;
}

export async function registerOrganization(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { orgName, name, email, password } = parsed.data;

  const cleanEmail = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, cleanEmail) });
  if (existing) return { error: "An account with this email already exists. Please sign in instead." };

  const passwordHash = await bcrypt.hash(password, 10);

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName.trim(), slug: slugify(orgName) })
    .returning();

  const [newUser] = await db
    .insert(users)
    .values({
      orgId: org.id,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: "admin",
    })
    .returning();

  await seedOrganizationDefaults(org.id, newUser.id);

  try {
    await signIn("credentials", { email: cleanEmail, password, redirect: false });
  } catch (_ignored) {
    // Session can also be established on completion of onboarding or via client login
  }

  return { success: true, orgId: org.id, email: cleanEmail };
}

export async function loginWithCredentials(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await signIn("credentials", {
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email or password." };
    throw err;
  }

  return { success: true };
}

export async function logout() {
  await signOut({ redirect: false });
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}
